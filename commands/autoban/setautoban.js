import { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } from 'discord.js';
import { loadAutoBanConfig, saveAutoBanConfig } from '../../feature/autoban.js';
import Logger from '../../feature/errorhandle/logger.js';

const logger = new Logger();

export const data = new SlashCommandBuilder()
    .setName('autoban')
    .setDescription('Sets a channel for automatic banning')
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('The channel where users will be automatically banned if they send messages')
            .setRequired(true));

export const execute = async (interaction) => {
    try {
        await interaction.deferReply({ flags: 64 });

        if (!interaction.memberPermissions || 
            !interaction.memberPermissions.has(PermissionsBitField.Flags.BanMembers)) {
            return await interaction.editReply('❌ You do not have permission to manage channels!');
        }

        const channel = interaction.options.getChannel('channel');
        
        const autoBanConfig = loadAutoBanConfig();
        autoBanConfig[channel.id] = true;
        saveAutoBanConfig(autoBanConfig);
        
        logger.info(`🚨 AutoBan enabled for channel ${channel.name}.`);
        
        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🚨 AutoBan Activated')
            .setDescription(`This channel has been set for AutoBan. Any user sending messages here will be automatically banned.`)
            .setFooter({ text: 'Be cautious while using this channel.' });
        
        await channel.send({ embeds: [embed] });
        await interaction.editReply(`✅ AutoBan has been enabled for ${channel.name}. Users who send messages in this channel will be automatically banned.`);
    } catch (error) {
        logger.error(`❌ Error executing autoban command: ${error.message}`);
        await interaction.editReply('❌ An error occurred, please try again later!');
    }
};
