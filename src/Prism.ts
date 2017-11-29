import * as Discord from "discord.js";
import * as Path from "path";

import { Database } from "./Database";
import { MessageHandler } from "./MessageHandler";

const auth = require("../auth.json");

/**
 * Main bot construct.
 */
export class Prism
{
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
        this.botClient = new Discord.Client();
        this.db = new Database();
    }

    /**
     * Run the bot.
     */
    public run()
    {
        const dbPath: string = Path.join(__dirname, "..", "db", "quotes.db")
        console.log("--Attempting to connect to db: " + dbPath + "--");
        
        this.db.connect(dbPath)
            .then(() => 
            {
                console.log("--Connected to db--");
                console.log("--Atempting to login--");
    
                this.setupListeners();
                this.mh = new MessageHandler(this.db);
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
}