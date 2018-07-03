import * as Discord from "discord.js";

import { Module } from "./interfaces/Module";
import { DatabaseContext } from "../../database/DatabaseContext";
import { DataStore } from "../DataStore";
import { Command } from "./Command";

/**
 * A basic module.
 */
export abstract class BaseModule implements Module
{
    public cmds: Command[];
    public db: DatabaseContext;
    public ds: DataStore;

    /**
     * @constructor
     * @param {Database} db Database context.
     * @param {string[]} roles The roles required to perform commands in this module.
     */
    constructor(db: DatabaseContext, dataStore: DataStore)
    {
        this.db = db;
        this.ds = dataStore;
        this.cmds = [];
        this.setupCommands();
    }

    /**
     * Determine whether or not this module supports the provided command.
     * @param {string} cmdName The command name.
     * @returns {boolean} Flag that indicates is the specified command is supported by this module.
     */
    public supportsCommand(cmdName: string): boolean
    {
        const cmdFind: Command = this.getCommand(cmdName);
        if (!cmdFind)
        {
            return false;
        }
        
        return true;
    }

    /**
     * Validates the call of the specified command.
     * @param {string} cmdName The name of the command to call.
     * @param {any[]} args The arguments for the command.
     * @param {Discord.User} user The user that initiated the call.
     * @param {Discord.Guild} guild The guild in which the call was initiated.
     * @returns {boolean} Flag that indicates whether or not the command call is valid.
     */
    public isValidCommandCall(cmdName: string, args: any[], user: Discord.User, guild: Discord.Guild): boolean
    {
        const cmdFind: Command = this.getCommand(cmdName);
        if (!cmdFind)
        {
            return false;
        }

        // Validate arguments.
        if (args)
        {
            for (let i: number = 0; i < cmdFind.argDefs.length; ++i)
            {
                if (cmdFind.argDefs[i].required && !args[i])
                {
                    return false;
                }
            }
        }

        // Validate user privilege.
        if (!cmdFind.canUserPerform(user, guild))
        {
            return false;
        }
        
        return true;
    }

    /**
     * Determine if user has the privilege to call the specified command in the specified guild.
     * @param {string} cmdName The command to check.
     * @param {Discord.User} user The user to check.
     * @param {Discord.Guild} guild The guild to check.
     * @returns {boolean} Flag indicating if the specified user can call the specified command in the specified guild.
     */
    public canUserPerformCommand(cmdName: string, user: Discord.User, guild: Discord.Guild): boolean
    {
        const cmdFind: Command = this.getCommand(cmdName);
        if (!cmdFind)
        {
            return false;
        }

        return cmdFind.canUserPerform(user, guild);
    }

    /**
     * Run provided command.
     * @param message The discord.js message instance.
     * @param cmdName The command name.
     * @param args Arguments of the command.
     */
    public async runCommand(message: Discord.Message, cmdName: string, args: any[])
    {
        // Get command instance in case an alias was provided.
        const cmd: Command = this.getCommand(cmdName);
        if (!cmd)
        {
            // Yikes. How did this happen?
            throw new Error("Provided command is not supported in this module");
        }

        try 
        {
            await cmd.doAction(message, args);
        } 
        catch (e) 
        {
            console.error(e);
        }
    }

    /**
     * Get all command names for this module.
     * @param {boolean} withAliases (Optional) Flag indicating if the returned array should also contain aliases.
     * @param {Discord.User} forUser (Optional) User for which the command list will be filtered by based on role.
     * @param {Discord.Guild} forGuild (Optional) Guild for which the command list will be filtered by based on role.
     * @returns {string[]} Array of supported command names.
     */
    public getCommandNames(withAliases?: boolean, forUser?: Discord.User, forGuild?: Discord.Guild): string[]
    {
        // Lambda for grabbing either the main command name or command name AND aliases.
        let f = x => x.names;
        if (!withAliases)
        {
            f = x => x.names[0];
        }

        // If a user and a guild are supplied, filter the command list by whether or not the user could perform
        // those commands in the specified guild.
        if (forUser && forGuild)
        {
            return [].concat(this.cmds.filter(x => x.canUserPerform(forUser, forGuild)).map(f));
        }

        // Return list of commands with no filter.
        return [].concat(this.cmds.map(f));
    }

    /**
     * Get help string for provided command.
     * @param {string} cmdName The name of the command we are getting help for.
     * @returns {string} The compiled help string for the provided command.
     */
    public getHelp(cmdName: string): string
    {
        const cmdFind: Command = this.getCommand(cmdName);
        if (!cmdFind)
        {
            // How in the world did you get here?
            throw new Error("Command not supported by this module.");
        }

        return cmdFind.getCompiledHelpString();
    }

    /**
     * Setup commands and add them to the command array.
     */
    public abstract setupCommands();

    // --
    // Utility functions.
    // --

    /**
     * Get command by command name.
     * @param cmdName The name of the command to get.
     */
    protected getCommand(cmdName: string): Command
    {
        return this.cmds.find(x => x.names.some(y => y === cmdName));
    }
}