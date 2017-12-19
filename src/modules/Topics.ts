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
        // Add topic category command.
        const addTopicCategoryCmd: Command = new Command(
            ['addtopiccategory', 'addtopiccat'],
            [new Argument("categoryName", true), new Argument("primaryChannelName", true)],
            [PrismCommanderRole],
            "Add a topic category. categoryName and primaryChannelName are both required parameters; primaryChannelName has to be a channel in the provided category Topic categories are used to house the text channels for topics.",
            this.addTopicCategory.bind(this)
        );

        // See topic categories command.
        const seeTopicCategoriesCmd: Command = new Command(
            ['seetopiccategories', 'seetopiccats'],
            [],
            [PrismCommanderRole],
            "See all supported topic categories.",
            this.seeTopicCategories.bind(this)
        );

        // Add topic command.
        const addTopicCmd: Command = new Command(
            ['addtopic'],
            [new Argument("topicName", true), new Argument("categoryName", true)],
            [PrismCommanderRole],
            "Add a topic. topicName is the desired channel/role name and categoryName is the category to which it will belong.",
            this.addTopic.bind(this)
        );

        this.cmds.push(addTopicCategoryCmd, seeTopicCategoriesCmd, addTopicCmd);
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

            // Make sure the category doesn't exist already.
            if (await this.topicCategoryExists(discordCategory))
            {
                message.channel.send("Topic category already exists.");
                return;
            }

            // Add category to the db.
            if (!await this.db.run("INSERT INTO TopicCategory(CategoryId, PrimaryChannelId) VALUES(?, ?)", [discordCategory.id, primaryChannel.id]))
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

    /**
     * Add topic entry. Creates role, text channel, and updates permissions accordingly.
     * @param message The discord.js message instance.
     * @param args Arguments of the command.
     */
    private async addTopic(message: Discord.Message, args?: any[])
    {
        const topicName: string = args[0];
        const topicNameNormalized: string = topicName.toLowerCase();
        const categoryName: string = args[1];

        try 
        {
            // Find category. Refactor when the library typings are finalized.
            const discordCategory: Discord.CategoryChannel = message.guild.channels.find(x => x.name.toLowerCase() === categoryName.toLowerCase()) as Discord.CategoryChannel;
            if (!discordCategory)
            {
                message.channel.send(`'${categoryName}' does not correspond to a Discord channel/category.`);
                return;
            }

            // Check to see if topic category exists.
            if (!await this.topicCategoryExists(discordCategory))
            {
                message.channel.send(`'${categoryName}' is not a recognized topic category. Please add it with the _!addtopiccategory_ command.`);
                return;
            }

            // Check to see if topic exists.
            if (await this.topicExists(topicNameNormalized))
            {
                message.channel.send(`'${topicName}' already exists as a topic.`);
                return;
            }

            // Add topic to db.
            const topicId: number = await this.db.run("INSERT INTO Topic(Name, TopicCategoryId) VALUES(?, ?)", [topicNameNormalized, discordCategory.id]);
            if (!topicId)
            {
                message.channel.send(`Unable to add topic '${topicName}' to db.`);
                return;
            }

            // Create the text channel for the topic.
            const topicChannel: Discord.GuildChannel = await message.guild.createChannel(topicName, 'text');

            // todo: Remove the ridiculous 'any' cast when the typings are updated.
            (<any>topicChannel).setParent(discordCategory.id);

            // Update everyone role for this channel so that they cannot see it.
            const everyoneRole: Discord.Role = message.guild.roles.find(x => x.name === "@everyone");
            topicChannel.overwritePermissions(everyoneRole.id, <any>{ 'SEND_MESSAGES': false, 'VIEW_CHANNEL': false });

            // Create topic role and adjust permissions so that they CAN read/send messages.
            const topicRole: Discord.Role = await message.guild.createRole({ name: topicName, color: 'WHITE'});
            topicChannel.overwritePermissions(topicRole.id, <any>{'SEND_MESSAGES': true, 'VIEW_CHANNEL': true });

            // Add topic role to db.
            if (!await this.db.run("INSERT INTO TopicRole(RoleId, TopicId) VALUES(? ,?)", [topicRole.id, topicId]))
            {
                message.channel.send(`Unable to add new topic role to db.`);
                return;
            }

            message.channel.send("Topic added.");
        } 
        catch (e) 
        {
            throw e;
        }
    }

    // -----------------------------------------------------------------------------------
    // Utility functions.
    // -----------------------------------------------------------------------------------

    /**
     * Determine if topic category exists in the db.
     * @param category Discord.js CategoryChannel instance.
     * @returns {Promise<boolean>} Flag indicating whether or not the topic category exists.
     */
    private async topicCategoryExists(category: Discord.CategoryChannel): Promise<boolean>
    {
        return new Promise<boolean>((resolve, reject) =>
        {
            this.db.get("SELECT Id FROM TopicCategory WHERE CategoryId = ?", [category.id])
                .then(row => resolve(!!row))
                .catch(e => reject(e));
        });
    }

    /**
     * Determine if topic exists in the db.
     * @param topic The topic we are searching for.
     * @returns {Promise<boolean>} Flag indicating whether or not the topic exists.
     */
    private async topicExists(topic: string): Promise<boolean>
    {
        return new Promise<boolean>((resolve, reject) =>
        {
            this.db.get("SELECT Id FROM Topic WHERE Name = ?", [topic])
                .then(row => resolve(!!row))
                .catch(e => reject(e));
        });
    }
}