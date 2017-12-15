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
     * Setup commands and add them to the command array.
     */
    public setupCommands()
    {
        const powerCommand: Command = new Command(
            ["power"], 
            [],
            null, 
            "U N L I M I T E D P O W E R",
            this.unlimitedPower.bind(this)
        );

        this.cmds.push(powerCommand);
    }
    
    /**
     * Did you ever hear the tragedy of Darth Plagueis the Wise?
     * @param {Discord.Message} message The discord.js message instance.
     * @param {any[]} args Arguments for the command.
     */
    private async unlimitedPower(message: Discord.Message, args?: any[])
    {
        message.channel.send("https://giphy.com/gifs/power-highqualitygifs-unlimited-hokMyu1PAKfJK");
    }
}