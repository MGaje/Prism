import * as Discord from "discord.js";

import { Module } from "./interfaces/Module";
import { Database } from "../Database";
import { DataStore } from "../DataStore";
import { Command } from "./Command";

/**
 * A basic module.
 */
export abstract class BaseModule implements Module
{
    public cmds: Command[];
    public db: Database;
    public ds: DataStore;

    /**
     * @constructor
     * @param {Database} db Database context.
     * @param {string[]} roles The roles required to perform commands in this module.
     */
    constructor(db: Database, dataStore: DataStore)
    {
        this.db = db;
        this.ds = dataStore;
        this.cmds = [];
        this.setupCommands();
    }

    /**
     * Determine whether or not this module supports the provided command.
     * @param {string} cmdName The command name.
     * @param {any[]} args Arguments of the command.
     * @returns {boolean} Flag that indicates is the specified command is supported by this module.
     */
    public supportsCommand(cmdName: string, args?: any[]): boolean
    {
        const cmdFind: Command = this.getCommand(cmdName);
        if (!cmdFind)
        {
            return false;
        }

        // todo: Think about this some more. I'm not entirely happy with this function also validating
        // provided arguments. Should probably put this into its own function.
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
        
        return true;
    }

    /**
     * Run provided command.
     * @param message The discord.js message instance.
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

        cmd.doAction(message, args);
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