import { EnvSettings } from "./core/classes/EnvSettings";

export default function(): EnvSettings
{
    switch (process.env.NODE_ENV)
    {
        case "development":
            return require("../env/development.json");

        case "production":
            return require("../env/production.json");

        default: 
            throw new Error("Unknown environment");
    }
}