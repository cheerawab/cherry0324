import { SlashCommandBuilder , PermissionsBitField} from 'discord.js';
import { loadDeleteSchedule } from '../../feature/deleteschedule.js';
import Logger from '../../feature/errorhandle/logger.js';

const logger = new Logger();

/**
 * Defines the command data.
 */
export const data = new SlashCommandBuilder()
    .setName('showdeleteschedule')
    .setDescription('Displays the scheduled deletion times for channels.');

/**
 * Executes the command to display scheduled channel deletions.
 * @param {import('discord.js').CommandInteraction} interaction - The Discord command interaction object.
 */
export const execute = async (interaction) => {
    try {
        await interaction.deferReply({ flags: 64 });

        if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionsBitField.Flags?.ManageChannels)) {
            return await interaction.editReply('❌ You do not have permission to delete channels!');
        }

        // Load delete schedule
        const deleteSchedule = loadDeleteSchedule();
        
        if (Object.keys(deleteSchedule).length === 0) {
            return await interaction.editReply('📭 No channels are currently scheduled for deletion.');
        }

        let response = '📅 **Scheduled Channel Deletions:**\n';
        for (const [channelId, date] of Object.entries(deleteSchedule)) {
            response += `🔹 <#${channelId}> - **${new Date(date).toDateString()}**\n`;
        }

        logger.info('📜 Displaying delete schedule.');
        await interaction.editReply(response);
    } catch (error) {
        logger.error(`❌ Error executing showdeleteschedule command: ${error.message}`);
        await interaction.editReply('❌ An error occurred, please try again later!');
    }
};
