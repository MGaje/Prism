import * as Discord from "discord.js";

import { BaseModule } from "../core/module/BaseModule";
import { Command } from "../core/module/Command";
import { Argument } from "../core/module/Argument";
import { PrismCommanderRole } from "../core/constants";
import { Utility } from "../core/Utility";

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
        const topicCategoriesCmd: Command = new Command(
            ['topiccategories', 'topiccats'],
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

        // See topics command.
        const topicsCmd: Command = new Command(
            ['topics'],
            [],
            null,
            "See all topics in the category the channel belongs to.",
            this.seeTopicsList.bind(this)
        );

        // See topic command.
        const seeTopicCmd: Command = new Command(
            ['seetopic'],
            [new Argument("topicName", true)],
            null,
            "Get access to topic channel.",
            this.seeTopic.bind(this)
        );

        // Hide topic command.
        const hideTopicCmd: Command = new Command(
            ['hidetopic'],
            [new Argument("topicName", true)],
            null,
            "Remove access to topic channel.",
            this.hideTopic.bind(this)
        );

        this.cmds.push(
            addTopicCategoryCmd, 
            topicCategoriesCmd, 
            addTopicCmd, 
            topicsCmd,
            seeTopicCmd,
            hideTopicCmd
        );
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
            Utility.deleteMessage(message);
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

            // Create the text channel for the topic.
            const topicChannel: Discord.GuildChannel = await message.guild.createChannel(topicNameNormalized, 'text');

            // todo: Remove the ridiculous 'any' cast when the typings are updated.
            (<any>topicChannel).setParent(discordCategory.id);

            // Update everyone role for this channel so that they cannot see it.
            const everyoneRole: Discord.Role = message.guild.roles.find(x => x.name === "@everyone");
            topicChannel.overwritePermissions(everyoneRole.id, <any>{ 'SEND_MESSAGES': false, 'VIEW_CHANNEL': false });

            // Create topic role and adjust permissions so that they CAN read/send messages.
            const topicRole: Discord.Role = await message.guild.createRole({ name: topicNameNormalized, color: 'WHITE'});
            topicChannel.overwritePermissions(topicRole.id, <any>{'SEND_MESSAGES': true, 'VIEW_CHANNEL': true });

            message.channel.send("Topic added.");
        } 
        catch (e) 
        {
            throw e;
        }
    }

    /**
     * Get access to topic channel via topic role.
     * @param message The discord.js message instance.
     * @param args Arguments of the command.
     */
    private async seeTopic(message: Discord.Message, args?: any[])
    {
        const topicName: string = args[0];
        const topicNameNormalized: string = topicName.toLowerCase();

        try
        {
            const category: Discord.CategoryChannel = (<any>message.channel).parent as Discord.CategoryChannel;

            // Verify category and primary channel.
            if (!await this.isPrimaryChannelForCategory(message.channel as Discord.GuildChannel, category))
            {
                // Do something here?
                return;
            }

            // Is the target topic in the category we're in?
            const topicInCategory: boolean = category.children.some(x => x.name === topicNameNormalized);
            if (!topicInCategory)
            {
                message.channel.send(`Topic '${topicName}' not found in category '${category.name}'`);
                return;
            }

            // Find the guild member to alter.
            const guildMember: Discord.GuildMember = message.guild.members.find(x => x.id === message.author.id);
            if (!guildMember)
            {
                console.log(`Guild member not found`);
                return;
            }

            // Find the role to add to guild member.
            const guildRole: Discord.Role = message.guild.roles.find(x => x.name === topicNameNormalized);
            if (!guildRole)
            {
                console.log(`Role not found`);
                return;
            }

            await guildMember.addRole(guildRole);
            Utility.deleteMessage(message);
        }
        catch (e)
        {
            throw e;
        }
    }

    /**
     * Remove access to topic channel via topic role.
     * @param message The discord.js message instance.
     * @param args Arguments of the command.
     */
    private async hideTopic(message: Discord.Message, args?: any[])
    {
        const topicName: string = args[0];
        const topicNameNormalized: string = topicName.toLowerCase();

        try
        {
            const category: Discord.CategoryChannel = (<any>message.channel).parent as Discord.CategoryChannel;

            // Verify category and primary channel.
            if (!await this.isPrimaryChannelForCategory(message.channel as Discord.GuildChannel, category))
            {
                // Do something here?
                return;
            }

            // Is the target topic in the category we're in?
            const topicInCategory: boolean = category.children.some(x => x.name === topicNameNormalized);
            if (!topicInCategory)
            {
                message.channel.send(`Topic '${topicName}' not found in category '${category.name}'`);
                return;
            }

            // Find the guild member to alter.
            const guildMember: Discord.GuildMember = message.guild.members.find(x => x.id === message.author.id);
            if (!guildMember)
            {
                console.log(`Guild member not found`);
                return;
            }

            // Find the role to add to guild member.
            const guildRole: Discord.Role = message.guild.roles.find(x => x.name === topicNameNormalized);
            if (!guildRole)
            {
                console.log(`Role not found`);
                return;
            }

            // Make sure the member has the role to remove.
            const hasRole: boolean = guildMember.roles.some(x => x.id === guildRole.id);
            if (!hasRole)
            {
                return;
            }

            await guildMember.removeRole(guildRole);
            Utility.deleteMessage(message);
        }
        catch (e)
        {
            throw e;
        }
    }

    /**
     * See list of topics. Uses the channel the message was sent to get the appropriate category.
     * @param message The discord.js message instance.
     * @param args Arguments of the command.
     */
    private async seeTopicsList(message: Discord.Message, args?: any[])
    {
        const channel: Discord.GuildChannel = message.channel as Discord.GuildChannel;

        try 
        {
            // Get the Discord category of the channel.
            const category: Discord.CategoryChannel = (<any>channel).parent;
            if (!category)
            {
                message.channel.send(`Could not determine category of this channel.`);
                return;
            }

            // Check if channel is a primary channel for the category (this also validates the category).
            if (!await this.isPrimaryChannelForCategory(channel, category))
            {
                // Do something here?
                return;
            }

            // Get topics based on category.
            const topicList: string[] = category.children.filter(x => x.type === "text" && x.name !== channel.name)
                .array()
                .map(x => x.name);

            // Create rich embed for response.
            const embed: Discord.RichEmbed = new Discord.RichEmbed();
            embed.setColor([0, 0, 255]);
            embed.setDescription(`**${category.name}** category.`);
            embed.addField("Topics", topicList.join(", "), true);

            // Send response.
            message.channel.send(embed);

            Utility.deleteMessage(message);
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
     * @param {Discord.CategoryChannel} category Discord.js CategoryChannel instance.
     * @returns {Promise<boolean>} Flag indicating whether or not the topic category exists.
     */
    private topicCategoryExists(category: Discord.CategoryChannel): Promise<boolean>
    {
        return new Promise<boolean>((resolve, reject) =>
        {
            this.db.get("SELECT Id FROM TopicCategory WHERE CategoryId = ?", [category.id])
                .then(row => resolve(!!row))
                .catch(e => reject(e));
        });
    }

    /**
     * Determine if the specified channel is the primary channel for the specified category.
     * @param {Discord.GuildChannel} channel Channel to validate if it is a primary channel for the specified category.
     * @param {Discord.CategoryChannel} category Category to validate primary channel against.
     * @returns {Promise<boolean>} Flag indicating whether or not the channel is the primary channel for the specified category.
     */
    private isPrimaryChannelForCategory(channel: Discord.GuildChannel, category: Discord.CategoryChannel): Promise<boolean>
    {
        return new Promise<boolean>((resolve, reject) =>
        {
            this.db.get("SELECT Id FROM TopicCategory WHERE CategoryId = ? AND PrimaryChannelId = ?", [category.id, channel.id])
                .then(row => resolve(!!row))
                .catch(e => reject(e));
        });
    }
}