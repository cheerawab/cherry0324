import { SlashCommandBuilder , PermissionsBitField} from 'discord.js';
import { loadDeleteSchedule, saveDeleteSchedule } from '../../feature/deleteschedule.js';
import Logger from '../../feature/errorhandle/logger.js';

const logger = new Logger();

/**
 * Defines the command data.
 */
export const data = new SlashCommandBuilder()
    .setName('刪除頻道')
    .setDescription('設定頻道的刪除時間')
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('要被刪除的頻道')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('date')
            .setDescription('要被刪除的時間 (YYYY/MM/DD)')
            .setRequired(true));

/**
 * Executes the command to schedule channel deletion.
 * @param {import('discord.js').CommandInteraction} interaction - The Discord command interaction object.
 */
export const execute = async (interaction) => {
    try {
        await interaction.deferReply({ flags: 64 });

        // Check permissions
        if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionsBitField.Flags?.ManageChannels)) {
            return await interaction.editReply('❌ 疑，你沒權限耶!');
        }

        // Retrieve channel and date
        const channel = interaction.options.getChannel('channel');
        const date = interaction.options.getString('date');

        const deleteDate = new Date(date);
        if (isNaN(deleteDate.getTime())) {
            return await interaction.editReply('❌ 疑?這是個無效的日期耶，請使用 YYYY/MM/DD');
        }

        // Update delete schedule
        const deleteSchedule = loadDeleteSchedule();
        deleteSchedule[channel.id] = deleteDate.toISOString();
        saveDeleteSchedule(deleteSchedule);
        
        logger.info(`📅 頻道 ${channel.name} 計劃於 ${date} 刪除。`);
        await interaction.editReply(`🕒 頻道 ${channel.name} 將於 ${date} 刪除！`);
    } catch (error) {
        logger.error(`❌ 執行刪除頻道指令時出錯：${error.message}`);
        await interaction.editReply('❌ 誒，發生了點問題耶');
    }
};