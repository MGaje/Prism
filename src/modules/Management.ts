import * as Discord from "discord.js";

import { BaseModule } from "../core/module/BaseModule";
import { Command } from "../core/module/Command";
import { Argument } from "../core/module/Argument";
import { DataStoreKeys, PrismCommanderRole } from "../core/constants";

/**
 * Module for management commands.
 */
export class ManagementModule extends BaseModule
{
    public setupCommands()
    {
        const addIgnoredUserCmd: Command = new Command(
            ["addignoreduser", "aiu"],
            [new Argument("userId", true)],
            [PrismCommanderRole],
            "Add a user to the ignored user list by id.",
            this.addIgnoredUser.bind(this)
        );

        const removeIgnoredUserCmd: Command = new Command(
            ["removeignoreduser", "riu"],
            [new Argument("userId", true)],
            [PrismCommanderRole],
            "Remove a user from the ignored user list by id.",
            this.removeIgnoredUser.bind(this)
        );

        this.cmds.push(addIgnoredUserCmd, removeIgnoredUserCmd);
    }

    /**
     * Add a user to the ignored users list.
     * @param {Discord.Message} message The discord.js message instance.
     * @param {any[]} args Arguments for the command.
     */
    private addIgnoredUser(message: Discord.Message, args?: any[])
    {
        const userId: Discord.Snowflake = args[0];
        
        const ignoredUserList: Discord.Snowflake[] = this.ds.get(DataStoreKeys.IgnoredUsersList);
        if (ignoredUserList.some(x => x === userId))
        {
            message.channel.send("User is already on the ignored list.");
            return;
        }

        this.db.run("INSERT INTO IgnoredUser(UserId) VALUES(?)", [userId])
            .then(success =>
            {
                if (!success)
                {
                    throw new Error("Unable to add entry to IgnoredUser table.");
                }

                ignoredUserList.push(userId);
                this.ds.set(DataStoreKeys.IgnoredUsersList, ignoredUserList);

                message.channel.send("User added to ignore list.");
            });
    }

    /**
     * Remove a user from the ignored users list.
     * @param {Discord.Message} message The discord.js messsage instance.
     * @param {any[]} args Arguments for the command.
     */
    private removeIgnoredUser(message: Discord.Message, args?: any[])
    {
        const userId: Discord.Snowflake = args[0];

        const ignoredUserList: Discord.Snowflake[] = this.ds.get(DataStoreKeys.IgnoredUsersList);
        if (!ignoredUserList.some(x => x === userId))
        {
            message.channel.send("User is not on the ignored list.");
            return;
        }

        this.db.run("DELETE FROM IgnoredUser WHERE UserId = ?", [userId])
            .then(success =>
            {
                if (!success)
                {
                    throw new Error("Unable to remove entry from the IgnoredUser table.");
                }

                const updatedIgnoredUserList = ignoredUserList.filter(x => x !== userId);
                this.ds.set(DataStoreKeys.IgnoredUsersList, updatedIgnoredUserList);

                message.channel.send("User removed from ignore list.");
            });

    }
}