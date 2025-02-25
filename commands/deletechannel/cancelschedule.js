import { SlashCommandBuilder , PermissionsBitField} from 'discord.js';
import { loadDeleteSchedule, saveDeleteSchedule } from '../../feature/deleteschedule.js';
import Logger from '../../feature/errorhandle/logger.js';

const logger = new Logger();

/**
 * Defines the command data.
 */
export const data = new SlashCommandBuilder()
    .setName('cancelschedule')
    .setDescription('Cancels a scheduled channel deletion')
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('The channel whose deletion schedule should be canceled')
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
            return await interaction.editReply('❌ You do not have permission to manage channels!');
        }

        // Retrieve channel
        const channel = interaction.options.getChannel('channel');
        
        // Load delete schedule
        const deleteSchedule = loadDeleteSchedule();
        
        // Check if the channel has a scheduled deletion
        if (!deleteSchedule[channel.id]) {
            return await interaction.editReply(`⚠️ No scheduled deletion found for ${channel.name}.`);
        }

        // Remove the scheduled deletion
        delete deleteSchedule[channel.id];
        saveDeleteSchedule(deleteSchedule);
        
        logger.info(`🛑 Deletion schedule for channel ${channel.name} has been canceled.`);
        await interaction.editReply(`✅ The deletion schedule for ${channel.name} has been successfully canceled.`);
    } catch (error) {
        logger.error(`❌ Error executing cancelschedule command: ${error.message}`);
        await interaction.editReply('❌ An error occurred, please try again later!');
    }
};
