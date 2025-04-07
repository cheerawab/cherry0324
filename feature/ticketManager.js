import {
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

const ticketCategoryMap = {
  report: '舉報違規',
  coop: '合作申請',
  job: '應徵職務',
  rewards: '獎勵／兌換申請',
  others: '其他問題'
};

/**
 * Creates a new ticket channel for the user.
 *
 * @param {Object} interaction - The interaction object from Discord.
 * @param {string} customId - The custom ID representing the ticket category.
 */
export async function createTicket(interaction, customId) {
  const guild = interaction.guild;
  const member = interaction.member;
  const botId = guild.members.me.id;
  const supportRoleId = process.env.SUPPORT_ROLE_ID;

  const category = ticketCategoryMap[customId] || '未分類';
  const channelName = `ticket-${member.user.username}-${customId}`.toLowerCase();

  // Check if a ticket of the same type already exists
  const existing = guild.channels.cache.find(ch => ch.name === channelName);
  if (existing) {
    return interaction.followUp({ content: '你已經開啟了這類型的 Ticket。', flags: 64 });
  }

  // Create a new ticket channel
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: member.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
      },
      {
        id: supportRoleId,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
      },
      {
        id: botId,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
      }
    ]
  });

  // Add a close button to the ticket
  const closeButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('🔒 關閉 Ticket')
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: `🎫 ${member} 的 **${category}** Ticket 已建立，請詳細描述您的問題。`,
    components: [closeButton]
  });
}

/**
 * Closes an existing ticket channel.
 *
 * @param {Object} interaction - The interaction object from Discord.
 */
export async function closeTicket(interaction) {
  const channel = interaction.channel;
  const guild = interaction.guild;
  const opener = channel.permissionOverwrites.cache.find(perm => perm.allow.has(PermissionsBitField.Flags.SendMessages) && perm.type === 1);
  const supportRoleId = process.env.SUPPORT_ROLE_ID;

  const overwrites = [];

  // Update permissions for the ticket opener
  if (opener) {
    overwrites.push({
      id: opener.id,
      deny: [PermissionsBitField.Flags.SendMessages],
      allow: [PermissionsBitField.Flags.ViewChannel]
    });
  }

  // Update permissions for the support role
  if (supportRoleId) {
    overwrites.push({
      id: supportRoleId,
      deny: [PermissionsBitField.Flags.SendMessages],
      allow: [PermissionsBitField.Flags.ViewChannel]
    });
  }

  // Restrict everyone from viewing the channel
  await channel.permissionOverwrites.edit(guild.roles.everyone, {
    ViewChannel: false
  });

  // Apply updated permissions
  for (const overwrite of overwrites) {
    await channel.permissionOverwrites.edit(overwrite.id, {
      SendMessages: overwrite.deny.includes(PermissionsBitField.Flags.SendMessages) ? 0 : null,
      ViewChannel: true
    });
  }

  // Add reopen and delete buttons
  const controlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_reopen')
      .setLabel('🔓 重新開啟 Ticket')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('ticket_delete')
      .setLabel('🗑️ 刪除 Ticket')
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.followUp({
    content: '🔒 此 Ticket 已關閉，若需重新開啟請點擊下方按鈕。',
    components: [controlRow]
  });
}

/**
 * Reopens a closed ticket channel.
 *
 * @param {Object} interaction - The interaction object from Discord.
 */
export async function reopenTicket(interaction) {
  const channel = interaction.channel;
  const guild = interaction.guild;
  const supportRoleId = process.env.SUPPORT_ROLE_ID;

  const opener = channel.permissionOverwrites.cache.find(
    perm => perm.type === 1 && perm.deny.has(PermissionsBitField.Flags.SendMessages)
  );

  const overwrites = [];

  // Restore permissions for the ticket opener
  if (opener) {
    overwrites.push({
      id: opener.id,
      allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel]
    });
  }

  // Restore permissions for the support role
  if (supportRoleId) {
    overwrites.push({
      id: supportRoleId,
      allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel]
    });
  }

  // Apply updated permissions
  for (const overwrite of overwrites) {
    await channel.permissionOverwrites.edit(overwrite.id, {
      SendMessages: true,
      ViewChannel: true
    });
  }

  await interaction.followUp({
    content: '🔓 Ticket 已重新開啟，可以繼續對話。'
  });
}

/**
 * Deletes a ticket channel.
 *
 * @param {Object} interaction - The interaction object from Discord.
 */
export async function deleteTicket(interaction) {
  await interaction.followUp({ content: '🗑️ Ticket 已刪除。', flags: 64 });

  await interaction.channel.delete().catch(console.error);
}