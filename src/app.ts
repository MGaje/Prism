(<any>global).appRoot = __dirname;

import { Prism } from "./core/Prism";

const prismBot: Prism = new Prism();
prismBot.run();