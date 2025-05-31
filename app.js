import { readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'node:url';
import path, { dirname } from 'node:path';
import { Client, Partials, Events, Collection, GatewayIntentBits, ActivityType, ImportantGatewayOpcodes } from 'discord.js';
import dotenv from 'dotenv';
import schedule from 'node-schedule';
import { loadDeleteSchedule, saveDeleteSchedule } from './feature/deleteschedule.js';
import Logger from './feature/errorhandle/logger.js';
import { execute as messageCreateHandler } from './events/messageCreate.js';
import { execute as interactionCreateHandler } from './events/interaction/interactionCreate.js';

dotenv.config();
const logger = new Logger();

/**
 * 初始化 Discord 用戶端，包含必要的 intents 與 partials。
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
 * 用來儲存機器人指令的 Collection。
 * @type {Collection<string, any>}
 */
client.commands = new Collection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = readdirSync(foldersPath).filter(folder => statSync(path.join(foldersPath, folder)).isDirectory());

/**
 * 載入並註冊機器人指令。
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
                    logger.info(`指令已載入：${command.data.name}`);
                } else {
                    logger.warn(`[警告] ${filePath} 的指令缺少 "data" 或 "execute" 屬性。`);
                }
            })
            .catch(error => logger.error(`[錯誤] 載入指令 ${filePath} 失敗：`, error));
    }
}

// Event listeners
client.on(Events.MessageCreate, messageCreateHandler);

client.on(Events.InteractionCreate, interactionCreateHandler);

/**
 * 根據儲存的資料排程頻道刪除。
 */
function scheduleDeletions() {
    const deleteSchedule = loadDeleteSchedule();
    const now = new Date();
    logger.info('開始執行排程刪除程序...');
    for (const [channelId, deleteDate] of Object.entries(deleteSchedule)) {
        const deleteTime = new Date(deleteDate);
        if (deleteTime <= now) {
            logger.info(`立即刪除頻道 ${channelId}。`);
            deleteChannel(channelId);
            delete deleteSchedule[channelId];
            saveDeleteSchedule(deleteSchedule);
        } else {
            logger.info(`已排程頻道 ${channelId} 將於 ${deleteTime} 刪除。`);
            schedule.scheduleJob(deleteTime, () => {
                deleteChannel(channelId);
                delete deleteSchedule[channelId];
                saveDeleteSchedule(deleteSchedule);
            });
        }
    }
}

/**
 * 依頻道 ID 刪除 Discord 頻道。
 * @param {string} channelId - 要刪除的頻道 ID。
 */
async function deleteChannel(channelId) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (channel) {
            await channel.delete();
            logger.info(`已刪除頻道：${channel.name}`);
        } else {
            logger.warn(`頻道 ${channelId} 不存在或已被刪除。`);
        }
    } catch (err) {
        logger.error(`頻道刪除失敗（ID: ${channelId}）：${err}`);
    }
}

// Client ready event
client.once(Events.ClientReady, c => {
    logger.info(`✅ 機器人已啟動，登入身份：${c.user.tag}`);
    client.user.setPresence({ status: 'dnd' });
    client.user.setActivity('音之幻想', { type: ActivityType.Listening });
    scheduleDeletions();
    schedule.scheduleJob('0 0 * * *', () => {
        logger.info('🔄 執行每日頻道刪除排程...');
        scheduleDeletions();
    });
});

// 錯誤處理
process.on('uncaughtException', error => logger.error('未捕獲例外：', error));
process.on('unhandledRejection', (reason, promise) => logger.error('未處理的 Promise 拒絕：', promise, '原因：', reason));

// 增加最大監聽器數量
process.setMaxListeners(20);

// 機器人登入
client.login(process.env.DISCORD_TOKEN).catch(error => logger.error('登入失敗：', error));