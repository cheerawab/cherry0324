import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { loadWarnings, saveWarnings } from '../../feature/warnings.js';
import Logger from '../../feature/errorhandle/logger.js';

const logger = new Logger();

export const data = new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a violating user')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to be warned')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('violation')
            .setDescription('Violation type')
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
            .setDescription('Reason for the warning')
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
            return interaction.reply({ content: '❌ Cannot warn a bot.', ephemeral: true });
        }

        // 確保載入最新的警告數據
        const warnings = await loadWarnings();
        logger.info(`📂 Loaded warnings data: ${JSON.stringify(warnings, null, 2)}`);

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
        logger.info(`✅ Warning added for user ${user.id}: ${JSON.stringify(newWarning)}`);

        await interaction.reply({
            content: `⚠️ **${user.username}** has been warned!\n📌 **Violation Type**: ${violation}\n📜 **Reason**: ${reason}\n📂 **Recorded Time**: ${new Date().toLocaleString()}`,
            ephemeral: true
        });

    } catch (error) {
        logger.error(`❌ Command execution error (/warn): ${error}`);
        await interaction.reply({ content: '❌ Unable to execute the command. Please try again later.', ephemeral: true });
    }
};