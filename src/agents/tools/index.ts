import {
    type StructuredToolInterface,
} from "@langchain/core/tools";

import {
    currentTimeTool,
} from "./time.ts";

export const baseTools: StructuredToolInterface[] = [
    currentTimeTool,
];

export const baseToolMap: Record<
    string, StructuredToolInterface
> = {
    [currentTimeTool.name]: currentTimeTool,
};

// Backward compatibility aliases
export const tools = baseTools;
export const toolMap = baseToolMap;
