import { Events } from 'discord.js';
import { isAutoBanEnabled } from '../feature/autoban.js';
import { askGeminiAI } from '../feature/askgemini.js';
import { handleAutoResponse } from '../feature/autoresponses/autoresponses.js'; // 引入自動回應模組
import fs from 'fs';
import path from 'path';
import Logger from '../feature/errorhandle/logger.js';

const logger = new Logger();
const aiThreadsFile = path.resolve('/app/data/aiThreads.json');
const messageQueue = new Map();

/**
 * 檢查是否為 AI 創建的討論串
 * @param {string} threadId - 討論串 ID
 * @returns {boolean} - 如果是 AI 討論串則回傳 true
 */
function isAIThread(threadId) {
    if (!fs.existsSync(aiThreadsFile)) return false;
    const data = JSON.parse(fs.readFileSync(aiThreadsFile, 'utf8'));
    return data.threads.includes(threadId);
}

export const name = Events.MessageCreate;

/**
 * 監聽訊息事件，處理 AI 回應、自動封鎖、自動回應
 * @param {import('discord.js').Message} message - Discord 訊息物件
 */
export const execute = async (message) => {
    if (message.author.bot) return; // 忽略機器人訊息

    // AI 討論串回應
    if (message.channel.isThread()) {
        if (!isAIThread(message.channel.id)) {
            logger.info(`❌ 忽略非 AI 討論串：「${message.channel.name}」`);
            return;
        }

        const threadId = message.channel.id;
        const userId = message.author.id;
        const userName = message.member?.displayName || message.author.username;
        const question = message.content?.trim();

        if (!question) return;

        if (!messageQueue.has(threadId)) {
            messageQueue.set(threadId, []);
        }

        const queue = messageQueue.get(threadId);

        return new Promise((resolve) => {
            queue.push(async () => {
                try {
                    logger.info(`📩 收到 AI 討論訊息 (Thread: ${threadId}, User: ${userName}): ${question}`);
                    const thinkingMessage = await message.channel.send(`🤔 思考中...`);
                    const reply = await askGeminiAI(threadId, userId, userName, question);
                    await thinkingMessage.edit(reply);
                } catch (error) {
                    logger.error(`❌ AI API 回應錯誤 (Thread: ${threadId}): ${error.message}`);
                } finally {
                    queue.shift();
                    if (queue.length > 0) {
                        queue[0]();
                    }
                    resolve();
                }
            });

            if (queue.length === 1) {
                queue[0]();
            }
        });
    }

    // 自動封鎖 (AutoBan)
    try {
        if (isAutoBanEnabled(message.channel.id)) {
            await message.member.ban({ reason: 'AutoBan: 禁止在此頻道發言。' });
            await message.channel.send(`🚨 ${message.author.username} 已被封鎖，因為在 AutoBan 頻道發送訊息。`);
            logger.info(`🔨 用戶 ${message.author.tag} 在 ${message.channel.name} 發言，被自動封鎖。`);
            return;
        }
    } catch (error) {
        logger.error(`❌ AutoBan 發生錯誤: ${error.message}`);
    }

    // **自動回應處理**
    const responded = await handleAutoResponse(message);
    if (responded) return; // 如果已經有回應，就不繼續執行
};