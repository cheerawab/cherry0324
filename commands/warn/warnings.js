import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { loadWarnings } from '../../feature/warnings.js';
import Logger from '../../feature/errorhandle/logger.js';

const logger = new Logger();

export const data = new SlashCommandBuilder()
    .setName('查看警告')
    .setDescription('查看使用者的警告記錄')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('要被查看的人')
            .setRequired(true))

/**
 * Executes the /warnings command to retrieve a user's warning history.
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object representing the command execution.
 */
export const execute = async (interaction) => {
    try {
        const user = interaction.options.getUser('user');
        const warnings = await loadWarnings(); // Ensure the warnings data is loaded asynchronously

        logger.info(`正在檢查使用者 ID：${user.id} 的警告`);
        logger.info(`已載入警告資料：${JSON.stringify(warnings, null, 2)}`);

        // Check if the user has any warnings
        if (!warnings[user.id] || warnings[user.id].length === 0) {
            return interaction.reply({ content: `✅ **${user.username}** 沒有任何警告記錄。`, ephemeral: true });
        }

        // Format the warning messages
        const warningMessages = warnings[user.id]
            .map((warn, index) => `**${index + 1}.** 📌 **類別：** ${warn.violation}\n📜 **原因：** ${warn.reason} *(記錄於 ${new Date(warn.timestamp).toLocaleString()} )*`)
            .join('\n');

        // Reply with the user's warning records
        await interaction.reply({
            content: `⚠️ **${user.username}** 的警告記錄：\n${warningMessages}`,
            ephemeral: true
        });
    } catch (error) {
        logger.error(`❌ 執行 /warnings 指令時出錯：${error}`);
        await interaction.reply({ content: '❌ 無法執行該指令。請稍後重試。', ephemeral: true });
    }
};