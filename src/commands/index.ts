import type {
    CommandConfig,
} from "../clients/discord.ts";

import * as terminal from "./terminal.ts";

export const commandRevision = 2;

interface CommandIndex {
    global: Record<string, CommandConfig>;
    guilds: Record<string, CommandConfig>;
}

const commands: CommandIndex = {
    global: {
        ...terminal,
    },
    guilds: {},
};

export default commands;
