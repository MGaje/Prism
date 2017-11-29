import * as Discord from "discord.js";
import * as math from "mathjs";

import { BotId } from "../constants";
import { Database } from "../Database";

/**
 * Module for quote management.
 */
export class QuotesModule
{
    public db: Database;

    /**
     * 
     * @param {Database} db Database context.
     */
    constructor(db: Database)
    {
        this.db = db;
    }

     /**
     * Save message as quote to the db.
     * @param {Discord.Message} message discord.js message instance.
     * @param {Discord.Snowflake} msgId Discord id of the message to save.
     */
    public saveQuote(message: Discord.Message, msgId: Discord.Snowflake)
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

    // --
    // Utility methods.
    // --

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