import * as Discord from "discord.js";

import { BotId } from "./constants";
import { DataStore } from "./DataStore";

import { Module } from "../core/module/interfaces/Module";
import { QuotesModule } from "../modules/quotes";

/**
 * Handles Discord messages from users.
 */
export class MessageHandler
{
    public modules: Module[];
    public supportedCommands: string[];
    public ds: DataStore;

    /**
     * Constructor for MessageHandler.
     * @constructor
     * @param {Module[]} modules All registered modules. 
     */
    constructor(modules: Module[], dataStore: DataStore)
    {
        this.modules = modules;
        this.supportedCommands = [].concat(...this.modules.map(x => x.getCommandNames()));
        this.ds = dataStore;
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
        const search: RegExp = new RegExp("!(\\w+)\\s*([\\w\\s\\#\\,]+)?", "i");
        if (!search.test(message.content))
        {
            return;
        }

        // Parse the message as it's a bot command.
        const result: RegExpExecArray = search.exec(message.content);

        const cmd: string = result[1];
        const argString = result[2];

        const args: string[] = (argString) ? argString.split(",") : [];

        // Handle command logic.
        if (cmd === "help" || cmd === "h")
        {
            const helpCmd: string = (args[0]) ? args[0].trim() : undefined;
            if (!helpCmd)
            {
                message.channel.send("Available commands: " + this.supportedCommands.join(", "));
            }
            else
            {
                const foundCommand: boolean = this.modules.some(x =>
                    {
                        if (x.supportsCommand(helpCmd))
                        {
                            message.channel.send(x.getHelp(helpCmd));
                            return true;
                        }
                    });

                if (!foundCommand)
                {
                    message.channel.send("Unknown command.");
                }
            }
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