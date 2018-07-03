import * as Discord from "discord.js";
import * as math from "mathjs";

import { BaseModule } from "../core/module/BaseModule";
import { Command } from "../core/module/Command";
import { Argument } from "../core/module/Argument";

import { BotId } from "../core/constants";

/**
 * Module for quote management.
 */
export class QuotesModule extends BaseModule
{
    /**
     * Setup commands and add them to the command array.
     */
    public setupCommands()
    {
        // Save quote.
        const saveQuoteCommand: Command = new Command(
            ["savequote", "sq"], 
            [new Argument("messageId")], 
            null,
            "savequote will save the preceding quote to the database. You can specify an optional message id.",
            this.saveQuote.bind(this)
        );

        // Get quote.
        const getQuoteCommand: Command = new Command(
            ["quote", "getquote", "q"], 
            [new Argument("author")],
            null, 
            "quote will attempt to say a random quote. You can specify an optional author. The provided author string can be either a nickname or a username.",
            this.getQuote.bind(this)
        );

        // Say random quote.
        const randomCommand: Command = new Command(
            ["random", "r"], 
            [], 
            null,
            "random will ... say a random quote. Come on.",
            this.sayRandom.bind(this)
        );

        this.cmds.push(saveQuoteCommand, getQuoteCommand, randomCommand);
    }

    // --
    // Utility methods.
    // --

    /**
     * Save message as quote to the db.
     * @param {Discord.Message} message discord.js message instance.
     * @param {any[]} args Arguments for the command.
     */
    private async saveQuote(message: Discord.Message, args?: any[])
    {
        const msgId: string = (args[0]) ? args[0].trim() : undefined;

        try
        {
            if (!msgId)
            {
                const msgs: Discord.Collection<string, Discord.Message> = await message.channel.fetchMessages({ before: message.id, limit: 1 });
                if (msgs.size === 0)
                {
                    return message.channel.send("No quote found!");
                }

                const fetchedMessage: Discord.Message = msgs.first();
                this.saveValidQuote(fetchedMessage);
            }
            else
            {
                const msg: Discord.Message = await message.channel.fetchMessage(msgId);
                this.saveValidQuote(msg);
            }
        }
        catch (e)
        {
            throw e;
        }
    }

    /**
     * Get quote from db with (optional) specified author.
     * @param {Discord.Message} message discord.js message instance.
     * @param {any[]} args Arguments for the command.
     */
    public async getQuote(message: Discord.Message, args?: any[])
    {
        const author: string = (args[0]) ? args[0].trim().toLowerCase() : undefined;

        try
        {
            if (!author)
            {
                // At this point it's just an alias for random.
                await this.sayRandom(message);
                return;
            }

            const gm: Discord.GuildMember = message.guild.members.find(x => x.displayName.toLowerCase() === author || x.user.tag.toLowerCase() === author);
            if (!gm)
            {
                message.channel.send("No quote found!");
                return;
            }

            await this.sayRandom(message, [gm.id]);
        }
        catch (e)
        {
            throw e;
        }
    }

    /**
     * Say random message to the channel from incoming prompt.
     * @param {Discord.Message} message discord.js message instance.
     * @param {any[]} args Arguments for the command.
     */
    public async sayRandom(message: Discord.Message, args?: any[])
    {
        let query: string = "SELECT MessageId FROM Quote WHERE GuildId = ?";
        let params: any[] = [message.guild.id];

        let authorId: Discord.Snowflake = undefined;
        
        if (args)
        {
            authorId = (args[0]) ? args[0].trim() : undefined;
        }

        if (authorId)
        {
            query += " AND AuthorId = ?";
            params.push(authorId);
        }

        try
        {
            const rows: any[] = await this.db.all(query, params);
            if (rows.length === 0)
            {
                return message.channel.send("No quotes found for this server!");
            }

            const r: number = math.randomInt(rows.length);

            // todo: Create and use model here.
            const quote: any = rows[r];
            const msgId: Discord.Snowflake = quote.MessageId;

            // Fetch discord message.
            const msg: Discord.Message = await message.channel.fetchMessage(msgId);

            // Create rich embed for quote info.
            const embed: Discord.RichEmbed = new Discord.RichEmbed();
            embed.setColor([0, 255, 0]);
            embed.setDescription(msg.content)
            embed.setAuthor(msg.guild.members.find(x => x.id === msg.author.id).displayName, msg.author.avatarURL);
            embed.setTimestamp(msg.createdAt);

            msg.attachments.forEach(v =>
            {
                embed.setImage(v.url);
            });

            message.channel.send(embed);
        }
        catch (e)
        {
            throw e;
        }
    }

    /**
     * Utility method for validating and adding a quote to the db.
     * @param {Discord.Message} message discord.js message instance.
     */
    private async saveValidQuote(message: Discord.Message)
    {
        try 
        {
            const isValid: boolean = await this.validateQuote(message);
            if (isValid)
            {
                await this.addQuoteToDb(message);
            }
            else
            {
                message.channel.send("Invalid message to quote. It's either from this bot or a duplicate quote.");
            }
        } 
        catch (e) 
        {
            throw e;
        }     
    }

    /**
     * Make sure the specified message is valid to save to the db.
     * @param {Discord.Message} message discord.js message instance.
     * @returns {Promise<boolean>} A promise with valid quote state represented by boolean.
     */
    private async validateQuote(message: Discord.Message)
    {
        try
        {
            // Is someone being a jackass and trying to save Prism messages as quotes?
            if (message.author.id === BotId)
            {
                return false;
            }
            else
            {
                // No duplicate quotes of the same message.
                const row: any = await this.db.get("SELECT MessageId FROM Quote WHERE MessageId = ?", [message.id]);

                // Message wasn't found so add it as a quote.
                if (row)
                {
                    return false;
                }
                
                return true;
            }
        }
        catch (e)
        {
            throw e;
        }
    }

    /**
     * Add quote to database.
     * @param {Discord.Message} message discord.js message instance.
     */
    private async addQuoteToDb(message: Discord.Message)
    {
        const authorId: Discord.Snowflake = message.author.id;
        const guildId: Discord.Snowflake = message.guild.id;
        const channelId: Discord.Snowflake = message.channel.id;
        const msgId: Discord.Snowflake = message.id;

        try 
        {
            await this.db.run("INSERT INTO Quote(guildId, authorId, channelId, messageId) VALUES(?, ?, ?, ?)", [guildId, authorId, channelId, msgId]);
            message.channel.send("Quote added!");
        } 
        catch (e) 
        {
            throw e;
        }
    }
}