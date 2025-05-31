import { SlashCommandBuilder , PermissionsBitField} from 'discord.js';
import { loadDeleteSchedule, saveDeleteSchedule } from '../../feature/deleteschedule.js';
import Logger from '../../feature/errorhandle/logger.js';

const logger = new Logger();

/**
 * Defines the command data.
 */
export const data = new SlashCommandBuilder()
    .setName('移除排程')
    .setDescription('取消頻道刪除時間')
    .addChannelOption(option =>
        option.setName('頻道')
            .setDescription('選擇要取消刪除的頻道')
            .setRequired(true));

/**
 * Executes the command to cancel a scheduled channel deletion.
 * @param {import('discord.js').CommandInteraction} interaction - The Discord command interaction object.
 */
export const execute = async (interaction) => {
    try {
        await interaction.deferReply({ flags: 64 });

        // Check permissions
        if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionsBitField.Flags?.ManageChannels)) {
            return await interaction.editReply('❌ 疑?，你好像沒有權限耶!');
        }

        // Retrieve channel
        const channel = interaction.options.getChannel('頻道');
        
        // Load delete schedule
        const deleteSchedule = loadDeleteSchedule();
        
        // Check if the channel has a scheduled deletion
        if (!deleteSchedule[channel.id]) {
            return await interaction.editReply(`⚠️ 沒有找到 ${channel.name} 的刪除排程`);
        }

        // Remove the scheduled deletion
        delete deleteSchedule[channel.id];
        saveDeleteSchedule(deleteSchedule);
        
        logger.info(`🛑 頻道 ${channel.name} 的刪除計畫已取消!.`);
        await interaction.editReply(`✅ ${channel.name} 的刪除排程已取消!`);
    } catch (error) {
        logger.error(`❌ 發生錯誤: ${error.message}`);
        await interaction.editReply('❌ 發錯錯誤，請稍後再試!');
    }
};
