import {z} from "zod";

import {
    tool,
} from "@langchain/core/tools";

import {
    TavilyClient,
} from "tavily";

const {TAVILY_API_KEY: tavilyApiKey} = process.env;

const tavilyClient = tavilyApiKey ?
    new TavilyClient({apiKey: tavilyApiKey}) :
    null;

export const isEnabled = !!tavilyClient;

const tavilyDescription = [
    "Use Tavily web search to retrieve up-to-date information",
    "about the real world. Great for news, facts, and citations.",
].join(" ");

export const tavilySearchTool = tool(
    async ({
        query,
        depth = "basic",
        includeAnswer = true,
        maxResults = 5,
    }) => {
        if (!tavilyClient) {
            throw new Error(
                "Missing TAVILY_API_KEY environment variable.",
            );
        }

        const response = await tavilyClient.search({
            query,
            search_depth: depth,
            include_answer: includeAnswer,
            max_results: maxResults,
        });

        return JSON.stringify({
            answer: response.answer,
            sources: response.results.slice(0, maxResults).map((result) => ({
                title: result.title,
                url: result.url,
                content: result.content,
            })),
        });
    },
    {
        name: "tavily_search",
        description: tavilyDescription,
        schema: z.object({
            query: z
                .string()
                .min(1, "Query is required.")
                .describe("The query to search for."),
            depth: z.enum(["basic", "advanced"]).default("basic"),
            includeAnswer: z.boolean().default(true),
            maxResults: z.number().int().min(1).max(10).default(5),
        }),
    },
);

export default tavilySearchTool;
