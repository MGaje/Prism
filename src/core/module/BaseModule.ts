import * as Discord from "discord.js";

import { Module } from "./interfaces/Module";
import { Database } from "../Database";
import { Command } from "./Command";

/**
 * A basic module.
 */
export abstract class BaseModule implements Module
{
    public cmds: Command[];
    public db: Database;

    /**
     * @constructor
     * @param {Database} db Database context.
     */
    constructor(db: Database)
    {
        this.db = db;
        this.cmds = [];
        this.setupCommands();
    }

    /**
     * Determine whether or not this module supports the provided command.
     * @param {string} cmdName The command name.
     * @param {any[]} args Arguments of the command.
     * @returns {boolean} Flag that indicates is the specified command is supported by this module.
     */
    public supportsCommand(cmdName: string, args: any[]): boolean
    {
        const cmdFind: Command = this.getCommand(cmdName);
        if (!cmdFind)
        {
            return false;
        }

        for (let i: number = 0; i < cmdFind.argDefs.length; ++i)
        {
            if (cmdFind.argDefs[i].required && !args[i])
            {
                return false;
            }
        }

        return true;
    }

    /**
     * Run provided command.
     * @param {string} cmdName The command name.
     * @param {any[]} args Arguments of the command.
     */
    public abstract runCommand(message: Discord.Message, cmdName: string, args: any[]);

    /**
     * Get all command names for this module.
     * @returns {string[]} Array of supported command names.
     */
    public getCommandNames(): string[]
    {
        return [].concat(this.cmds.map(x => x.names));
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