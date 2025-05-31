import {
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} from 'discord.js';
import { createTranscript } from 'discord-html-transcripts';

const ticketCategoryMap = {
  report: '舉報違規',
  coop: '合作申請',
  apply: '應徵職務',
  rewards: '獎勵／兌換申請',
  others: '其他問題'
};

// 將 SUPPORT_ROLE_ID 解析為陣列
const supportRoleIds = process.env.SUPPORT_ROLE_ID.split(',').map(id => id.trim());

/**
 * 建立新的客服單頻道。
 *
 * @param {Object} interaction - Discord 的互動物件。
 * @param {string} customId - 代表客服單類別的 custom ID。
 * @param {string} Label - 客服單按鈕的標籤。
 */
export async function createTicket(interaction, customId, Label) {
  const guild = interaction.guild;
  const member = interaction.member;
  const botId = guild.members.me.id;

  const category = ticketCategoryMap[customId] || '未分類';
  const channelName = `客服單-${member.user.username}-${category}`.toLowerCase();

  // Check if a ticket of the same type already exists
  const existing = guild.channels.cache.find(ch => ch.name === channelName);
  if (existing) {
    return interaction.followUp({ content: '你已經開啟了這類型的客服單。', flags: 64 });
  }

  // 設定權限覆寫
  const permissionOverwrites = [
    {
      id: guild.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    {
      id: member.id,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
    },
    {
      id: botId,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
    },
  ];

  // 為每個 supportRoleId 添加權限覆寫
  supportRoleIds.forEach(roleId => {
    permissionOverwrites.push({
      id: roleId,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
    });
  });

  // Create a new ticket channel
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    permissionOverwrites,
  });

  // Add a close button to the ticket
  const closeButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('🔒 關閉客服單')
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: `🎫 ${member} 的 **${category}** 客服單已建立，請詳細描述您的問題，${supportRoleIds.map(id => `<@&${id}>`).join(' ')} 會協助您。`,
    components: [closeButton],
  });
}

/**
 * 關閉現有的客服單頻道。
 *
 * @param {Object} interaction - Discord 的互動物件。
 */
export async function closeTicket(interaction) {
  const channel = interaction.channel;
  const guild = interaction.guild;
  const openerId = interaction.user.id;

  // Set permission overwrites: deny sending messages but allow viewing
  await channel.permissionOverwrites.edit(openerId, {
    SendMessages: false,
    ViewChannel: true,
  });

  // 為每個 supportRoleId 設定權限覆寫
  for (const roleId of supportRoleIds) {
    await channel.permissionOverwrites.edit(roleId, {
      SendMessages: false,
      ViewChannel: true,
    });
  }

  await channel.permissionOverwrites.edit(guild.roles.everyone, {
    ViewChannel: false,
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
    content: '🔒 此客服單已關閉，若需重新開啟請點擊下方按鈕。',
    components: [controlRow],
  });
}

/**
 * 重新開啟已關閉的客服單頻道。
 *
 * @param {Object} interaction - Discord 的互動物件。
 */
export async function reopenTicket(interaction) {
  const channel = interaction.channel;

  const opener = channel.permissionOverwrites.cache.find(
    perm => perm.type === 1 && perm.deny.has(PermissionsBitField.Flags.SendMessages)
  );

  const overwrites = [];

  // Restore permissions for the ticket opener
  if (opener) {
    overwrites.push({
      id: opener.id,
      allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
    });
  }

  // Restore permissions for each support role
  supportRoleIds.forEach(roleId => {
    overwrites.push({
      id: roleId,
      allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
    });
  });

  // Apply updated permissions
  for (const overwrite of overwrites) {
    await channel.permissionOverwrites.edit(overwrite.id, {
      SendMessages: true,
      ViewChannel: true,
    });
  }

  await interaction.followUp({
    content: '🔓 客服單已重新開啟，可以繼續對話。',
  });
}

/**
 * 刪除客服單頻道。
 *
 * @param {Object} interaction - Discord 的互動物件。
 */
export async function deleteTicket(interaction) {
  const channel = interaction.channel;
  const logChannelId = process.env.TICKET_LOG_CHANNEL_ID;
  const logChannel = interaction.client.channels.cache.get(logChannelId);
  let logSent = false;

  try {
    // 使用 discord-html-transcripts 生成聊天記錄
    const transcript = await createTranscript(channel, {
      limit: -1,
      returnBuffer: true,
      fileName: `${channel.name}-transcript.html`,
      saveImages: true, // 保存圖片
    });

    // 模擬 JSON 資料
    const ticketData = {
      ticketName: channel.name,
      createdBy: interaction.user.tag,
      createdAt: channel.createdAt,
      category: 'Example Category',
    };

    // 將 JSON 資料轉為 Buffer
    const jsonBuffer = Buffer.from(JSON.stringify(ticketData, null, 2), 'utf-8');

    // 將聊天記錄和 JSON 資料發送到日誌頻道
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({
        content: `🗂️ 客服單紀錄：\`${channel.name}\``,
        files: [
          transcript, // 聊天記錄
          { attachment: jsonBuffer, name: `${channel.name}-data.json` }, // JSON 資料
        ],
      });
      logSent = true;
    }
  } catch (err) {
    console.error('❌ 發送客服單紀錄時發生錯誤：', err);
  }

  // 發送回覆給用戶
  await interaction.followUp({
    content: logSent
      ? '📁 客服單紀錄已備份並發送，頻道即將刪除。'
      : '⚠️ 無法發送紀錄，但仍會刪除客服單。',
    flags: 64,
  });

  // 刪除 Ticket 頻道
  await channel.delete().catch(console.error);
}