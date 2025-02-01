import { readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'node:url';
import path, { dirname } from 'node:path';
import { Client, Partials, Events, Collection, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import schedule from 'node-schedule';
import { loadDeleteSchedule, saveDeleteSchedule } from './feature/deleteschedule.js';
import Logger from './feature/errorhandle/logger.js';
import { execute as messageCreateHandler } from './events/messageCreate.js';

dotenv.config();
const logger = new Logger();

/**
 * Initializes the Discord client with necessary intents and partials.
 * @type {Client}
 */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

/**
 * Collection to store bot commands.
 * @type {Collection<string, any>}
 */
client.commands = new Collection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = readdirSync(foldersPath).filter(folder => statSync(path.join(foldersPath, folder)).isDirectory());

/**
 * Loads and registers bot commands.
 */
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        import(filePath)
            .then(command => {
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    logger.info(`Command loaded: ${command.data.name}`);
                } else {
                    logger.warn(`[WARNING] Command in ${filePath} is missing "data" or "execute" attribute.`);
                }
            })
            .catch(error => logger.error(`[ERROR] Failed to load command ${filePath}:`, error));
    }
}

// Event listeners
client.on(Events.MessageCreate, messageCreateHandler);

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
        logger.error(`No command matching ${interaction.commandName} found.`);
        return;
    }

    // Check if the command is allowed in the current channel
    if (interaction.channelId !== process.env.ALLOWED_CHANNEL_ID) {
        await interaction.reply({
            content: `❌ 這個指令只能在指定頻道內使用！請前往 <#${process.env.ALLOWED_CHANNEL_ID}> 執行指令。`,
            flags: 64,
        });
        logger.warn(`❌ 指令 ${interaction.commandName} 被拒絕，因為在不允許的頻道 ${interaction.channelId} 中執行。`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error('Command execution error:', error);
        await interaction.reply({ content: 'An error occurred while executing this command!', ephemeral: true });
    }
});

/**
 * Schedules the deletion of channels based on stored data.
 */
function scheduleDeletions() {
    const deleteSchedule = loadDeleteSchedule();
    const now = new Date();
    logger.info('Starting scheduled deletion process...');
    for (const [channelId, deleteDate] of Object.entries(deleteSchedule)) {
        const deleteTime = new Date(deleteDate);
        if (deleteTime <= now) {
            logger.info(`Deleting channel ${channelId} immediately.`);
            deleteChannel(channelId);
            delete deleteSchedule[channelId];
            saveDeleteSchedule(deleteSchedule);
        } else {
            logger.info(`Scheduling channel ${channelId} for deletion at ${deleteTime}.`);
            schedule.scheduleJob(deleteTime, () => {
                deleteChannel(channelId);
                delete deleteSchedule[channelId];
                saveDeleteSchedule(deleteSchedule);
            });
        }
    }
}

/**
 * Deletes a Discord channel by its ID.
 * @param {string} channelId - The ID of the channel to be deleted.
 */
async function deleteChannel(channelId) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (channel) {
            await channel.delete();
            logger.info(`Deleted channel: ${channel.name}`);
        } else {
            logger.warn(`Channel ${channelId} does not exist or was already deleted.`);
        }
    } catch (err) {
        logger.error(`Channel deletion failed (ID: ${channelId}): ${err}`);
    }
}

// Client ready event
client.once(Events.ClientReady, c => {
    logger.info(`✅ Ready! Signed in as ${c.user.tag}`);
    client.user.setPresence({ activities: [{ name: '音度空間' }], status: 'dnd' });
    scheduleDeletions();
    schedule.scheduleJob('0 0 * * *', () => {
        logger.info('🔄 Running daily channel deletion schedule...');
        scheduleDeletions();
    });
});

// Error handling
process.on('uncaughtException', error => logger.error('Uncaught Exception:', error));
process.on('unhandledRejection', (reason, promise) => logger.error('Unhandled Rejection at:', promise, 'reason:', reason));

// Bot login
client.login(process.env.DISCORD_TOKEN).catch(error => logger.error('Failed to login:', error));