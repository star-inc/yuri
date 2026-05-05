import {REST} from "@discordjs/rest";
import {Routes} from "discord-api-types/v9";

import {
    Client,
    Partials,
    GatewayIntentBits,
    ApplicationCommandOptionType,
} from "discord.js";
import type {
    BaseGuild,
    GuildMember,
    APIInteractionGuildMember,
    ChatInputCommandInteraction,
} from "discord.js";

const appId = process.env.DISCORD_APP_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;

if (!appId || !botToken) {
    throw new Error(
        "Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN environment variables",
    );
}

export const restClient = new REST({version: "10"});
restClient.setToken(botToken);

export const client = new Client({
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction,
    ],
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent,
    ],
});
client.login(botToken);

// Define a type for using in role checks
type MemberType = GuildMember | APIInteractionGuildMember | null | undefined;

/**
 * Check if the sender of a message has a specific role
 * @param {MemberType} member The member to check for
 * @param {string} roleId The ID of the role to check for
 * @return {boolean} Whether the sender has the specified role
 */
export function isSenderHasRole(
    member: MemberType,
    roleId: string,
): boolean {
    if (!member) return false;
    // GuildMember: roles is a manager with cache.has
    const gm = member as GuildMember;
    const maybeMgr = gm.roles as unknown as {
        cache?: { has?: (id: string) => boolean }
    };
    if (maybeMgr?.cache?.has) {
        return maybeMgr.cache.has(roleId);
    }
    // APIInteractionGuildMember: roles is string[]
    const apiMember = member as APIInteractionGuildMember;
    return Array.isArray(apiMember.roles) ?
        apiMember.roles.includes(roleId) :
        false;
}

/**
 * Validate if the sender has a specific role, throw error if not
 * @param {MemberType} member The member to check for
 * @param {string} roleId The ID of the role to check for
 * @throws {Error} If the sender does not have the role, throw an error
 * @return {void}
 */
export function validateSenderHasRole(
    member: MemberType,
    roleId: string,
): void {
    if (isSenderHasRole(member, roleId)) {
        return;
    }
    throw new Error("Access denied: missing required role");
}

export interface CommandOption {
    type: ApplicationCommandOptionType
    name: string
    description: string
    required: boolean
}

export interface CommandConfig {
    description: string;
    options?: CommandOption[];
    action: (
        interaction: ChatInputCommandInteraction,
    ) => Promise<void>;
}

/**
 * Register commands to the Discord API.
 * @param {object} modules The modules to register
 * @return {Promise<void>}
 */
export async function registerCommandsForGlobal(
    modules: Record<string, CommandConfig>,
): Promise<void> {
    const camelToSnakeCase = (str: string) =>
        str.replace(/[A-Z]/g, (letter) =>
            `_${letter.toLowerCase()}`,
        );
    const commands = Object.keys(modules).map((i) => ({
        name: camelToSnakeCase(i),
        description: modules[i].description,
        options: modules[i].options || null,
    }));
    await restClient.put(
        Routes.applicationCommands(appId as string),
        {body: commands},
    );
}

/**
 * Register commands to the Discord API.
 * @param {Guild} guild The guild to register the commands
 * @param {object} modules The modules to register
 * @return {Promise<void>}
 */
export async function registerCommandsForGuild(
    guild: BaseGuild,
    modules: Record<string, CommandConfig>,
): Promise<void> {
    const camelToSnakeCase = (str: string) =>
        str.replace(/[A-Z]/g, (letter) =>
            `_${letter.toLowerCase()}`,
        );
    const commands = Object.keys(modules).map((i) => ({
        name: camelToSnakeCase(i),
        description: modules[i].description,
        options: modules[i].options || null,
    }));
    await restClient.put(
        Routes.applicationGuildCommands(appId as string, guild.id),
        {body: commands},
    );
}

/**
 * Slice the message content into multiple snippets.
 * @param {string} content - The content to slice.
 * @param {number} maxLength - The maximum length of each snippet.
 * @param {string} separator - The separator to split the content.
 * @return {Array<string>} The sliced snippets.
 */
export function sliceContent(
    content: string,
    maxLength: number,
    separator: string = "\n",
): string[] {
    // Validation guards
    if (maxLength <= 0) return [];
    if (!content) return [];

    const snippets: string[] = [];
    let current = "";

    // Helper: flush current buffer into snippets
    const flushCurrent = () => {
        if (!current) return;
        snippets.push(current.trim());
        current = "";
    };

    // Helper: split a very long string into maxLength chunks
    const splitIntoChunks = (str: string) => {
        for (let i = 0; i < str.length; i += maxLength) {
            const part = str.slice(i, i + maxLength).trim();
            if (part) snippets.push(part);
        }
    };

    // Helper: try to append a line (with separator when appropriate)
    const appendLine = (lineWithSep: string) => {
        // If it fits, append
        if (!current || current.length + lineWithSep.length <= maxLength) {
            current = current ? current + lineWithSep : lineWithSep;
            return;
        }

        // Otherwise flush and then handle the line
        flushCurrent();
        if (lineWithSep.length <= maxLength) {
            current = lineWithSep;
        } else {
            splitIntoChunks(lineWithSep);
        }
    };

    // Process source by lines to keep separator awareness
    const lines = content.split(separator);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isLast = i === lines.length - 1;
        const lineWithSep = isLast ? line : line + separator;

        // Guard: if a single piece is too long
        // and current is empty, split directly
        if (!current && lineWithSep.length > maxLength) {
            splitIntoChunks(lineWithSep);
            continue;
        }

        appendLine(lineWithSep);
    }

    flushCurrent();
    return snippets;
}
