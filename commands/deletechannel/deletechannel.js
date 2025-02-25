import { SlashCommandBuilder , PermissionsBitField} from 'discord.js';
import { loadDeleteSchedule, saveDeleteSchedule } from '../../feature/deleteschedule.js';
import Logger from '../../feature/errorhandle/logger.js';

const logger = new Logger();

/**
 * Defines the command data.
 */
export const data = new SlashCommandBuilder()
    .setName('deletechannel')
    .setDescription('Sets a channel deletion time')
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('The channel to be deleted')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('date')
            .setDescription('The deletion date (YYYY-MM-DD)')
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
            return await interaction.editReply('❌ You do not have permission to delete channels!');
        }

        // Retrieve channel and date
        const channel = interaction.options.getChannel('channel');
        const date = interaction.options.getString('date');

        const deleteDate = new Date(date);
        if (isNaN(deleteDate.getTime())) {
            return await interaction.editReply('❌ Invalid date format, please use YYYY-MM-DD');
        }

        // Update delete schedule
        const deleteSchedule = loadDeleteSchedule();
        deleteSchedule[channel.id] = deleteDate.toISOString();
        saveDeleteSchedule(deleteSchedule);
        
        logger.info(`📅 Channel ${channel.name} scheduled for deletion on ${date}.`);
        await interaction.editReply(`🕒 Channel ${channel.name} is set to be deleted on ${date}!`);
    } catch (error) {
        logger.error(`❌ Error executing deletechannel command: ${error.message}`);
        await interaction.editReply('❌ An error occurred, please try again later!');
    }
};