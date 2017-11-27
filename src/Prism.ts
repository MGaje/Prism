import * as Discord from "discord.js";
import * as Path from "path";

import { Database } from "./Database";
import { MessageHandler } from "./MessageHandler";

const auth = require("../auth.json");

/**
 * 
 */
export class Prism
{
    public botClient: Discord.Client;
    public db: Database;
    public mh: MessageHandler;
    public stdin: NodeJS.Socket;

    /**
     * 
     */
    constructor()
    {
        this.botClient = new Discord.Client();
        this.db = new Database();
    }

    /**
     * 
     */
    public run()
    {
        console.log("--Attempting to connect to db--");
        this.db.connect(Path.join(__dirname, "..", "db", "quotes.db"))
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
     * 
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