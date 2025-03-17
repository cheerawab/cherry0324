import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { loadWarnings } from '../../feature/warnings.js';
import Logger from '../../feature/errorhandle/logger.js';

const logger = new Logger();

export const data = new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View a user\'s warning records')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to check warnings for')
            .setRequired(true))

/**
 * Executes the /warnings command to retrieve a user's warning history.
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object representing the command execution.
 */
export const execute = async (interaction) => {
    try {
        const user = interaction.options.getUser('user');
        const warnings = await loadWarnings(); // Ensure the warnings data is loaded asynchronously

        logger.info(`Checking warnings for user ID: ${user.id}`);
        logger.info(`Loaded warnings data: ${JSON.stringify(warnings, null, 2)}`);

        // Check if the user has any warnings
        if (!warnings[user.id] || warnings[user.id].length === 0) {
            return interaction.reply({ content: `✅ **${user.username}** has no warning records.`, ephemeral: true });
        }

        // Format the warning messages
        const warningMessages = warnings[user.id]
            .map((warn, index) => `**${index + 1}.** 📌 **Category:** ${warn.violation}\n📜 **Reason:** ${warn.reason} *(Recorded on ${new Date(warn.timestamp).toLocaleString()} )*`)
            .join('\n');

        // Reply with the user's warning records
        await interaction.reply({
            content: `⚠️ **${user.username}**'s warning records:\n${warningMessages}`,
            ephemeral: true
        });
    } catch (error) {
        logger.error(`❌ Command execution error (/warnings): ${error}`);
        await interaction.reply({ content: '❌ Unable to execute the command. Please try again later.', ephemeral: true });
    }
};