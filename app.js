import { readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'node:url';
import path, { dirname } from 'node:path';
import { Client, Partials, Events, Collection, GatewayIntentBits, ActivityType, ImportantGatewayOpcodes } from 'discord.js';
import dotenv from 'dotenv';
import schedule from 'node-schedule';
import { loadDeleteSchedule, saveDeleteSchedule } from './feature/deleteschedule.js';
import Logger from './feature/errorhandle/logger.js';
import { execute as messageCreateHandler } from './events/messageCreate.js';
import { handleButtonInteraction } from './events/ButtonReact.js';
import { execute as interactionCreateHandler } from './events/interaction/interactionCreate.js';

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

client.on(Events.InteractionCreate, interactionCreateHandler);

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
    client.user.setPresence({ status: 'dnd' });
    client.user.setActivity('音之幻想', { type: ActivityType.Listening });
    scheduleDeletions();
    schedule.scheduleJob('0 0 * * *', () => {
        logger.info('🔄 Running daily channel deletion schedule...');
        scheduleDeletions();
    });
});

// Error handling
process.on('uncaughtException', error => logger.error('Uncaught Exception:', error));
process.on('unhandledRejection', (reason, promise) => logger.error('Unhandled Rejection at:', promise, 'reason:', reason));

// Increase the maximum number of listeners
process.setMaxListeners(20);

// Bot login
client.login(process.env.DISCORD_TOKEN).catch(error => logger.error('Failed to login:', error));