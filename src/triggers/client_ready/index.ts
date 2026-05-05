import {
    OAuth2Guild,
    type Snowflake,
} from "discord.js";
import type {
    Client,
} from "discord.js";

import {
    db,
} from "../../clients/lowdb.ts";
import {
    registerCommandsForGlobal,
    registerCommandsForGuild,
} from "../../clients/discord.ts";

import commands, {
    commandRevision,
} from "../../commands/index.ts";

const checkGlobalCommandRevisions = async (client: Client): Promise<void> => {
    const user = await client.user?.fetch();
    if (!user || !user.id) {
        throw new Error("User ID is undefined.");
    }

    const revision = db.data.commandRevisions[user.id] || 0;
    if (revision === commandRevision) {
        return;
    }

    console.info("Re-registering global commands...");
    await registerCommandsForGlobal({
        ...commands.global,
    });
    console.info("Global commands registration complete.");

    await db.update((data) => {
        data.commandRevisions[user.id] = commandRevision;
    });
    await db.write();
};

const checkGuildCommandRevisions = async (client: Client): Promise<void> => {
    const guilds = await client.guilds.fetch();

    await Promise.allSettled(guilds.map(async (guild, guildId) => {
        if (!(guild instanceof OAuth2Guild)) {
            return;
        }

        const revision = db.data.commandRevisions[guildId] || 0;
        if (revision === commandRevision) {
            return;
        }

        console.info(`Re-registering commands for guild ${guildId}...`);
        await registerCommandsForGuild(guild, {
            ...commands.guilds,
        });
        console.info(`Guild ${guildId} commands registration complete.`);

        await db.update((data) => {
            data.commandRevisions[guildId] = commandRevision;
        });
    }));

    await db.write();
};

const notifyRestartToOwner = async (client: Client): Promise<void> => {
    const botOwnerId = process.env.DISCORD_BOT_OWNER_ID as
        Snowflake | undefined;
    if (botOwnerId) {
        try {
            const botOwner = await client.users.fetch(botOwnerId);
            await botOwner.send("Yuri has restarted.");
        } catch (error) {
            console.warn(
                `Failed to send restart message to owner (${botOwnerId}):`,
                error,
            );
        }
    } else {
        console.warn(
            "DISCORD_BOT_OWNER_ID is not set. Restart notification skipped.",
        );
    }
};

/**
 * Ready event handler.
 * @param {Client} client The Discord client
 * @return {Promise<void>}
 */
export default async (client: Client): Promise<void> => {
    await Promise.allSettled([
        checkGlobalCommandRevisions(client),
        checkGuildCommandRevisions(client),
        notifyRestartToOwner(client),
    ]);
};
