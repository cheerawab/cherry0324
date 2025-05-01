import fs from 'fs';
import path from 'path';

const responsesFile = path.resolve('./feature/autoresponses/responses.json'); // Locate JSON file
let keywordResponses = {};

/**
 * Reads the JSON file and updates keywordResponses.
 */
function loadResponses() {
    try {
        const data = fs.readFileSync(responsesFile, 'utf8');
        keywordResponses = JSON.parse(data);
        console.log("✅ Keyword responses have been loaded.");
    } catch (error) {
        console.error("❌ Failed to load responses.json:", error);
    }
}

// Load responses on startup
loadResponses();

/**
 * Replies to messages based on keyword detection (random response selection).
 * @param {import('discord.js').Message} message - Discord message object.
 * @returns {Promise<boolean>} - Indicates if a response was sent.
 */
export async function handleAutoResponse(message) {
    const content = message.content.trim().toLowerCase();

    for (const key in keywordResponses) {
        const { keywords, responses, absolute } = keywordResponses[key];

        // 檢查 absolute 是否完全匹配
        if (Array.isArray(absolute) && absolute.length > 0) {
            if (absolute.includes(content)) {
                // 加入機率判斷
                if (Math.random() > 0.5) {
                    // 如果完全匹配 absolute，隨機回應
                    if (Array.isArray(responses) && responses.length > 0) {
                        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                        await message.reply(randomResponse);
                        console.log(`💬 Auto-replied (absolute match): "${content}" → "${randomResponse}"`);
                        return true; // 表示已發送回應
                    }
                }
            }
        }

        // 如果沒有完全匹配 absolute，檢查是否包含 keywords
        if (Array.isArray(keywords) && keywords.some(keyword => content.includes(keyword))) {
            // 加入機率判斷
            if (Math.random() > 0.5) {
                // 隨機回應
                if (Array.isArray(responses) && responses.length > 0) {
                    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                    await message.reply(randomResponse);
                    console.log(`💬 Auto-replied (keyword match): "${content}" → "${randomResponse}"`);
                    return true; // 表示已發送回應
                }
            }
        }
    }

    return false; // 沒有匹配的關鍵字或 absolute
}

/**
 * Reloads keyword responses (use when the JSON file is updated).
 */
export function reloadResponses() {
    loadResponses();
    console.log("🔄 Keyword responses have been reloaded.");
}