import { SlashCommandBuilder } from "discord.js";
import Logger from "../../feature/errorhandle/logger.js";

const logger = new Logger();

/**
 * Defines the command data.
 */
export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the bot latency time.');

/**
 * Executes the ping command.
 * @param {import('discord.js').CommandInteraction} interaction - The Discord command interaction object.
 */
export const execute = async (interaction) => {
    try {
        await interaction.reply({ content: '✅ Command executed successfully!', flags: 64 });
        logger.info("Ping command executed successfully.");
    } catch (error) {
        logger.error(`❌ Error executing ping command: ${error.message}`);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ An error occurred while executing the command!', flags: 64 });
        } else {
            await interaction.followUp({ content: '❌ An error occurred while executing the command!', flags: 64 });
        }
    }
};