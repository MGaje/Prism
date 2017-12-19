import * as Discord from "discord.js";

import { BotId, DataStoreKeys } from "./constants";
import { DataStore } from "./DataStore";

import { Module } from "../core/module/interfaces/Module";
import { QuotesModule } from "../modules/quotes";

/**
 * Handles Discord messages from users.
 */
export class MessageHandler
{
    public modules: Module[];
    public ds: DataStore;

    /**
     * Constructor for MessageHandler.
     * @constructor
     * @param {Module[]} modules All registered modules. 
     */
    constructor(modules: Module[], dataStore: DataStore)
    {
        this.modules = modules;
        this.ds = dataStore;
    }

    /**
     * Handle incoming Discoord message.
     * @param {Discord.Message} message discord.js message instance.
     */
    public handleMsg(message: Discord.Message)
    {
        // Check if ignored user.
        if (this.isIgnoredUser(message.author.id))
        {
            return;
        }

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

        const args: string[] = (argString) ? argString.split(",").map(x => x.trim()) : [];

        // Handle command logic.
        if (cmd === "help" || cmd === "h")
        {
            const helpCmd: string = (args[0]) ? args[0] : undefined;
            if (!helpCmd)
            {
                message.channel.send("Available commands: " + this.getCommands(message));
            }
            else
            {
                const foundCommand: boolean = this.modules.some(x =>
                    {
                        if (x.supportsCommand(helpCmd) && x.canUserPerformCommand(helpCmd, message.author, message.guild))
                        {
                            message.channel.send(x.getHelp(helpCmd));
                            return true;
                        }
                    });

                if (!foundCommand)
                {
                    message.channel.send("Unknown command or you do not have the appropriate role to use this command.");
                }
            }
        }
        else
        {
            this.modules.some(x =>
            {
                if (x.supportsCommand(cmd))
                {
                    if (x.isValidCommandCall(cmd, args, message.author, message.guild))
                    {
                        x.runCommand(message, cmd, args);
                        return true;
                    }
                    else
                    {
                        message.channel.send("Incorrect argument count or you do not have the appropriate role to use this command.");
                    }
                }
            });
        }
    }
    
    /**
     * Determine if the specified user should be ignored.
     * @param {Discord.Snowflake} authorId The id of the author being tested.
     * @returns {boolean} Flag indicating whether or not the specified user is an ignored user or not.
     */
    private isIgnoredUser(authorId: Discord.Snowflake): boolean
    {
        const ignoredUsersList: Discord.Snowflake[] = this.ds.get(DataStoreKeys.IgnoredUsersList);
        return ignoredUsersList.some(x => x === authorId);
    }

    /**
     * Get all supported commands based on guild user role.
     * @param {Discord.Message} message The discord.js message instance.
     * @returns {string} Comma separated list of commands.
     */
    private getCommands(message: Discord.Message): string
    {
        return [].concat(...this.modules.map(x => x.getCommandNames(false, message.author, message.guild))).join(", ");
    }
}