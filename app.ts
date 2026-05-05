// Auto-load config
import "dotenv/config";

// Import modules
import {
    hostname as getHostname,
} from "node:os";

import {
    setupTriggers,
} from "./src/triggers/index.ts";

import {
    db,
} from "./src/clients/lowdb.ts";

/**
 * Yuri
 * Main application entry point.
 */

const timestamp = new Date().toString();
const hostname = getHostname();

// log to lowdb
await db.update((data) => {
    data.lastStartedAt = timestamp;
    data.lastStartedBy = hostname;
});
await db.write();

// for bots
setupTriggers();

// log startup info
console.info([
    "Yuri",
    `Started at "${timestamp}"`,
    `Running on server "${hostname}"`,
].join("\n"));
