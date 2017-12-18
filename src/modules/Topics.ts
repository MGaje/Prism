import * as Discord from "discord.js";

import { BaseModule } from "../core/module/BaseModule";
import { Command } from "../core/module/Command";
import { Argument } from "../core/module/Argument";
import { PrismCommanderRole } from "../core/constants";

/**
 * Module for topic management.
 * 
 * This module has commands for adding, retiring, and toggling topics among others.
 * It will allow users to voluntarily opt-in and out of seeing particular discord channels.
 */
export class TopicsModule extends BaseModule
{
    /**
     * Setup commands and add them to the command array.
     */
    public setupCommands()
    {
    }
}