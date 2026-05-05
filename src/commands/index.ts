import type {
    CommandConfig,
} from "../clients/discord.ts";

import * as terminal from "./terminal.ts";

export const commandRevision = 1;

interface CommandIndex {
    global: Record<string, CommandConfig>;
    guilds: Record<string, CommandConfig>;
}

const commands: CommandIndex = {
    global: {
        ...terminal,
    },
    guilds: {
        ...terminal,
    },
};

export default commands;
