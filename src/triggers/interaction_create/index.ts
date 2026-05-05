import type {
    Interaction,
    ChatInputCommandInteraction,
} from "discord.js";

import {
    type CommandConfig,
} from "../../clients/discord.ts";

import commands from "../../commands/index.ts";

/**
 * Convert camelCase string to snake_case.
 * @param {string} str The string to convert
 * @return {string} The converted string
 */
const snakeToCamelCase = (str: string): string =>
    str.toLowerCase().replace(/([-_][a-z])/g, (group) =>
        group
            .toUpperCase()
            .replace("-", "")
            .replace("_", ""),
    );

/**
 * Interaction create event handler.
 * @param {Interaction} interaction The interaction object
 * @return {Promise<void>}
 */
export default async (interaction: Interaction): Promise<void> => {
    if (!interaction.isCommand()) {
        return;
    }

    const allCommands: Record<string, CommandConfig> = {
        ...commands.global,
        ...commands.guilds,
    };

    const actionName = snakeToCamelCase(interaction.commandName);
    if (Object.hasOwn(allCommands, actionName)) {
        await allCommands[actionName].action(
            interaction as ChatInputCommandInteraction,
        );
    } else {
        await (interaction as ChatInputCommandInteraction).reply(
            "Cannot access this command",
        );
    }
};
