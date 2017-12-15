import * as Discord from "discord.js";

import { Argument } from "./Argument";

export type CommandAction = (message: Discord.Message, args?: any[]) => void;

/**
 * Class that represents a bot command.
 */
export class Command
{
    public names: string[];
    public argDefs: Argument[];
    public help: string;
    public requiredRoles: string[];

    private _action: CommandAction;

    /**
     * @constructor
     * @param {string[]} nameAndAliases Array of name and aliases. First element is the assumed name of the command.
     * @param {Argument[]} argDefs Argument definition.
     * @param {string} helpStr The information relayed during the help command.
     */
    constructor(nameAndAliases: string[], argDefs: Argument[], requiredRoles?: string[], helpStr?: string, action?: CommandAction)
    {
        this.names = nameAndAliases;
        this.argDefs = argDefs;
        this.help = helpStr;
        this.requiredRoles = requiredRoles || [];
        this._action = action;
    }

    /**
     * Get name of the command. The assumption that the first entry in 'names'
     * is the full name of the command. The rest of the entries are aliases.
     */
    public getName(): string
    {
        if (!this.names || this.names.length === 0)
        {
            throw new Error("No names have been set for this command.");
        }

        return this.names[0];
    }

    /**
     * Get aliases of the command. The assumption that any entries in names with index greater than 0
     * are aliases.
     */
    public getAliases(): string[]
    {
        if (!this.names || this.names.length === 0)
        {
            throw new Error("No names have been set for this command.");
        }

        return this.names.slice(1);
    }

    /**
     * Perform action of the command.
     * @param message The discord.js message instance.
     * @param args Arguments of the command.
     */
    public async doAction(message: Discord.Message, args?: any[])
    {
        // If the command requires no special roles, just perform the action.
        if (this.requiredRoles.length === 0)
        {
            await this._action(message, args);
            return;
        }

        // The command requires special roles. Check to make sure the user has the specified roles.
        if (this.canUserPerform(message.author, message.guild))
        {
            await this._action(message, args);
        }
    }

    /**
     * Compile a help string based on its data.
     */
    public getCompiledHelpString(): string
    {
        if (!this.names || this.names.length === 0)
        {
            throw new Error("No names have been set for this command.");
        }

        const stringBuilder: string[] = ["!", this.getName()];

        // Add arguments if there are any.
        if (this.argDefs.length > 0)
        {
            const requiredArgNames: string[] = this.argDefs.filter(x => x.required).map(x => x.name);
            const optionalArgNames: string[] = this.argDefs.filter(x => !x.required).map(x => x.name);

            if (requiredArgNames.length > 0)
            {
                stringBuilder.push(" _", requiredArgNames.join(", "), "_");
            }
            
            if (optionalArgNames.length > 0)
            {
                stringBuilder.push(" _[", optionalArgNames.join(", "), "]_");
            }
        }

        stringBuilder.push(" - ", this.help);

        return stringBuilder.join("");
    }

    /**
     * Determine if the specified user can perform this command in the specified guild.
     * @param {Discord.User} forUser The user that want to perform the command.
     * @param {Discord.Guild} forGuild The guild in which the request was sent.
     * @returns {boolean} Flag indicating if user can perform command in guild.
     */
    public canUserPerform(forUser: Discord.User, forGuild: Discord.Guild): boolean
    {
        const guildMember: Discord.GuildMember = forGuild.members.find(x => x.id === forUser.id);
        return this.requiredRoles.every(x => guildMember.roles.some(y => y.name === x));
    }
}