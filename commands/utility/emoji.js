import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import axios from 'axios';

export const data = new SlashCommandBuilder()
    .setName('表符')
    .setDescription('從任何伺服器下載並發送表情符號')
    .addStringOption(option =>
        option.setName('emoji')
            .setDescription('要處理的表情符號')
            .setRequired(true)
    );

export async function execute(interaction) {
    const emojiInput = interaction.options.getString('emoji');
    const emojiMatch = emojiInput.match(/<a?:\w+:(\d+)>/);
    if (!emojiMatch) return interaction.reply('請提供有效的自訂表情符號！');

    const emojiId = emojiMatch[1];
    const isAnimated = emojiInput.startsWith('<a:');
    const fileExtension = isAnimated ? 'gif' : 'png';
    const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${fileExtension}`;
    const filename = `emoji_${emojiId}.${fileExtension}`;

    try {
        const response = await axios.get(emojiUrl, { responseType: 'arraybuffer' });
        fs.writeFileSync(filename, response.data);
        await interaction.reply({ content: `這是您要求的表情符號：`, files: [filename] });
        fs.unlinkSync(filename);
    } catch (error) {
        console.error(error);
        await interaction.reply('處理表情符號時發生錯誤');
    }
}