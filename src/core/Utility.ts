import * as Discord from "discord.js";

import { BotId } from "./constants";

/**
 * Contains utility functions used throughout the application.
 */
export class Utility
{
    static fromUTCToLocalDate(utcDate: Date): Date
    {
        const offsetMs: number = new Date().getTimezoneOffset() * 60 * 1000;
        return new Date(utcDate.valueOf() - offsetMs);
    }

    static deleteMessage(message: Discord.Message)
    {
        const botGuildMember: Discord.GuildMember = message.guild.members.find(x => x.id === BotId);
        if (!botGuildMember)
        {
            console.log("Could not find bot guild member in order to delete message");
            return;
        }

        if (!botGuildMember.hasPermission(Discord.Permissions.FLAGS.MANAGE_MESSAGES))
        {
            return;
        }

        message.delete();
    }
}