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
            logger.info(`✅ AI thread recorded: ${threadId}`);
        }
    } catch (error) {
        logger.error(`❌ Failed to record AI thread: ${error.message}`);
    }
}

export const data = new SlashCommandBuilder()
    .setName('和希海說話')
    .setDescription('Start a private conversation with 聰明版希海.');

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

        await interaction.editReply(`✅ Private conversation created: [${thread.name}](<${thread.url}>). Continue the discussion inside the thread!`);
        logger.info(`🆕 Created private AI conversation thread: ${thread.id} for user ${interaction.user.username}`);
    } catch (error) {
        logger.error(`❌ Error creating private thread: ${error.message}`);
        await interaction.editReply('❌ Failed to create a private conversation. Please try again later.');
    }
};
