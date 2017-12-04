import { Argument } from "./Argument";

/**
 * Class that represents a bot command.
 */
export class Command
{
    public names: string[];
    public argDefs: Argument[];
    public help: string;

    /**
     * @constructor
     * @param {string[]} nameAndAliases Array of name and aliases. First element is the assumed name of the command.
     * @param {Argument[]} argDefs Argument definition.
     * @param {string} helpStr The information relayed during the help command.
     */
    constructor(nameAndAliases: string[], argDefs: Argument[], helpStr?: string)
    {
        this.names = nameAndAliases;
        this.argDefs = argDefs;
        this.help = helpStr;
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

            stringBuilder.push(requiredArgNames.join(", "));
            if (optionalArgNames.length > 0)
            {
                stringBuilder.push(" [");
                if (requiredArgNames.length > 0)
                {
                    stringBuilder.push(",");
                }
                stringBuilder.push(optionalArgNames.join(", "), "] - ");
            }
        }

        stringBuilder.push(this.help);

        return stringBuilder.join("");
    }
}