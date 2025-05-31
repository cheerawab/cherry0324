import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { loadWarnings, saveWarnings } from '../../feature/warnings.js';
import Logger from '../../feature/errorhandle/logger.js';

const logger = new Logger();

export const data = new SlashCommandBuilder()
    .setName('清除警告')
    .setDescription('清除用戶最近的警告')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('要被清除警告的用戶')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

/**
 * Executes the /clearwarnings command to remove the latest warning from a user.
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object representing the command execution.
 */
export const execute = async (interaction) => {
    try {
        const user = interaction.options.getUser('user');
        logger.info(`🔍 嘗試清除使用者 ID：${user.id} 的警告`);

        // Load warnings data
        const warnings = await loadWarnings();
        logger.info(`📂 已載入警告資料： ${JSON.stringify(warnings, null, 2)}`);

        // Check if the user has warnings
        if (!warnings[user.id] || warnings[user.id].length === 0) {
            logger.warn(`⚠️ 未發現針對使用者 ID 的警告： ${user.id}`);
            return interaction.reply({ content: `✅ **${user.username}** 沒有可以清除的警告`, ephemeral: true });
        }

        // Remove the most recent warning
        const removedWarning = warnings[user.id].pop();
        logger.info(`🗑️ 刪除警告： ${JSON.stringify(removedWarning)}`);

        // Save updated warnings data
        await saveWarnings(warnings);
        logger.info(`✅ 已成功更新使用者：${user.id} 的警告`);

        // Reply to the interaction
        await interaction.reply({
            content: `🗑️ 已清除 **${user.username}** 最近的一則警告：\n📌 **類別：** ${removedWarning.violation}\n📜 **原因：** ${removedWarning.reason} *(記錄於 ${new Date(removedWarning.timestamp).toLocaleString()})*`,
            ephemeral: true
        });
    } catch (error) {
        logger.error(`❌ 執行指令時出錯 ${error}`);
        await interaction.reply({ content: '❌ 無法執行該指令。請稍後重試', ephemeral: true });
    }
};