import * as Discord from "discord.js";

import { BotId } from "./constants";

import { Module } from "../core/module/Module";
import { QuotesModule } from "../modules/quotes";

/**
 * Handles Discord messages from users.
 */
export class MessageHandler
{
    public modules: Module[];

    /**
     * Constructor for MessageHandler.
     * @constructor
     * @param {Module[]} modules All registered modules. 
     */
    constructor(modules: Module[])
    {
        this.modules = modules;
    }

    /**
     * Handle incoming Discoord message.
     * @param {Discord.Message} message discord.js message instance.
     */
    public handleMsg(message: Discord.Message)
    {
        // If the message doesn't start with an "!" or the message is from the bot, don't bother doing all the
        // other processing.
        if (message.content.charAt(0) !== "!" || message.author.id === BotId)
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
        if (cmd === "help" || cmd === "h")
        {
            const helpCmd: string = (args[0]) ? args[0].trim() : undefined;
            if (!helpCmd)
            {
                message.channel.send("Available commands: savequote, quote, random, power");
            }
            else if (helpCmd === "savequote" || helpCmd === "sq")
            {
                message.channel.send("!savequote [(messageId)] - savequote will save the preceding quote to the database. You can specify an optional message id in parentheses.");
            }
            else if (helpCmd === "quote" || helpCmd === "q")
            {
                message.channel.send("!quote [(author)] - quote will attempt to say a random quote. You can specify an optional author in parentheses. The provided author string can be either a nickname or a username.");
            }
            else if (helpCmd === "random" || helpCmd === "r")
            {
                message.channel.send("!random - random will ... say a random quote. Come on.")
            }
            else if (helpCmd === "power" || helpCmd === "p")
            {
                message.channel.send("<:lenny:309451824488906752>");
            }
            else
            {
                message.channel.send("Unknown command.");
            }
        }
        else if (cmd === "power" || cmd === "p")
        {
            message.channel.send("https://giphy.com/gifs/power-highqualitygifs-unlimited-hokMyu1PAKfJK");
        }
        else
        {
            this.modules.some(x =>
            {
                if (x.supportsCommand(cmd, args))
                {
                    x.runCommand(message, cmd, args);
                    return true;
                }
            });
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