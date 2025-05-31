import fs from 'fs';
import path from 'path';
import Logger from '../../feature/errorhandle/logger.js';
import { handleButtonInteraction } from '../ButtonReact.js';

const logger = new Logger();
const allowedFilePath = path.resolve('./events/interaction/allowed.json');
const allowedCommands = JSON.parse(fs.readFileSync(allowedFilePath, 'utf8'));
const envVariables = process.env;

export const name = 'interactionCreate';

/**
 * Handles interaction events, including command execution and channel restrictions.
 * @param {import('discord.js').Interaction} interaction - The interaction object.
 */
export const execute = async (interaction) => {
    if (interaction.isButton()) {
        // Delegate button interactions to the ButtonReact handler
        await handleButtonInteraction(interaction);
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const commandName = interaction.commandName;
    const commandConfig = allowedCommands[commandName];

    if (!commandConfig) {
        logger.warn(`⚠️ 指令 "${commandName}" 未在 allowed.json 中定義。`);
        return;
    }

    // Check if the command is whitelisted
    if (commandConfig.whitelist) {
        logger.info(`✅ 指令 "${commandName}" 已列入白名單，可在任何地方執行。`);
    } else {
        // Check if the command is restricted to a specific channel
        const envKey = commandConfig.env;
        const allowedChannelId = envVariables[envKey];

        if (!allowedChannelId) {
            logger.error(`❌ 指令 "${commandName}" 的環境變數 "${envKey}" 未定義。`);
            await interaction.reply({
                content: `❌ 此指令有限制，但允許的頻道尚未設定。`,
                ephemeral: true,
            });
            return;
        }

        if (interaction.channelId !== allowedChannelId) {
            logger.warn(`❌ 指令 "${commandName}" 僅限於頻道 <#${allowedChannelId}> 使用。`);
            await interaction.reply({
                content: `❌ 此指令只能在指定頻道 <#${allowedChannelId}> 使用。`,
                ephemeral: true,
            });
            return;
        }

        logger.info(`✅ 指令 "${commandName}" 已允許於頻道 <#${allowedChannelId}>。`);
    }

    // Execute the command
    const command = interaction.client.commands.get(commandName);
    if (!command) {
        logger.error(`❌ 找不到名稱為 "${commandName}" 的指令。`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error(`❌ 執行指令 "${commandName}" 時發生錯誤:`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ 執行此指令時發生錯誤。', ephemeral: true });
        } else {
            await interaction.followUp({ content: '❌ 執行此指令時發生錯誤。', ephemeral: true });
        }
    }
};