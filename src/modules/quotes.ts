import * as Discord from "discord.js";
import * as math from "mathjs";

import { BaseModule } from "../core/module/BaseModule";
import { Command } from "../core/module/Command";
import { Argument } from "../core/module/Argument";

import { BotId } from "../core/constants";
import { Database } from "../core/Database";

/**
 * Module for quote management.
 */
export class QuotesModule extends BaseModule
{
    /**
     * Run provided command.
     * @param cmdName The command name.
     * @param args Arguments of the command.
     */
    public runCommand(message: Discord.Message, cmdName: string, args: any[])
    {
        // Get command instance in case an alias was provided.
        const cmd: Command = this.getCommand(cmdName);
        if (!cmd)
        {
            // Yikes. How did this happen?
            throw new Error("Provided command is not supported in this module");
        }

        // Use main command name to determine which command to run.
        switch (cmd.getName())
        {
            case "savequote":
                const msgId: string = (args[0]) ? args[0].trim() : undefined;
                this.saveQuote(message, msgId);

                break;

            case "quote":
                const author: string = (args[0]) ? args[0].trim().toLowerCase() : undefined;
                this.getQuote(message, author);

                break;

            case "random":
                this.sayRandom(message);

                break;

            default:
                break;
        }
    }

    /**
     * Setup commands and add them to the command array.
     */
    public setupCommands()
    {
        // Save quote.
        const saveQuoteCommand: Command = new Command(["savequote", "sq"], [new Argument("messageId")]);

        // Get quote.
        const getQuoteCommand: Command = new Command(["quote", "getquote", "q"], [new Argument("author")]);

        // Say random quote.
        const randomCommand: Command = new Command(["random", "r"], []);

        this.cmds.push(saveQuoteCommand, getQuoteCommand, randomCommand);
    }

    // --
    // Utility methods.
    // --

    /**
     * Save message as quote to the db.
     * @param {Discord.Message} message discord.js message instance.
     * @param {Discord.Snowflake} msgId Discord id of the message to save.
     */
    private saveQuote(message: Discord.Message, msgId: Discord.Snowflake)
    {
        if (!msgId)
        {
            message.channel.fetchMessages({ before: message.id, limit: 1 })
                .then(msgs => 
                {
                    if (msgs.size === 0)
                    {
                        return message.channel.send("No quote found!");
                    }

                    const fetchedMessage: Discord.Message = msgs.first();
                    this.saveValidQuote(fetchedMessage);
                });
        }
        else
        {
            message.channel.fetchMessage(msgId)
                .then(msg => 
                {
                    this.saveValidQuote(msg);
                });
        }
    }

    /**
     * Get quote from db with (optional) specified author.
     * @param {Discord.Message} message discord.js message instance.
     * @param {string} author Author of quote.
     */
    public getQuote(message: Discord.Message, author: string)
    {
        if (!author)
        {
            // At this point it's just an alias for random.
            this.sayRandom(message);
            return;
        }

        const gm: Discord.GuildMember = message.guild.members.find(x => x.displayName.toLowerCase() === author || x.user.tag.toLowerCase() === author);
        if (!gm)
        {
            return message.channel.send("No quote found!");
        }

        this.sayRandom(message, gm.id);
    }

    /**
     * Say random message to the channel from incoming prompt.
     * @param {Discord.Message} message discord.js message instance.
     * @param {Discord.Snowflake} authorId Discord id of author.
     */
    public sayRandom(message: Discord.Message, authorId?: Discord.Snowflake)
    {
        let query: string = "SELECT MessageId FROM Quote WHERE GuildId = ?";
        let params: any[] = [message.guild.id];

        if (authorId)
        {
            query += " AND AuthorId = ?";
            params.push(authorId);
        }

        this.db.all(query, params)
            .then(rows =>
            {
                if (rows.length === 0)
                {
                    return message.channel.send("No quotes found for this server!");
                }
    
                const r: number = math.randomInt(rows.length);
                const msgId: Discord.Snowflake = rows[r].MessageId;
    
                message.channel.fetchMessage(msgId)
                    .then(msg =>
                    {
                        const embed: Discord.RichEmbed = new Discord.RichEmbed();
                        embed.setColor([0, 255, 0]);
                        embed.setDescription(msg.content)
                        embed.setAuthor(msg.guild.members.find(x => x.id === msg.author.id).displayName , msg.author.avatarURL);
                        embed.setTimestamp(msg.createdAt);
        
                        msg.attachments.forEach(v =>
                        {
                            embed.setImage(v.url);
                        });
            
                        message.channel.send(embed);
                    });
            },
            err =>
            {
                console.error(err.message);
            });
    }

    /**
     * Utility method for validating and adding a quote to the db.
     * @param {Discord.Message} message discord.js message instance.
     */
    private saveValidQuote(message: Discord.Message)
    {
        this.validateQuote(message)
            .then(isValid => 
            {
                if (isValid)
                {
                    this.addQuoteToDb(message, message.id);
                }
                else
                {
                    message.channel.send("Invalid message to quote. It's either from this bot or a duplicate quote.");
                }
            },
            errorMsg => 
            {
                console.error(errorMsg);
            });       
    }

    /**
     * Make sure the specified message is valid to save to the db.
     * @param {Discord.Message} message discord.js message instance.
     * @returns {Promise<boolean>} A promise with valid quote state represented by boolean.
     */
    private validateQuote(message: Discord.Message): Promise<boolean>
    {
        return new Promise((resolve, reject) => 
        {
            // Is someone being a jackass and trying to save Prism messages as quotes?
            if (message.author.id === BotId)
            {
                resolve(false);
            }
            else
            {
                // No duplicate quotes of the same message.
                this.db.get("SELECT MessageId FROM Quote WHERE MessageId = ?", [message.id])
                    .then(row =>
                    {
                        // Message wasn't found so add it as a quote.
                        if (!row)
                        {
                            resolve(true);
                        }
                        else
                        {
                            resolve(false);
                        }
                    },
                    err =>
                    {
                        reject(err.message);
                    });
            }
        });
    }

    /**
     * Add quote to database.
     * @param {Discord.Message} message discord.js message instance.
     * @param {Discord.Snowflake} msgId Discord id of the message to add.
     */
    private addQuoteToDb(message: Discord.Message, msgId: Discord.Snowflake)
    {
        const authorId: Discord.Snowflake = message.author.id;
        const guildId: Discord.Snowflake = message.guild.id;

        this.db.run("INSERT INTO Quote(guildId, authorId, messageId) VALUES(?, ?, ?)", [guildId, authorId, msgId])
            .then(() =>
            {
                message.channel.send("Quote added!");
            },
            err =>
            {
                console.error(err.message);
            });
    }
}