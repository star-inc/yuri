// openai is a client for the OpenAI API

import {readFileSync} from "node:fs";

import {
    AIMessage,
    HumanMessage,
    type BaseMessage,
} from "@langchain/core/messages";

import {createReActAgent, type AgentState} from "../agents/react.ts";

const {
    OPENAI_BASE_URL: baseUrl,
    OPENAI_API_KEY: apiKey,
    OPENAI_CHAT_MODEL: chatModel,
    OPENAI_TEMPERATURE: rawTemperature,
} = process.env;

if (!apiKey || !chatModel) {
    throw new Error(
        "Missing OPENAI_API_KEY or OPENAI_CHAT_MODEL environment variables",
    );
}

// TS narrows the env vars above,
// but across functions the types are still string | undefined.
// Use explicitly-typed constants to satisfy the agent's required string types.
const resolvedApiKey: string = apiKey;
const resolvedChatModel: string = chatModel;

const parsedTemperature = rawTemperature !== undefined ?
    Number(rawTemperature) :
    undefined;
const temperature = parsedTemperature !== undefined &&
        Number.isFinite(parsedTemperature) ?
    parsedTemperature :
    undefined;

const avatarSettingsUrl = new URL("../../settings.txt", import.meta.url);
const avatarSettingsContent = readFileSync(avatarSettingsUrl, "utf-8").trim();

const MAX_HISTORY_MESSAGES = 40;
const chatHistoryMapper = new Map<string, BaseMessage[]>();

/**
 * Trim message history to avoid unbounded growth.
 * @param {BaseMessage[]} messages The message history.
 * @return {BaseMessage[]} The trimmed history.
 */
function trimMessages(messages: BaseMessage[]): BaseMessage[] {
    if (messages.length <= MAX_HISTORY_MESSAGES) {
        return messages;
    }

    return messages.slice(messages.length - MAX_HISTORY_MESSAGES);
}

/**
 * Extract a textual response from a LangChain message.
 * @param {BaseMessage} message The message to stringify.
 * @return {string} The textual content.
 */
function extractMessageText(message: BaseMessage): string {
    if (typeof message.content === "string") {
        return message.content;
    }

    if (Array.isArray(message.content)) {
        return message.content
            .map((block) => {
                if (typeof block === "string") {
                    return block;
                }

                if (
                    typeof block === "object" &&
                    block !== null &&
                    "text" in block
                ) {
                    const maybeText = block as {text?: string};
                    return maybeText.text ?? "";
                }

                return "";
            })
            .filter((text) => Boolean(text && text.trim().length))
            .join("\n")
            .trim();
    }

    return String(message.content ?? "");
}

/**
 * Chat with the AI via the LangGraph ReAct agent.
 * @param {string} chatId The chat ID to chat with the AI
 * @param {string} prompt The prompt to chat with the AI
 * @return {Promise<string>} The response from the AI
 */
export async function chatWithAI(
    chatId: string,
    prompt: string,
): Promise<string> {
    if (!chatHistoryMapper.has(chatId)) {
        chatHistoryMapper.set(chatId, []);
    }

    const agent = createReActAgent({
        model: resolvedChatModel,
        apiKey: resolvedApiKey,
        baseURL: baseUrl,
        temperature,
        systemPrompt: avatarSettingsContent,
    });

    const chatHistory = chatHistoryMapper.get(chatId)!;
    const userMessage = new HumanMessage(prompt);
    const result = await agent.invoke({
        messages: [...chatHistory, userMessage],
    }) as AgentState;

    const updatedMessages = result.messages ?? [];
    const trimmedHistory = trimMessages(updatedMessages);
    chatHistoryMapper.set(chatId, trimmedHistory);

    const replyMessage = [...updatedMessages]
        .reverse()
        .find((message) => message instanceof AIMessage);
    const replyText = replyMessage ?
        extractMessageText(replyMessage).trim() :
        "";

    const reply = replyText ||
        "I'm speechless at the moment, please try again later.";

    return reply;
}
