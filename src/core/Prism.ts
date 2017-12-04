import * as Discord from "discord.js";

import { Database } from "./Database";
import { MessageHandler } from "./MessageHandler";

import { Module } from "./module/interfaces/Module";
import { QuotesModule } from "../modules/Quotes";

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
        const currentCommandNames: string[] = [];
        let duplicateCmdNameFound: string = undefined;

        const quotesModule: Module = new QuotesModule(this.db);
        const quotesModuleCmdNames: string[] = quotesModule.getCommandNames(true);

        duplicateCmdNameFound = this.findCommandNameCollision(quotesModuleCmdNames, currentCommandNames);
        if (duplicateCmdNameFound)
        {
            throw new Error("Invalid module: command name collision for: " + duplicateCmdNameFound);
        }

        this.modules.push(quotesModule);
        currentCommandNames.concat(quotesModuleCmdNames);

        // This is where we would add another module with the updated currentCommandNames array.
    }

    /**
     * Finds command name collisions in the provided arrays.
     * @param {string[]} moduleCmdNames The module-to-be-added's command names.
     * @param {string[]} currentCmdNames The current listing of supported commands.
     */
    private findCommandNameCollision(moduleCmdNames: string[], currentCmdNames: string[]): string
    {
        return currentCmdNames.find(x => moduleCmdNames.some(y => y === x));
    }
}