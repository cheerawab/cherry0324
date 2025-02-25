import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import axios from 'axios';

export const data = new SlashCommandBuilder()
    .setName('emoji')
    .setDescription('Download and send an emoji from any server')
    .addStringOption(option =>
        option.setName('emoji')
            .setDescription('The emoji to process')
            .setRequired(true)
    );

export async function execute(interaction) {
    const emojiInput = interaction.options.getString('emoji');
    const emojiMatch = emojiInput.match(/<a?:\w+:(\d+)>/);
    if (!emojiMatch) return interaction.reply('Please provide a valid custom emoji!');

    const emojiId = emojiMatch[1];
    const isAnimated = emojiInput.startsWith('<a:');
    const fileExtension = isAnimated ? 'gif' : 'png';
    const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${fileExtension}`;
    const filename = `emoji_${emojiId}.${fileExtension}`;

    try {
        const response = await axios.get(emojiUrl, { responseType: 'arraybuffer' });
        fs.writeFileSync(filename, response.data);
        await interaction.reply({ content: `Here is the emoji you requested:`, files: [filename] });
        fs.unlinkSync(filename);
    } catch (error) {
        console.error(error);
        await interaction.reply('An error occurred while processing the emoji.');
    }
}