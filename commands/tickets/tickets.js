import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('新增客服單面板')
  .setDescription('開啟一個新的客服單面板在當前頻道')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_report')
      .setLabel('🛠️ 舉報違規')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('ticket_coop')
      .setLabel('🤝 合作申請')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('ticket_apply')
      .setLabel('🔨 應徵職務')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('ticket_rewards')
      .setLabel('🎁⭐ 獎勵／兌換申請')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('ticket_others')
      .setLabel('其他問題')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    content: '📩 請選擇您要開啟的 Ticket 類別：',
    components: [row]
  });
}
