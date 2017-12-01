/**
 * Command arguments.
 */
export class Argument
{
    public required: boolean;
    public name: string;

    /**
     * @constructor
     * @param {string} name The name of the argument.
     * @param {boolean} required Flag that determines if the argument is required or not.
     */
    constructor(name: string, required: boolean = false)
    {
        this.required = required;
        this.name = name;
    }
}