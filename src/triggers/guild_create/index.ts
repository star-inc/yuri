import type {
    Guild,
} from "discord.js";
import {
    registerCommandsForGuild,
} from "../../clients/discord.ts";

import commands from "../../commands/index.ts";

/**
 * Guild create event handler.
 * @param {Guild} guild The guild object
 * @return {Promise<void>}
 */
export default async (guild: Guild): Promise<void> => {
    await registerCommandsForGuild(guild, {
        ...commands.guilds,
    });
};
