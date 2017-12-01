import * as Discord from "discord.js";

import { Command } from "./Command";

/**
 * Prism is composed of modules that utilize this pattern.
 */
export interface Module
{
    cmds: Command[];

    supportsCommand(cmdName: string, args: any[]): boolean;
    runCommand(message: Discord.Message, cmdName: string, args: any[]);
    getCommandNames(): string[];
}