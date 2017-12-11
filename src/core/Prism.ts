import * as Discord from "discord.js";

import { DataStoreKeys } from "./constants";
import { Config } from "./Config";
import { Database } from "./Database";
import { MessageHandler } from "./MessageHandler";
import { DataStore } from "./DataStore";

import { Module } from "./module/interfaces/Module";
import { QuotesModule } from "../modules/Quotes";
import { SillyModule } from "../modules/Silly";
import { ManagementModule } from "../modules/Management";

/**
 * Main bot construct.
 */
export class Prism
{
    public modules: Module[];
    public config: Config;
    public botClient: Discord.Client;
    public db: Database;
    public ds: DataStore;
    public mh: MessageHandler;
    public stdin: NodeJS.Socket;

    /**
     * Default constuctor.
     * @constructor
     */
    constructor()
    {
        this.modules = [];
        this.config = require("../../config.json");
        this.botClient = new Discord.Client();
        this.db = new Database();
        this.ds = new DataStore();
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

                console.log("--Cache data--");
                this.cacheData()
                    .then(() => 
                    {
                        console.log("--Creating Message Handler--");
                        this.mh = new MessageHandler(this.modules, this.ds);
        
                        console.log("--Atempting to login--");
                        this.botClient.login(this.config.botToken); 
                    });
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
     * Cache all necessary data (into the data store).
     */
    private cacheData(): Promise<void>
    {
        return this.loadIgnoredUserData();
    }

    /**
     * Load the data from the IgnoreUser table in the db.
     */
    private loadIgnoredUserData(): Promise<void>
    {
        return this.db.all("SELECT UserId FROM IgnoredUser", [])
            .then(rows => 
            {
                const userIds: Discord.Snowflake[] = rows.map(x => x.UserId);
                this.ds.set(DataStoreKeys.IgnoredUsersList, userIds);
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
        const quotesModule: Module = new QuotesModule(this.db, this.ds);
        const quotesModuleCmdNames: string[] = [].concat(...quotesModule.getCommandNames(true));

        if (!this.validateModule(quotesModuleCmdNames, currentCommandNames))
        {
            throw new Error("Invalid module \"QuotesModule\": command name collision found.");
        }

        this.modules.push(quotesModule);
        currentCommandNames = currentCommandNames.concat(quotesModuleCmdNames);

        // Silly module.
        const sillyModule: Module = new SillyModule(this.db, this.ds);
        const sillyModuleCmdNames: string[] = [].concat(...sillyModule.getCommandNames(true));

        if (!this.validateModule(sillyModuleCmdNames, currentCommandNames))
        {
            throw new Error("Invalid module \"SillyModule\": command name collision found.");
        }

        this.modules.push(sillyModule);
        currentCommandNames = currentCommandNames.concat(sillyModuleCmdNames);

        // Management module.
        const managementModule: Module = new ManagementModule(this.db, this.ds);
        const managementModuleCmdNames: string[] = [].concat(...managementModule.getCommandNames(true));

        if (!this.validateModule(managementModuleCmdNames, currentCommandNames))
        {
            throw new Error("Invalid module \"ManagementModule\": command name collision found.");
        }

        this.modules.push(managementModule);
        currentCommandNames = currentCommandNames.concat(managementModuleCmdNames);
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