import * as Discord from "discord.js";

import { BaseModule } from "../core/module/BaseModule";
import { Command } from "../core/module/Command";
import { Argument } from "../core/module/Argument";
import { PrismCommanderRole } from "../core/constants";

/**
 * Module for topic management.
 * 
 * This module has commands for adding, retiring, and toggling topics among others.
 * It will allow users to voluntarily opt-in and out of seeing particular discord channels.
 */
export class TopicsModule extends BaseModule
{
    /**
     * Setup commands and add them to the command array.
     */
    public setupCommands()
    {
        const addTopicCategoryCmd: Command = new Command(
            ['addtopiccategory', 'addtopiccat'],
            [new Argument("categoryName", true), new Argument("primaryChannelName", true)],
            [PrismCommanderRole],
            "Add a topic category. categoryName and primaryChannelName are both required parameters; primaryChannelName has to be a channel in the provided category Topic categories are used to house the text channels for topics.",
            this.addTopicCategory.bind(this)
        );

        const seeTopicCategoriesCmd: Command = new Command(
            ['seetopiccategories', 'seetopiccats'],
            [],
            [PrismCommanderRole],
            "See all supported topic categories.",
            this.seeTopicCategories.bind(this)
        );

        this.cmds.push(addTopicCategoryCmd, seeTopicCategoriesCmd);
    }

    /**
     * Add topic category to the database.
     * @param message The discord.js message instance.
     * @param args Arguments of the command.
     */
    private async addTopicCategory(message: Discord.Message, args?: any[])
    {
        const categoryName: string = args[0];
        const primaryChannelName: string = args[1];

        try 
        {
            // Find category. Refactor when the library typings are finalized.
            const discordCategory: Discord.CategoryChannel = message.guild.channels.find(x => x.name.toLowerCase() === categoryName.toLowerCase()) as Discord.CategoryChannel;
            if (!discordCategory)
            {
                message.channel.send("Cannot find specified category.");
                return;
            }

            // Find primary channel.
            const primaryChannel: Discord.GuildChannel = discordCategory.children.find(x => x.name === primaryChannelName);
            if (!primaryChannel)
            {
                message.channel.send(`Cannot find '${primaryChannelName}' in category '${categoryName}'.`);
                return;
            }

            // Add category to the db.
            const success: boolean = await this.db.run("INSERT INTO TopicCategory(CategoryId, PrimaryChannelId) VALUES(?, ?)", [discordCategory.id, primaryChannel.id]);
            if (!success)
            {
                message.channel.send(`Unable to add category '${categoryName}' to db.`);
                return;
            }

            message.channel.send("Topic category added.");
        } 
        catch (e) 
        {
            throw e;
        }
    }

    /**
     * See all supported topic categories.
     * @param message The discord.js message instance.
     * @param args Arguments of the command.
     */
    private async seeTopicCategories(message: Discord.Message, args?: any[])
    {
        try 
        {
            // Grab all topic categories from db.
            const catRows: any[] = await this.db.all("SELECT CategoryId, PrimaryChannelId FROM TopicCategory", []);

            // Grab all category/primary channel data from discord that corresponds to the db data.
            const cats: Discord.CategoryChannel[] = message.guild.channels.filter(x => catRows.some(y => y.CategoryId === x.id)).array() as Discord.CategoryChannel[];
            const primaryChannels: Discord.GuildChannel[] = message.guild.channels.filter(x => catRows.some(y => y.PrimaryChannelId === x.id)).array();

            // Create rich embed for response.
            const embed: Discord.RichEmbed = new Discord.RichEmbed();
            embed.setColor([0, 0, 255]);
            embed.setDescription("Supported Topic Categories");

            catRows.forEach(x => {
                const catDisplay: Discord.CategoryChannel = cats.find(y => y.id === x.CategoryId);
                const primaryChannelDisplay: Discord.GuildChannel = primaryChannels.find(y => y.id === x.PrimaryChannelId);

                embed.addField(catDisplay.name, `Primary channel: #${primaryChannelDisplay.name}.`);
            });

            // Send response.
            message.channel.send(embed);
        } 
        catch (e) 
        {
            throw e;
        }
    }
}