import { Prism } from "./core/Prism";
import * as Path from "path";

const prismBot: Prism = new Prism();
const dbPath: string = Path.join(__dirname, "..", "db", "quotes.db")

prismBot.run(dbPath);