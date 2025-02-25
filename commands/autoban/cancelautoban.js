import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { loadAutoBanConfig, saveAutoBanConfig } from '../../feature/autoban.js';
import Logger from '../../feature/errorhandle/logger.js';

const logger = new Logger();

export const data = new SlashCommandBuilder()
    .setName('cancelautoban')
    .setDescription('Cancels AutoBan for a specific channel')
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('The channel to remove from AutoBan')
            .setRequired(true));

export const execute = async (interaction) => {
    try {
        await interaction.deferReply({ flags: 64 });

        if (!interaction.memberPermissions || 
            !interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return await interaction.editReply('❌ You do not have permission to manage channels!');
        }

        const channel = interaction.options.getChannel('channel');
        
        const autoBanConfig = loadAutoBanConfig();
        
        if (!autoBanConfig[channel.id]) {
            return await interaction.editReply(`⚠️ AutoBan is not enabled for ${channel.name}.`);
        }

        delete autoBanConfig[channel.id];
        saveAutoBanConfig(autoBanConfig);
        
        // 查找並刪除 AutoBan 訊息
        const messages = await channel.messages.fetch({ limit: 50 });
        const autoBanMessage = messages.find(m => m.embeds.length > 0 && m.embeds[0].title === '🚨 AutoBan Activated');
        if (autoBanMessage) {
            await autoBanMessage.delete();
        }
        
        logger.info(`🚫 AutoBan disabled for channel ${channel.name}.`);
        await interaction.editReply(`✅ AutoBan has been disabled for ${channel.name}.`);
    } catch (error) {
        logger.error(`❌ Error executing cancelautoban command: ${error.message}`);
        await interaction.editReply('❌ An error occurred, please try again later!');
    }
};
