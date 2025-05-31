import { Events } from 'discord.js';
import { isAutoBanEnabled } from '../feature/autoban.js';
import { askGeminiAI } from '../feature/askgemini/askgemini.js';
import { handleAutoResponse as handleKeywordResponse } from '../feature/autoresponses/autoresponses.js';
import { handleAutoResponse as handleAutoEmojiResponse } from '../feature/autoemoji.js';
import fs from 'fs';
import path from 'path';
import Logger from '../feature/errorhandle/logger.js';

const logger = new Logger();
const aiThreadsFile = path.resolve('/app/data/aiThreads.json');
const messageQueue = new Map();

/**
 * Checks if a thread was created by the AI.
 * @param {string} threadId - The thread ID.
 * @returns {boolean} - True if the thread was created by the AI, otherwise false.
 */
function isAIThread(threadId) {
    if (!fs.existsSync(aiThreadsFile)) return false;
    const data = JSON.parse(fs.readFileSync(aiThreadsFile, 'utf8'));
    return data.threads.includes(threadId);
}

export const name = Events.MessageCreate;

/**
 * Listens for message events, handling AI responses, auto-ban enforcement, and auto-replies.
 * @param {import('discord.js').Message} message - The Discord message object.
 */
export const execute = async (message) => {
    if (message.author.bot) return; // Ignore bot messages

    // AI Thread Response
    if (message.channel.isThread()) {
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
                    logger.info(`📩 收到 AI 對話訊息（串：${threadId}，用戶：${userName}）：${question}`);
                    const thinkingMessage = await message.channel.send(`🤔 思考中...`);
                    const reply = await askGeminiAI(threadId, userId, userName, question, message);
                    await thinkingMessage.edit(reply);
                } catch (error) {
                    logger.error(`❌ AI API 回應錯誤（串：${threadId}）：${error.message}`);
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

    // AutoBan Enforcement
    try {
        if (isAutoBanEnabled(message.channel.id)) {
            await message.member.ban({ reason: '自動封鎖：在受限頻道發送訊息。' });
            await message.channel.send(`🚨 ${message.author.username} 因在自動封鎖頻道發言已被封鎖。`);
            logger.info(`🔨 用戶 ${message.author.tag} 因在 ${message.channel.name} 發言被封鎖。`);
            return;
        }
    } catch (error) {
        logger.error(`❌ 處理自動封鎖時發生錯誤：${error.message}`);
    }

    // Auto-response handling
    const emojiResponded = await handleAutoEmojiResponse(message); // 處理表情符號回應
    if (emojiResponded) return;

    const keywordResponded = await handleKeywordResponse(message); // 處理關鍵字回應
    if (keywordResponded) return;
};