import {z} from "zod";

import {
    tool,
} from "@langchain/core/tools";
import type {
    StructuredToolInterface,
} from "@langchain/core/tools";
import {
    Client,
} from "@modelcontextprotocol/sdk/client/index.js";
import {
    StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import {
    SSEClientTransport,
} from "@modelcontextprotocol/sdk/client/sse.js";
import {
    StreamableHTTPClientTransport,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
    Transport,
} from "@modelcontextprotocol/sdk/shared/transport.js";

interface JsonSchema {
    type?: string | string[];
    description?: string;
    default?: unknown;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    items?: JsonSchema | JsonSchema[];
    enum?: unknown[];
}

export interface McpTool {
    name: string;
    description?: string;
    inputSchema: JsonSchema;
}

/**
 * Model Context Protocol (MCP) Server Configuration parameters.
 */
export interface MCPServerConfig {
    name: string;
    enabled: boolean;
    transport: "sse" | "http" | "stdio";
    command: string;
    env?: Record<string, string>;
    headers?: Record<string, string>;
    reconnect?: {
        maxRetries?: number;
        backoffMs?: number;
    };
}

/**
 * Interface for building MCP transports.
 */
export interface IMCPTransportFactory {
    createTransport(config: MCPServerConfig): Transport;
}

/**
 * Factory class that constructs the appropriate MCP transport.
 */
export class MCPTransportFactory implements IMCPTransportFactory {
    /**
     * Constructs the appropriate client transport based on server config.
     * @param {MCPServerConfig} config The server configuration.
     * @return {Transport} The constructed MCP client transport.
     */
    createTransport(config: MCPServerConfig): Transport {
        const headers = config.headers || {};

        switch (config.transport) {
        case "sse": {
            const url = new URL(config.command);
            return new SSEClientTransport(url, {
                requestInit: {headers},
                eventSourceInit: {headers} as Record<string, unknown>,
            });
        }
        case "http": {
            const url = new URL(config.command);
            return new StreamableHTTPClientTransport(url, {
                requestInit: {headers},
            });
        }
        case "stdio": {
            const childEnv: Record<string, string> = {};
            for (const [k, v] of Object.entries(process.env)) {
                if (v !== undefined) {
                    childEnv[k] = v;
                }
            }
            if (config.env) {
                for (const [k, v] of Object.entries(config.env)) {
                    childEnv[k] = String(v);
                }
            }
            return new StdioClientTransport({
                command: "sh",
                args: ["-c", config.command],
                env: childEnv,
            });
        }
        default:
            throw new Error(
                `Unsupported MCP transport type: ${config.transport}`,
            );
        }
    }
}

/**
 * Recursively convert a JSON Schema property to a Zod schema property.
 * @param {JsonSchema} prop The JSON Schema property.
 * @return {z.ZodTypeAny} The converted Zod schema.
 */
function convertProperty(prop: JsonSchema): z.ZodTypeAny {
    if (!prop) {
        return z.any();
    }

    let type = prop.type;
    if (Array.isArray(type)) {
        type = type.find((t) => t !== "null") || type[0];
    }

    let zodSchema: z.ZodTypeAny;

    switch (type) {
    case "string":
        zodSchema = z.string();
        break;
    case "number":
        zodSchema = z.number();
        break;
    case "integer":
        zodSchema = z.number().int();
        break;
    case "boolean":
        zodSchema = z.boolean();
        break;
    case "array":
        if (prop.items) {
            const itemsSchema = Array.isArray(prop.items) ?
                prop.items[0] :
                prop.items;
            zodSchema = z.array(convertProperty(itemsSchema || {}));
        } else {
            zodSchema = z.array(z.any());
        }
        break;
    case "object":
        if (prop.properties) {
            const shape: Record<string, z.ZodTypeAny> = {};
            const required = new Set<string>(
                Array.isArray(prop.required) ? prop.required : [],
            );
            for (const [key, value] of Object.entries(prop.properties)) {
                let propZod = convertProperty(value);
                if (!required.has(key)) {
                    propZod = propZod.optional();
                }
                shape[key] = propZod;
            }
            zodSchema = z.object(shape);
        } else {
            zodSchema = z.record(z.string(), z.any());
        }
        break;
    default:
        if (prop.properties) {
            const shape: Record<string, z.ZodTypeAny> = {};
            const required = new Set<string>(
                Array.isArray(prop.required) ? prop.required : [],
            );
            for (const [key, value] of Object.entries(prop.properties)) {
                let propZod = convertProperty(value);
                if (!required.has(key)) {
                    propZod = propZod.optional();
                }
                shape[key] = propZod;
            }
            zodSchema = z.object(shape);
        } else {
            zodSchema = z.any();
        }
        break;
    }

    if (prop.description && typeof prop.description === "string") {
        zodSchema = zodSchema.describe(prop.description);
    }

    if (prop.default !== undefined) {
        zodSchema = zodSchema.default(prop.default);
    }

    return zodSchema;
}

/**
 * Convert MCP JSON Schema to LangChain compliant Zod Object.
 * @param {JsonSchema} schema The JSON Schema object.
 * @return {z.ZodObject<Record<string, z.ZodTypeAny>>} A ZodObject.
 */
export function jsonSchemaToZod(
    schema: JsonSchema,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
    if (!schema || typeof schema !== "object" || schema.type !== "object") {
        return z.object({});
    }

    const shape: Record<string, z.ZodTypeAny> = {};
    const required = new Set<string>(
        Array.isArray(schema.required) ? schema.required : [],
    );

    if (schema.properties) {
        for (const [key, value] of Object.entries(schema.properties)) {
            let propZod = convertProperty(value);
            if (!required.has(key)) {
                propZod = propZod.optional();
            }
            shape[key] = propZod;
        }
    }

    return z.object(shape);
}

/**
 * Interface for bridging MCP tools to LangChain tools.
 */
export interface IMCPToolBridger {
    bridge(
        serverName: string,
        clientGetter: () => Client | undefined,
        mcpTool: McpTool
    ): StructuredToolInterface;
}

/**
 * Bridges MCP tools into LangChain tools.
 */
export class MCPToolBridger implements IMCPToolBridger {
    /**
     * Bridges an MCP tool into a LangChain tool.
     * @param {string} serverName The name of the MCP server.
     * @param {function} clientGetter The dynamic MCP client getter.
     * @param {McpTool} mcpTool The raw MCP tool object.
     * @return {StructuredToolInterface} The bridged LangChain tool.
     */
    bridge(
        serverName: string,
        clientGetter: () => Client | undefined,
        mcpTool: McpTool,
    ): StructuredToolInterface {
        // Sanitize names to match target schema format ^[a-zA-Z0-9_-]{1,64}$
        const sanitizedServerName = serverName.replace(/[^a-zA-Z0-9_-]/g, "_");
        const sanitizedToolName = mcpTool.name.replace(/[^a-zA-Z0-9_-]/g, "_");

        let name = `mcp_${sanitizedServerName}_${sanitizedToolName}`;
        if (name.length > 64) {
            name = name.substring(0, 64);
        }

        const description = `[${name}] ${mcpTool.description || ""}`;
        const zodSchema = jsonSchemaToZod(mcpTool.inputSchema);

        interface McpCallResultContent {
            type: string;
            text?: string;
            data?: string;
        }

        interface McpCallResult {
            isError?: boolean;
            content?: McpCallResultContent[];
        }

        const callFn = async (args: Record<string, unknown>) => {
            try {
                const client = clientGetter();
                if (!client) {
                    throw new Error(
                        `MCP client for server "${serverName}" ` +
                        "is not connected",
                    );
                }
                const result = await client.callTool({
                    name: mcpTool.name,
                    arguments: args,
                });

                const callResult = result as unknown as McpCallResult;

                if (callResult.isError) {
                    const errorMsg = (callResult.content || [])
                        .filter((c: McpCallResultContent) => c.type === "text")
                        .map((c: McpCallResultContent) => c.text)
                        .join(" ");
                    throw new Error(`MCP tool error: ${errorMsg}`);
                }

                if (
                    Array.isArray(callResult.content) &&
                    callResult.content.length === 1 &&
                    callResult.content[0] &&
                    callResult.content[0].type === "text"
                ) {
                    return callResult.content[0].text;
                }

                const formattedResult: Record<string, string> = {};
                if (Array.isArray(callResult.content)) {
                    callResult.content.forEach(
                        (content: McpCallResultContent, index: number) => {
                            if (
                                content.type === "text" &&
                                content.text !== undefined
                            ) {
                                formattedResult[`text_${index}`] = content.text;
                            } else if (
                                content.type === "image" &&
                                content.data !== undefined
                            ) {
                                formattedResult[`image_${index}`] =
                                    content.data;
                            }
                        },
                    );
                }
                return JSON.stringify(formattedResult);
            } catch (err: unknown) {
                const message = err instanceof Error ?
                    err.message :
                    String(err);
                throw new Error(
                    `Failed to call MCP tool ${mcpTool.name}: ${message}`,
                );
            }
        };

        return tool(callFn, {
            name,
            description,
            schema: zodSchema,
        });
    }
}

/**
 * The orchestrator class managing MCP server connections and lifecycle.
 */
export class MCPManager {
    private sessions = new Map<string, Client>();
    private cachedTools = new Map<string, StructuredToolInterface[]>();
    private serverConfigs = new Map<string, MCPServerConfig>();
    private reconnectStates = new Map<
        string,
        {
            retryCount: number;
            timer?: NodeJS.Timeout;
            isReconnecting: boolean;
        }
    >();
    private isShuttingDown = false;

    private transportFactory: IMCPTransportFactory;
    private toolBridger: IMCPToolBridger;

    /**
     * Constructs a new MCPManager.
     * @param {IMCPTransportFactory} transportFactory The transport factory.
     * @param {IMCPToolBridger} toolBridger The tool bridger.
     */
    constructor(
        transportFactory: IMCPTransportFactory,
        toolBridger: IMCPToolBridger,
    ) {
        this.transportFactory = transportFactory;
        this.toolBridger = toolBridger;
    }

    /**
     * Start connections to all configured servers.
     * @param {MCPServerConfig[]} configs The configurations of the
     * MCP servers to start.
     * @return {Promise<void>}
     */
    async startAll(configs: MCPServerConfig[]): Promise<void> {
        this.isShuttingDown = false;
        for (const config of configs) {
            if (!config.enabled) {
                continue;
            }
            try {
                await this.startServer(config);
            } catch (err) {
                console.error(
                    `[MCP Manager] Failed to start server ${config.name}:`,
                    err,
                );
            }
        }
    }

    /**
     * Start a single MCP server connection.
     * @param {MCPServerConfig} config The server configuration.
     * @return {Promise<void>}
     */
    async startServer(config: MCPServerConfig): Promise<void> {
        this.serverConfigs.set(config.name, config);
        if (!this.reconnectStates.has(config.name)) {
            this.reconnectStates.set(config.name, {
                retryCount: 0,
                isReconnecting: false,
            });
        }

        console.info(
            `[MCP Manager] Connecting to server "${config.name}" ` +
            `via "${config.transport}"...`,
        );
        const client = new Client(
            {
                name: "Yuri-MCP-Client",
                version: "1.0.0",
            },
            {
                capabilities: {},
            },
        );

        const transport = this.transportFactory.createTransport(config);
        await client.connect(transport);

        client.onclose = () => {
            console.warn(
                `[MCP Manager] Server "${config.name}" connection closed`,
            );
            this.handleDisconnection(config.name);
        };

        client.onerror = (err) => {
            console.error(
                `[MCP Manager] Server "${config.name}" connection error:`,
                err,
            );
        };

        interface ListToolsResult {
            tools: McpTool[];
        }

        // Wait for the server to be ready and populate tools list
        let ready = false;
        let listResult: ListToolsResult | null = null;
        for (let i = 0; i < 10; i++) {
            try {
                listResult = (
                    await client.listTools()
                ) as unknown as ListToolsResult;
                ready = true;
                break;
            } catch {
                console.debug(
                    `[MCP Manager] Server ${config.name} not ready yet, ` +
                    `retrying... (${i + 1}/10)`,
                );
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        }

        if (!ready || !listResult) {
            console.warn(
                `[MCP Manager] Server "${config.name}" ` +
                "did not become ready within timeout",
            );
            listResult = {tools: []};
        }

        // Reset retry count on successful connection
        const state = this.reconnectStates.get(config.name);
        if (state) {
            state.retryCount = 0;
            state.isReconnecting = false;
        }

        // Bridge tools only if they haven't been bridged and cached yet
        if (!this.cachedTools.has(config.name)) {
            const bridged = (listResult.tools || []).map((t: McpTool) =>
                this.toolBridger.bridge(
                    config.name,
                    () => this.sessions.get(config.name),
                    t,
                ),
            );
            this.cachedTools.set(config.name, bridged);
        }

        this.sessions.set(config.name, client);
        console.info(
            `[MCP Manager] Server "${config.name}" connected and ` +
            "ready with " +
            `${this.cachedTools.get(config.name)?.length || 0} tools`,
        );
    }

    /**
     * Handle connection closure by scheduling reconnection.
     * @param {string} serverName The name of the server that disconnected.
     */
    private handleDisconnection(serverName: string): void {
        if (this.isShuttingDown) {
            return;
        }

        const config = this.serverConfigs.get(serverName);
        if (!config) {
            return;
        }

        const state = this.reconnectStates.get(serverName);
        if (!state || state.isReconnecting) {
            return;
        }

        const maxRetries = config.reconnect?.maxRetries ?? 5;
        const backoffMs = config.reconnect?.backoffMs ?? 2000;

        if (state.retryCount >= maxRetries) {
            console.error(
                `[MCP Manager] Server "${serverName}" reached max ` +
                `reconnection attempts (${maxRetries}). ` +
                "Stopping reconnection.",
            );
            return;
        }

        state.isReconnecting = true;
        state.retryCount += 1;
        const delay = backoffMs * state.retryCount;

        console.info(
            "[MCP Manager] Scheduling reconnection for " +
            `server "${serverName}" ` +
            `in ${delay}ms (attempt ${state.retryCount}/${maxRetries})...`,
        );

        if (state.timer) {
            clearTimeout(state.timer);
        }

        state.timer = setTimeout(async () => {
            try {
                console.info(
                    `[MCP Manager] Reconnecting to server "${serverName}"...`,
                );
                const oldClient = this.sessions.get(serverName);
                if (oldClient) {
                    try {
                        await oldClient.close();
                    } catch {
                        // ignore
                    }
                    this.sessions.delete(serverName);
                }

                await this.startServer(config);
                console.info(
                    "[MCP Manager] Successfully reconnected to " +
                    `server "${serverName}"`,
                );
            } catch (err) {
                console.error(
                    `[MCP Manager] Reconnection attempt ${state.retryCount} ` +
                    `for server "${serverName}" failed:`,
                    err,
                );
                state.isReconnecting = false;
                this.handleDisconnection(serverName);
            }
        }, delay);
    }

    /**
     * Stop all active MCP sessions.
     * @return {Promise<void>}
     */
    async stopAll(): Promise<void> {
        this.isShuttingDown = true;
        console.info(
            "[MCP Manager] Stopping active sessions " +
            `(count: ${this.sessions.size})...`,
        );

        for (const [, state] of this.reconnectStates.entries()) {
            if (state.timer) {
                clearTimeout(state.timer);
            }
        }
        this.reconnectStates.clear();

        for (const [name, client] of this.sessions.entries()) {
            try {
                await client.close();
                console.info(`[MCP Manager] Server "${name}" stopped`);
            } catch (err) {
                console.error(
                    `[MCP Manager] Error closing session for "${name}":`,
                    err,
                );
            }
        }
        this.sessions.clear();
        this.cachedTools.clear();
        this.serverConfigs.clear();
    }

    /**
     * Get all currently bridged MCP tools.
     * @return {StructuredToolInterface[]} The bridged tools.
     */
    getTools(): StructuredToolInterface[] {
        const allTools: StructuredToolInterface[] = [];
        for (const tools of this.cachedTools.values()) {
            allTools.push(...tools);
        }
        return allTools;
    }
}

let managerInstance: MCPManager | null = null;

/**
 * Returns the global singleton instance of MCPManager.
 * @return {MCPManager} The MCPManager singleton.
 */
export function useMCPManager(): MCPManager {
    if (!managerInstance) {
        const transportFactory = new MCPTransportFactory();
        const toolBridger = new MCPToolBridger();
        managerInstance = new MCPManager(transportFactory, toolBridger);
    }
    return managerInstance;
}
