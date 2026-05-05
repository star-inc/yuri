import {z} from "zod";

import {
    tool,
} from "@langchain/core/tools";

const LOCAL_TIME_ZONE = new Intl.DateTimeFormat().resolvedOptions().timeZone;
const DEFAULT_LOCALE = "zh-TW";
const FALLBACK_LOCALE = "en-US";

/**
 * Resolve a locale string to a valid Intl locale.
 * @param {string | undefined} maybeLocale The user provided locale.
 * @return {string} A valid locale identifier.
 */
function resolveLocale(maybeLocale?: string): string {
    const targetLocale = maybeLocale?.trim() || DEFAULT_LOCALE;
    try {
        return new Intl.DateTimeFormat(targetLocale).resolvedOptions().locale;
    } catch {
        return new Intl.DateTimeFormat(FALLBACK_LOCALE)
            .resolvedOptions().locale;
    }
}

/**
 * Resolve an IANA timezone string.
 * @param {string | undefined} maybeZone The user provided timezone.
 * @return {string} A valid timezone identifier.
 */
function resolveTimeZone(maybeZone?: string): string {
    const targetZone = maybeZone?.trim() || LOCAL_TIME_ZONE;
    try {
        return new Intl.DateTimeFormat("en-US", {timeZone: targetZone})
            .resolvedOptions().timeZone;
    } catch {
        return LOCAL_TIME_ZONE;
    }
}

export const currentTimeTool = tool(
    async ({
        locale = DEFAULT_LOCALE,
        timeZone,
    }) => {
        const now = new Date();
        const resolvedLocale = resolveLocale(locale);
        const resolvedZone = resolveTimeZone(timeZone);
        const formatter = new Intl.DateTimeFormat(resolvedLocale, {
            dateStyle: "full",
            timeStyle: "long",
            timeZone: resolvedZone,
        });

        return JSON.stringify({
            iso: now.toISOString(),
            epochMs: now.getTime(),
            formatted: formatter.format(now),
            locale: resolvedLocale,
            timeZone: resolvedZone,
        });
    },
    {
        name: "current_time",
        description:
            "Retrieves the current date and time. Use before referencing " +
            "schedules, deadlines, or timestamps.",
        schema: z.object({
            locale: z
                .string()
                .optional()
                .describe("BCP-47 locale tag, e.g. zh-TW or en-US."),
            timeZone: z
                .string()
                .optional()
                .describe("IANA timezone, e.g. Asia/Taipei."),
        }),
    },
);

export default currentTimeTool;
