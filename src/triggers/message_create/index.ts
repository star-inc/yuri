import * as discordjs from "discord.js";
import {client} from "../../clients/discord.ts";
import {chatWithAI} from "../../clients/openai.ts";

type Message = discordjs.Message;

/**
 * Message create event handler.
 * @param {Message} message The message object
 * @return {Promise<void>}
 */
export default async (message: Message): Promise<void> => {
    if (
        message.author.id === client.user?.id ||
        (message.guild && !message.mentions.users.has(client.user?.id ?? ""))
    ) {
        return;
    }

    if ("sendTyping" in message.channel) {
        await message.channel.sendTyping?.();
    }

    const {content: inputContent} = message;
    if (!inputContent) {
        await message.reply("= = What are you doing? Please speak clearly!");
        return;
    }

    let referencedContent = "";
    if (message.reference) {
        const referencedMessage = await message.channel.messages.fetch(
            message.reference.messageId ?? "",
        );
        referencedContent = referencedMessage?.content ?? "";
    }

    let requestContent = "";
    if (referencedContent) {
        requestContent += `<referencedContent>
            ${referencedContent}
        </referencedContent>`;
    }
    requestContent += `<inputContent>
        ${inputContent}
    </inputContent>`;

    const responseContent = await chatWithAI(
        message.channel.id,
        requestContent,
    );
    if (!responseContent) {
        await message.reply("= = I'm a bit busy right now, can we chat later?");
        return;
    }

    await message.reply(responseContent);
};
