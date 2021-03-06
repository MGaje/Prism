import * as Discord from "discord.js";
import getEnv from "../env";

import { DataStoreKeys } from "./constants";
import { Config } from "./Config";
import { DatabaseContext } from "../database/DatabaseContext";
import { PostgreSqlDbContext } from '../database/PostgreSqlDbContext';
import { SqlLiteDbContext } from "../database/SqlLiteDbContext";
import { MessageHandler } from "./MessageHandler";
import { DataStore } from "./DataStore";
import { Utility } from "./Utility";

import { Module } from "./module/interfaces/Module";
import { QuotesModule } from "../modules/Quotes";
import { SillyModule } from "../modules/Silly";
import { ManagementModule } from "../modules/Management";
import { TopicsModule } from "../modules/Topics";

/**
 * Main bot construct.
 */
export class Prism
{
    public modules: Module[];
    public config: Config;
    public botClient: Discord.Client;
    public db: DatabaseContext;
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
        this.ds = new DataStore();

        if (Utility.isProdEnv())
        {
            this.db = new PostgreSqlDbContext();
        }
        else
        {
            this.db = new SqlLiteDbContext();
        }
    }

    /**
     * Run the bot.
     */
    public async run(): Promise<void>
    {
        console.log("--Setting up environment--");
        this.ds.set(DataStoreKeys.Env, getEnv());

        console.log("--Attempting to connect to db: --");

        try
        {
            await this.db.connect();
            console.log("--Connected to db--");

            console.log("--Registering modules--");
            this.registerModules();

            console.log("--Setting up handlers--");
            this.setupHandlers();
                
            console.log("--Setting up event listeners--");
            this.setupListeners();

            console.log("--Cache data--");
            await this.cacheData();

            console.log("--Atempting to login--");
            this.botClient.login(this.config.botToken); 
        }
        catch (e)
        {
            console.error(e.message);
        }
    }

    /**
     * Sets up all the handlers.
     */
    private setupHandlers()
    {
        console.log("--Creating Message Handler--");
        this.mh = new MessageHandler(this.modules, this.ds);
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

        this.botClient.on('channelDelete', channel =>
        {

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
        const modulesToValidate: Module[] = [
            new QuotesModule(this.db, this.ds), 
            new SillyModule(this.db, this.ds), 
            new ManagementModule(this.db, this.ds),
            new TopicsModule(this.db, this.ds)
        ];

        modulesToValidate.forEach(x => {
            if (!this.validateModule(x))
            {
                throw new Error("Invalid module.");
            }

            this.modules.push(x);
        });
    }

    /**
     * Validate a module.
     * @param module The module to validate.
     * @returns {boolean} Flag indicating if the module is valid.
     */
    private validateModule(module: Module): boolean
    {
        // todo: Keep this method in mind. Right now it just returns the outcome of the command name collision method.
        // In the future, modules might have other conditions to be considered valid.
        const supportedCommands: string[] = [].concat(...this.modules.map(x => x.getCommandNames(true)));
        const moduleCommands: string[] = module.getCommandNames(true);
        const commandNameCollisionFound: boolean = this.findCommandNameCollision(moduleCommands, supportedCommands);

        return !commandNameCollisionFound;
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