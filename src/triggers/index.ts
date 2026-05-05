import {
    Events,
} from "discord.js";
import {
    client,
} from "../clients/discord.ts";

import clientReadyHandler from "./client_ready/index.ts";
import guildCreateHandler from "./guild_create/index.ts";
import interactionCreateHandler from "./interaction_create/index.ts";
import messageCreateHandler from "./message_create/index.ts";

export const setupTriggers = (): void => {
    client.on(Events.ClientReady, clientReadyHandler);
    client.on(Events.GuildCreate, guildCreateHandler);
    client.on(Events.InteractionCreate, interactionCreateHandler);
    client.on(Events.MessageCreate, messageCreateHandler);
};
