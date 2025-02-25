import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { loadWarnings, saveWarnings } from '../../feature/warnings.js';
import Logger from '../../feature/errorhandle/logger.js';

const logger = new Logger();

export const data = new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription('Clear the most recent warning of a user')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user whose warning will be cleared')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

/**
 * Executes the /clearwarnings command to remove the latest warning from a user.
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object representing the command execution.
 */
export const execute = async (interaction) => {
    try {
        const user = interaction.options.getUser('user');
        logger.info(`🔍 Attempting to clear warnings for user ID: ${user.id}`);

        // Load warnings data
        const warnings = await loadWarnings();
        logger.info(`📂 Loaded warnings data: ${JSON.stringify(warnings, null, 2)}`);

        // Check if the user has warnings
        if (!warnings[user.id] || warnings[user.id].length === 0) {
            logger.warn(`⚠️ No warnings found for user ID: ${user.id}`);
            return interaction.reply({ content: `✅ **${user.username}** has no warnings to clear.`, ephemeral: true });
        }

        // Remove the most recent warning
        const removedWarning = warnings[user.id].pop();
        logger.info(`🗑️ Removed warning: ${JSON.stringify(removedWarning)}`);

        // Save updated warnings data
        await saveWarnings(warnings);
        logger.info(`✅ Successfully updated warnings for user ID: ${user.id}`);

        // Reply to the interaction
        await interaction.reply({
            content: `🗑️ The most recent warning for **${user.username}** has been cleared:\n📌 **Category:** ${removedWarning.violation}\n📜 **Reason:** ${removedWarning.reason} *(Recorded on ${new Date(removedWarning.timestamp).toLocaleString()})*`,
            ephemeral: true
        });
    } catch (error) {
        logger.error(`❌ Command execution error (/clearwarnings): ${error}`);
        await interaction.reply({ content: '❌ Unable to execute the command. Please try again later.', ephemeral: true });
    }
};