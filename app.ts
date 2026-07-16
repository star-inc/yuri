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

import {
    useMCPManager,
} from "./src/agents/tools/modelContextProtocol.ts";
import {
    getMcpConfigs,
} from "./src/agents/tools/config.ts";
import {
    baseTools,
    baseToolMap,
} from "./src/agents/tools/index.ts";

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

// Start MCP Manager
const mcpConfigs = getMcpConfigs();
if (mcpConfigs.length > 0) {
    try {
        await useMCPManager().startAll(mcpConfigs);
        const mcpTools = useMCPManager().getTools();
        console.info(`[MCP Tools] Found ${mcpTools.length} tools.`);
        if (mcpTools.length > 0) {
            baseTools.push(...mcpTools);
            for (const t of mcpTools) {
                baseToolMap[t.name] = t;
            }
            console.info(
                `[MCP Tools] Added ${mcpTools.length} tools ` +
                "to agent base tools.",
            );
        }
    } catch (err) {
        console.error("[MCP Tools] Failed to initialize MCP:", err);
    }
}

// Cleanup on exit
const cleanup = async () => {
    console.info("Shutting down MCP manager...");
    await useMCPManager().stopAll();
    process.exit(0);
};
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

// for bots
setupTriggers();

// log startup info
console.info([
    "Yuri",
    `Started at "${timestamp}"`,
    `Running on server "${hostname}"`,
].join("\n"));
