import fs from 'fs';
import path from 'path';
import Logger from '../../feature/errorhandle/logger.js';
import { handleButtonInteraction } from '../ButtonReact.js';

const logger = new Logger();
const allowedFilePath = path.resolve('./events/interaction/allowed.json');
const allowedCommands = JSON.parse(fs.readFileSync(allowedFilePath, 'utf8'));
const envVariables = process.env;

export const name = 'interactionCreate';

/**
 * Handles interaction events, including command execution and channel restrictions.
 * @param {import('discord.js').Interaction} interaction - The interaction object.
 */
export const execute = async (interaction) => {
    if (interaction.isButton()) {
        // Delegate button interactions to the ButtonReact handler
        await handleButtonInteraction(interaction);
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const commandName = interaction.commandName;
    const commandConfig = allowedCommands[commandName];

    if (!commandConfig) {
        logger.warn(`⚠️ Command "${commandName}" is not defined in allowed.json.`);
        return;
    }

    // Check if the command is whitelisted
    if (commandConfig.whitelist) {
        logger.info(`✅ Command "${commandName}" is whitelisted and can be executed anywhere.`);
    } else {
        // Check if the command is restricted to a specific channel
        const envKey = commandConfig.env;
        const allowedChannelId = envVariables[envKey];

        if (!allowedChannelId) {
            logger.error(`❌ Environment variable "${envKey}" is not defined for command "${commandName}".`);
            await interaction.reply({
                content: `❌ This command is restricted, but the allowed channel is not configured.`,
                ephemeral: true,
            });
            return;
        }

        if (interaction.channelId !== allowedChannelId) {
            logger.warn(`❌ Command "${commandName}" is restricted to channel <#${allowedChannelId}>.`);
            await interaction.reply({
                content: `❌ This command can only be used in the designated channel: <#${allowedChannelId}>.`,
                ephemeral: true,
            });
            return;
        }

        logger.info(`✅ Command "${commandName}" is allowed in channel <#${allowedChannelId}>.`);
    }

    // Execute the command
    const command = interaction.client.commands.get(commandName);
    if (!command) {
        logger.error(`❌ No command matching "${commandName}" found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error(`❌ Command execution error for "${commandName}":`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ An error occurred while executing this command.', ephemeral: true });
        } else {
            await interaction.followUp({ content: '❌ An error occurred while executing this command.', ephemeral: true });
        }
    }
};