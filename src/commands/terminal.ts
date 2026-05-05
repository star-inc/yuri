import {exec} from "node:child_process";
import {promisify} from "node:util";

import {
    ChatInputCommandInteraction,
    ApplicationCommandOptionType,
    type Snowflake,
} from "discord.js";

import {
    sliceContent,
    type CommandConfig,
} from "../clients/discord.ts";

/**
 * Now command configuration.
 * @type {object}
 */
export const now: CommandConfig = {
    description: "Get the current time",
    action: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        await interaction.reply(
            `The current time is:\n${new Date().toLocaleString()}`,
        );
    },
};

/**
 * User ID command configuration.
 * @type {object}
 */
export const userId: CommandConfig = {
    description: "Get user ID",
    action: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        await interaction.reply(
            "Your Discord User ID:\n"+
            `${interaction.user.tag}\n`+
            `\`${interaction.user.id}\``,
        );
    },
};

/**
 * Run Shell Command configuration.
 * @type {object}
 */
export const shellCommand: CommandConfig = {
    description: "Execute a shell command and return the result",
    options: [
        {
            name: "command",
            description: "Shell command to execute",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    action: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const command = interaction.options.getString("command", true);

        // Security check: verify the executor's identity
        const botOwnerId = process.env.DISCORD_BOT_OWNER_ID as
            Snowflake | undefined;
        if (!botOwnerId || interaction.user.id !== botOwnerId) {
            await interaction.reply({
                content: "You do not have permission to execute this command.",
                ephemeral: true,
            });
            return;
        }

        try {
            const execAsync = promisify(exec);

            await interaction.deferReply();
            const {stdout, stderr} =
                await execAsync(command, {
                    timeout: 10000,
                    maxBuffer: 1024 * 1024,
                });

            await interaction.editReply("Execution complete");

            if (stdout) {
                const partialStdout = sliceContent(stdout, 1990);
                for (const snippet of partialStdout) {
                    const message =
                        `Standard Output:\n\`\`\`\n${snippet}\n\`\`\`\n`;
                    await interaction.followUp(message);
                }
            }
            if (stderr) {
                const partialStderr = sliceContent(stderr, 1990);
                for (const snippet of partialStderr) {
                    const message =
                        `Error Output:\n\`\`\`\n${snippet}\n\`\`\`\n`;
                    await interaction.followUp(message);
                }
            }
        } catch (error) {
            const content = (error as Error).message;
            const message = `Execution failed:\n\`\`\`\n${content}\n\`\`\``;
            await interaction.editReply(message);
        }
    },
};
