import * as Discord from "discord.js";

import { Command } from "../Command";

/**
 * Prism is composed of modules that contain specific self-contained functionality.
 */
export interface Module
{
    cmds: Command[];

    supportsCommand(cmdName: string): boolean;
    isValidCommandCall(cmdName: string, args: any[], user: Discord.User, guild: Discord.Guild): boolean;
    canUserPerformCommand(cmdName: string, user: Discord.User, guild: Discord.Guild): boolean;
    runCommand(message: Discord.Message, cmdName: string, args: any[]);
    getCommandNames(withAliases?: boolean, forUser?: Discord.User, forGuild?: Discord.Guild): string[];
    setupCommands();
    getHelp(cmdName: string): string;
}