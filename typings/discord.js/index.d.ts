import * as Discord from "discord.js";

declare module "discord.js"
{
    export class CategoryChannel extends Discord.GuildChannel
    {
        public readonly children: Discord.Collection<Discord.Snowflake, Discord.GuildChannel>;
    }
}