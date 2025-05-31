import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { loadWarnings, saveWarnings } from '../../feature/warnings.js';
import Logger from '../../feature/errorhandle/logger.js';

const logger = new Logger();

export const data = new SlashCommandBuilder()
    .setName('警告')
    .setDescription('向違規用戶發出警告')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('違規的用戶')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('violation')
            .setDescription('違規類別')
            .setRequired(true)
            .addChoices(
                { name: '一般違規', value: '一般違規' },
                { name: 'NSFW 違規', value: 'NSFW 違規' },
                { name: '政治話題', value: '政治話題' },
                { name: '非法廣告', value: '非法廣告' },
                { name: '洗版', value: '洗版' },
                { name: '嚴重違規 (釣魚/騷擾)', value: '嚴重違規 (釣魚/騷擾)' }
            ))
    .addStringOption(option =>
        option.setName('reason')
            .setDescription('原因')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

/**
 * Executes the /warn command to issue a warning to a user.
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object representing the command execution.
 */
export const execute = async (interaction) => {
    try {
        const user = interaction.options.getUser('user');
        const violation = interaction.options.getString('violation');
        const reason = interaction.options.getString('reason');

        if (user.bot) {
            return interaction.reply({ content: '❌ 你有沒有考慮直接踢掉它，因為你不能警告機器人.', ephemeral: true });
        }

        // 確保載入最新的警告數據
        const warnings = await loadWarnings();
        logger.info(`📂 已載入警告資料： ${JSON.stringify(warnings, null, 2)}`);

        // 確保 warnings[user.id] 是數組
        if (!Array.isArray(warnings[user.id])) {
            warnings[user.id] = [];
        }

        // 追加新警告
        const newWarning = {
            violation,
            reason,
            timestamp: new Date().toISOString(),
        };
        warnings[user.id].push(newWarning);

        // 確保儲存時不覆蓋舊數據
        await saveWarnings(warnings);
        logger.info(`✅ 已為用戶 ${user.id} 新增警告：${JSON.stringify(newWarning)}`);

        await interaction.reply({
            content: `⚠️ **${user.username}** 已被警告！\n📌 **違規類別：** ${violation}\n📜 **原因：** ${reason}\n📂 **記錄時間：** ${new Date().toLocaleString()}`,
            ephemeral: true
        });

    } catch (error) {
        logger.error(`❌ 執行 /warn 指令時出錯：${error}`);
        await interaction.reply({ content: '❌ 無法執行該指令。請稍後重試。', ephemeral: true });
    }
};