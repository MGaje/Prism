import * as Discord from "discord.js";

import { Database } from "./Database";
import { QuotesModule } from "./modules/quotes";

/**
 * Handles Discord messages from users.
 */
export class MessageHandler
{
    public quotes: QuotesModule;

    /**
     * Constructor for MessageHandler.
     * @constructor
     * @param {Database} db Database context. 
     */
    constructor(db: Database)
    {
        this.quotes = new QuotesModule(db);
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
            this.quotes.saveQuote(message, msgId);
        }
        else if (cmd === "quote" || cmd === "q")
        {
            const author: string = (args[0]) ? args[0].trim().toLowerCase() : undefined;
            this.quotes.getQuote(message, author);
        }
        else if (cmd === "random" || cmd === "r")
        {
            this.quotes.sayRandom(message);
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
}