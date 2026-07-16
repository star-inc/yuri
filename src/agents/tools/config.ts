import {existsSync, readFileSync} from "node:fs";
import {resolve} from "node:path";
import toml from "toml";
import type {MCPServerConfig} from "./modelContextProtocol.ts";

/**
 * Read and parse mcp.toml configuration.
 * @return {MCPServerConfig[]} The parsed MCP configurations or an empty array.
 */
export function getMcpConfigs(): MCPServerConfig[] {
    const configPath = process.env.MCP_CONFIG_PATH || "mcp.toml";
    const absolutePath = resolve(process.cwd(), configPath);
    if (!existsSync(absolutePath)) {
        return [];
    }
    try {
        const content = readFileSync(absolutePath, "utf-8");
        const parsed = toml.parse(content) as Record<string, unknown>;
        if (parsed && Array.isArray(parsed.servers)) {
            return parsed.servers as MCPServerConfig[];
        }
        return [];
    } catch (err) {
        console.error("[Config] Failed to read or parse mcp.toml:", err);
        return [];
    }
}
