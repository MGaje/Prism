import * as Discord from "discord.js";
import * as math from "mathjs";

import { BotId } from "./constants";
import { Database } from "./Database";

/**
 * Handles Discord messages from users.
 */
export class MessageHandler
{
    public db: Database;

    /**
     * Constructor for MessageHandler.
     * @constructor
     * @param {Database} db Database context. 
     */
    constructor(db: Database)
    {
        this.db = db;
    }

    /**
     * Handle incoming Discoord message.
     * @param {Discord.Message} message discord.js message instance.
     */
    public handleMsg(message: Discord.Message)
    {
        // If the message doesn't start with an "!", don't bother doing all the
        // other processing.
        if (message.content.charAt(0) !== "!")
        {
            return;
        }

        // Check to see if the message is a command to the bot.
        const search: RegExp = new RegExp("!(\\w+)\\s*(\\(([\\w\\s\\#\\,]+)?\\))?", "i");
        if (!search.test(message.content))
        {
            return;
        }

        // Parse the message as it's a bot command.
        const result: RegExpExecArray = search.exec(message.content);

        const cmd: string = result[1];
        const argString = result[3];

        const args: string[] = (argString) ? argString.split(",") : [];

        // Handle command logic.
        if (cmd === "savequote" || cmd === "sq")
        {
            const msgId: string = (args[0]) ? args[0].trim() : undefined;
            this.saveQuote(message, msgId);
        }
        else if (cmd === "quote" || cmd === "q")
        {
            const author: string = (args[0]) ? args[0].trim().toLowerCase() : undefined;
            this.getQuote(message, author);
        }
        else if (cmd === "random" || cmd === "r")
        {
            this.sayRandom(message);
        }

        // Not sure how I feel about the auto deletes.
        //
        // const gm: Discord.GuildMember = message.guild.members.find(x => x.id === BotId);
        // if (!gm)
        // {
        //     return console.error("Couldn't find bot guild member for server \"" + message.guild.name + "\"");
        // }

        // if (gm.hasPermission(Discord.Permissions.FLAGS.MANAGE_MESSAGES))
        // {
        //     message.delete()
        //         .catch(console.error);
        // }
    }

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
    private getQuote(message: Discord.Message, author: string)
    {
        if (!author)
        {
            // At this point it's just an alias for random.
            return this.sayRandom(message);
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
    private sayRandom(message: Discord.Message, authorId?: Discord.Snowflake)
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
     * Add quote to database.
     * @param {Discord.Message} message discord.js message instance.
     * @param {Discord.Snowflake} msgId Discord id of the message to add.
     */
    private addQuote(message: Discord.Message, msgId: Discord.Snowflake)
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
                    this.addQuote(message, message.id);
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
}