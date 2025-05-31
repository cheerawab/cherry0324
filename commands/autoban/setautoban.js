import { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } from 'discord.js';
import { loadAutoBanConfig, saveAutoBanConfig } from '../../feature/autoban.js';
import Logger from '../../feature/errorhandle/logger.js';

const logger = new Logger();

export const data = new SlashCommandBuilder()
    .setName('設定自動停權')
    .setDescription('設定自動停權在指定頻道')
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('要設定自動停權的頻道')
            .setRequired(true));

export const execute = async (interaction) => {
    try {
        await interaction.deferReply({ flags: 64 });

        if (!interaction.memberPermissions || 
            !interaction.memberPermissions.has(PermissionsBitField.Flags.BanMembers)) {
            return await interaction.editReply('❌ 你沒有管理頻道的權限!');
        }

        const channel = interaction.options.getChannel('channel');
        
        const autoBanConfig = loadAutoBanConfig();
        autoBanConfig[channel.id] = true;
        saveAutoBanConfig(autoBanConfig);
        
        logger.info(`🚨 自動停權已在 ${channel.name} 啟用.`);
        
        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🚨 自動停權作用中!')
            .setDescription(`不要在此頻道傳送任何訊息，否則將會被停權.`)
            .setFooter({ text: '此頻道是用來偵測被盜的帳號炸群用的.' });
        
        await channel.send({ embeds: [embed] });
        await interaction.editReply(`✅ 已在 ${channel.name} 啟用自動停權. Users who send messages in this channel will be automatically banned.`);
    } catch (error) {
        logger.error(`❌ Error executing autoban command: ${error.message}`);
        await interaction.editReply('❌ An error occurred, please try again later!');
    }
};
