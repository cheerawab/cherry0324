import {
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
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
  const openerId = interaction.user.id;
  const supportRoleId = process.env.SUPPORT_ROLE_ID;

  // Set permission overwrites: deny sending messages but allow viewing
  await channel.permissionOverwrites.edit(openerId, {
    SendMessages: false,
    ViewChannel: true
  });

  if (supportRoleId) {
    await channel.permissionOverwrites.edit(supportRoleId, {
      SendMessages: false,
      ViewChannel: true
    });
  }

  await channel.permissionOverwrites.edit(guild.roles.everyone, {
    ViewChannel: false
  });

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
  const channel = interaction.channel;
  const logChannelId = process.env.TICKET_LOG_CHANNEL_ID;
  const logChannel = interaction.client.channels.cache.get(logChannelId);
  let logSent = false;

  try {
    // Get all messages in the channel
    const messages = await fetchAllMessages(channel);

    const formatted = messages.map(msg => ({
      id: msg.id,
      author: {
        id: msg.author.id,
        username: msg.author.username,
        tag: msg.author.tag,
      },
      content: msg.content,
      timestamp: msg.createdAt,
      attachments: msg.attachments.map(a => a.url),
    }));

    // Format the date for the filename
    const now = new Date();
    const created = channel.createdAt || now;

    const startDate = formatDate(created);
    const endDate = formatDate(now);

    const parts = channel.name.split('-');
    const username = parts[1] || 'unknown';
    const categoryKey = parts[2] || 'others';
    const categoryName = ticketCategoryMap[categoryKey] || '未分類';

    const fileName = `${startDate} - ${endDate} ticket - ${username} - ${categoryName}.json`;
    const jsonBuffer = Buffer.from(JSON.stringify(formatted, null, 2));
    const file = new AttachmentBuilder(jsonBuffer, { name: fileName });

    // Send the log file to the log channel
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({
        content: `🗂️ Ticket 紀錄：\`${startDate} - ${endDate} ticket - ${username} - ${categoryName}\``,
        files: [file],
      });
      logSent = true;
    }
  } catch (err) {
    console.error('❌ 發送 ticket 紀錄時發生錯誤：', err);
  }

  // Send a follow-up message to the user
  await interaction.followUp({
    content: logSent
      ? '📁 Ticket 紀錄已備份並發送，頻道即將刪除。'
      : '⚠️ 無法發送紀錄，但仍會刪除 Ticket。',
    flags: 64
  });

  // Delete the ticket channel
  await channel.delete().catch(console.error);
}

/**
 * Format the date as mm-dd.
 *
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date.
 */
function formatDate(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Fetch all messages in a channel (recursive pagination).
 *
 * @param {Object} channel - The Discord channel object.
 * @returns {Array} An array of messages.
 */
async function fetchAllMessages(channel) {
  let messages = [];
  let lastId;

  while (true) {
    const fetched = await channel.messages.fetch({ limit: 100, before: lastId });
    if (fetched.size === 0) break;

    messages.push(...fetched.values());
    lastId = fetched.last().id;
  }

  messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  return messages;
}