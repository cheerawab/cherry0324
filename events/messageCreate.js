import { Events } from 'discord.js';
import { isAutoBanEnabled } from '../feature/autoban.js';
import { askGeminiAI } from '../feature/askgemini.js';
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
 * Handles incoming messages within AI-created threads and AutoBan channels.
 * @param {import('discord.js').Message} message - The message event.
 */
export const execute = async (message) => {
    if (message.author.bot) return;
    
    if (message.channel.isThread()) {
        // Only allow interactions within AI-recorded threads
        if (!isAIThread(message.channel.id)) {
            logger.info(`❌ Ignoring non-AI conversation thread: ${message.channel.name}`);
            return;
        }

        const threadId = message.channel.id;
        const userId = message.author.id;
        const userName = message.member?.displayName || message.author.username;
        const question = message.content?.trim();

        if (!question) return;

        // Initialize queue for thread
        if (!messageQueue.has(threadId)) {
            messageQueue.set(threadId, []);
        }
        
        const queue = messageQueue.get(threadId);
        
        return new Promise((resolve) => {
            queue.push(async () => {
                try {
                    logger.info(`📩 Received message (Thread: ${threadId}, User: ${userName}): ${question}`);
                    const thinkingMessage = await message.channel.send(`🤔 Thinking...`);
                    const reply = await askGeminiAI(threadId, userId, userName, question);
                    await thinkingMessage.edit(reply);
                } catch (error) {
                    logger.error(`❌ Error in Gemini API request (Thread: ${threadId}): ${error.message}`);
                } finally {
                    queue.shift();
                    if (queue.length > 0) {
                        queue[0](); // Process the next request
                    }
                    resolve();
                }
            });

            // Execute immediately if this is the first request in the queue
            if (queue.length === 1) {
                queue[0]();
            }
        });
    }

    // Handle AutoBan logic
    try {        
        if (isAutoBanEnabled(message.channel.id)) {
            await message.member.ban({ reason: 'AutoBan: Sent message in restricted channel.' });
            await message.channel.send(`🚨 ${message.author.username} has been banned for sending a message in an AutoBan channel.`);
            logger.info(`🔨 User ${message.author.tag} was banned for sending a message in ${message.channel.name}.`);
        }
    } catch (error) {
        logger.error(`❌ Error processing AutoBan: ${error.message}`);
    }
};