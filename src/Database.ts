import * as Discord from "discord.js";

/**
 * Just a placeholder until SQLlite.
 */
export abstract class Database
{
    public static data: Map<number, Discord.Snowflake> = new Map<number, Discord.Snowflake>();
}