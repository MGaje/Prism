import * as Discord from "discord.js";

import { Database } from "./Database";
import { MessageHandler } from "./MessageHandler";

import { Module } from "./module/interfaces/Module";
import { QuotesModule } from "../modules/Quotes";
import { SillyModule } from "../modules/Silly";

const auth = require("../../auth.json");

/**
 * Main bot construct.
 */
export class Prism
{
    public modules: Module[];
    public botClient: Discord.Client;
    public db: Database;
    public mh: MessageHandler;
    public stdin: NodeJS.Socket;

    /**
     * Default constuctor.
     * @constructor
     */
    constructor()
    {
        this.modules = [];
        this.botClient = new Discord.Client();
        this.db = new Database();
    }

    /**
     * Run the bot.
     * @param {string} dbPath Path of the database file.
     */
    public run(dbPath: string)
    {
        console.log("--Attempting to connect to db: " + dbPath + "--");
        
        this.db.connect(dbPath)
            .then(() => 
            {
                console.log("--Connected to db--");
                
                console.log("--Setting up event listeners--");
                this.setupListeners();

                console.log("--Registering modules--");
                this.registerModules();

                this.mh = new MessageHandler(this.modules);

                console.log("--Atempting to login--");
                this.botClient.login(auth.token); 
            },
            err =>
            {
                console.error(err.message);
            });
    }

    /**
     * Sets up discord.js and console event listeners.
     */
    private setupListeners()
    {
        this.stdin = process.openStdin();

        this.botClient.on('ready', () =>
        {
            console.log("--Ready--");
        });
        
        this.botClient.on('message', message =>
        {
            if (message.content.charAt(0) === "!")
            {
                this.mh.handleMsg(message);
            }
        });
        
        this.botClient.on("disconnect", () =>
        {
            console.log("--Disconnecting--");
        });
        
        this.stdin.addListener("data", d =>
        {
            const input: string = d.toString().trim();
            if (input === "quit")
            {
                this.stdin.removeAllListeners();
                this.botClient.destroy();
                this.db.close();

                process.exit();
            }
        });
    }

    /**
     * Register all modules.
     */
    private registerModules()
    {
        // Some of this logic will probably separated out into its own function (ie: validateModule)
        // but there's only one actual module right now.
        let currentCommandNames: string[] = [];

        // Quotes module.
        const quotesModule: Module = new QuotesModule(this.db);
        const quotesModuleCmdNames: string[] = [].concat(...quotesModule.getCommandNames(true));

        if (!this.validateModule(quotesModuleCmdNames, currentCommandNames))
        {
            throw new Error("Invalid module \"QuotesModule\": command name collision found.");
        }

        this.modules.push(quotesModule);
        currentCommandNames = currentCommandNames.concat(quotesModuleCmdNames);

        // Silly module.
        const sillyModule: Module = new SillyModule(this.db);
        const sillyModuleCmdNames: string[] = [].concat(...sillyModule.getCommandNames(true));

        if (!this.validateModule(sillyModuleCmdNames, currentCommandNames))
        {
            throw new Error("Invalid module \"SillyModule\": command name collision found.");
        }

        this.modules.push(sillyModule);
        currentCommandNames = currentCommandNames.concat(sillyModuleCmdNames);
    }

    /**
     * Validate a module.
     * @param moduleCmdNames The module-to-be-added's command names.
     * @param currentCmdNames The current listing of supported commands.
     * @returns {boolean} Flag indicating if the module is valid.
     */
    private validateModule(moduleCmdNames: string[], currentCmdNames: string[]): boolean
    {
        // todo: Keep this method in mind. Right now it just returns the outcome of the command name collision method.
        // In the future, modules might have other conditions to be considered valid.
        const duplicateCmdNameFound: boolean = this.findCommandNameCollision(moduleCmdNames, currentCmdNames);
        return !duplicateCmdNameFound;
    }

    /**
     * Finds command name collisions in the provided arrays.
     * @param {string[]} moduleCmdNames The module-to-be-added's command names.
     * @param {string[]} currentCmdNames The current listing of supported commands.
     * @returns {boolean} Flag indicating if a collision was found.
     */
    private findCommandNameCollision(moduleCmdNames: string[], currentCmdNames: string[]): boolean
    {
        return currentCmdNames.some(x => moduleCmdNames.some(y => y === x));
    }
}