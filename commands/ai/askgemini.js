import Logger from '../../feature/errorhandle/logger.js';
import { askGeminiAI } from '../../feature/askgemini/askgemini.js';
import { SlashCommandBuilder, ChannelType } from 'discord.js';
import fs from 'fs';
import path from 'path';

const logger = new Logger();
const aiThreadsFile = path.resolve('/app/data/aiThreads.json');

/**
 * Adds a thread ID to the AI thread tracking file.
 * @param {string} threadId - The ID of the created thread.
 */
function addAIThread(threadId) {
    try {
        let data = { threads: [] };
        if (fs.existsSync(aiThreadsFile)) {
            data = JSON.parse(fs.readFileSync(aiThreadsFile, 'utf8'));
        }
        if (!data.threads.includes(threadId)) {
            data.threads.push(threadId);
            fs.writeFileSync(aiThreadsFile, JSON.stringify(data, null, 2), 'utf8');
            logger.info(`✅ 已記錄 AI 對話串：${threadId}`);
        }
    } catch (error) {
        logger.error(`❌ 記錄 AI 對話串失敗：${error.message}`);
    }
}

export const data = new SlashCommandBuilder()
    .setName('和希海說話')
    .setDescription('誒誒，又有什麼有趣的事要跟我說嗎?');

/**
 * Executes the command to create a private AI conversation thread.
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object.
 */
export const execute = async (interaction) => {
    await interaction.deferReply({ flags: 64 }); // Ensures the response is only visible to the user.

    try {
        const threadName = `AI Chat - ${interaction.user.username}`;

        const thread = await interaction.channel.threads.create({
            name: threadName,
            autoArchiveDuration: 60,
            type: ChannelType.PrivateThread,
            invitable: false
        });

        await thread.members.add(interaction.user.id);
        addAIThread(thread.id);

        await interaction.editReply(`✅ 已建立私人對話串：${thread.url}。快來找我聊天吧！`);
        logger.info(`🆕 已為用戶 ${interaction.user.username} 建立私人 AI 對話串：${thread.id}`);
    } catch (error) {
        logger.error(`❌ 建立私人對話串時發生錯誤：${error.message}`);
        await interaction.editReply('❌ 建立私人對話失敗，請稍後再試一次。');
    }
};
