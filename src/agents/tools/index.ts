import {
    type StructuredToolInterface,
} from "@langchain/core/tools";

import {
    currentTimeTool,
} from "./time.ts";
import {
    isEnabled as isTavilyEnabled,
    tavilySearchTool,
} from "./tavily.ts";

export const baseTools: StructuredToolInterface[] = [
    currentTimeTool,
];
if (isTavilyEnabled) {
    baseTools.push(tavilySearchTool);
}

export const baseToolMap: Record<
    string, StructuredToolInterface
> = Object.fromEntries(
    baseTools.map((toolImpl) => [toolImpl.name, toolImpl]),
);

// Backward compatibility aliases
export const tools = baseTools;
export const toolMap = baseToolMap;
