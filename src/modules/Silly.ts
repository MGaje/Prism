import * as Discord from "discord.js";

import { BaseModule } from "../core/module/BaseModule";
import { Command } from "../core/module/Command";
import { Argument } from "../core/module/Argument";

/**
 * Module for silly commands.
 */
export class SillyModule extends BaseModule
{
    /**
     * Run provided command.
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

        // Use main command name to determine which command to run.
        switch (cmd.getName())
        {
            case "power":
                this.unlimitedPower(message);
                break;

            default:
                break;
        }
    }

    /**
     * Setup commands and add them to the command array.
     */
    public setupCommands()
    {
        const powerCommand: Command = new Command(["power"], [], "U N L I M I T E D P O W E R");
        this.cmds.push(powerCommand);
    }

    // --
    // Utility methods.
    // --
    public unlimitedPower(message: Discord.Message)
    {
        message.channel.send("https://giphy.com/gifs/power-highqualitygifs-unlimited-hokMyu1PAKfJK");
    }
}