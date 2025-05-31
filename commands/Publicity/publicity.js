import { SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
    .setName('貼上文宣')
    .setDescription('在目前位置貼上文宣')
    .setContexts([0, 1, 2]);


async function execute(interaction) {
    const publicityContent = 
        "# __☾__  音之幻想  __☽__ #\n" +
        "\n" +
        "- 好似天上點點繁星，看得見卻無法擁有。\n" +
        "- 不存在於現實，宛若幻想般的世界。\n" + 
        "- 音，這個我們平常都會接觸到的事務，當它們串聯在一起時又可以從中感受到非凡。\n" +
        "\n" +
        "一起來沉浸在幻想的世界 .♡.\n" +
        "𝔂𝓲𝓷𝓱𝓾𝓪𝓷\n" +
        "𝓪 𝓱𝓸𝓹𝓮 𝓪𝓵𝔀𝓪𝔂𝓼 𝓫𝓮𝓼𝓲𝓭𝓮 𝔂𝓸𝓾\n" +
        "\n" +
        "音之幻想恭迎你的大駕 [☆](https://discord.gg/KjgWnkzYxr)";

    try {
        await interaction.reply({ content: publicityContent });

        console.log(`成功執行 /貼上文宣 指令 by ${interaction.user.tag}，發送公開訊息`);

    } catch (error) {
         console.error(`執行 /貼上文宣 指令時發生錯誤：`, error);
         if (interaction.replied || interaction.deferred) {
             await interaction.followUp({ content: '執行指令時發生錯誤！請稍後再試。', ephemeral: true });
         } else {
             await interaction.reply({ content: '執行指令時發生錯誤！請稍後再試。', ephemeral: true });
         }
    }
}

export {
    data,
    execute
};