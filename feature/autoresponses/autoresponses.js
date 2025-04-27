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

        // 如果 absolute 為 true，則只匹配完全相同的字詞
        if (absolute) {
            if (!keywords.includes(content)) continue; // 如果內容不完全匹配，跳過
        } else {
            // 如果 absolute 為 false，則檢查是否包含關鍵字
            if (!keywords.some(keyword => content.includes(keyword))) continue;
        }

        // 加入隨機機率判斷（50% 機率回應）
        if (Math.random() > 0.5) {
            if (Array.isArray(responses) && responses.length > 0) {
                const randomResponse = responses[Math.floor(Math.random() * responses.length)]; // 隨機選擇回應
                await message.reply(randomResponse);
                console.log(`💬 Auto-replied: "${keywords}" → "${randomResponse}"`);
                return true; // 表示已發送回應
            }
        } else {
            console.log(`🤔 Skipped auto-reply for: "${keywords}" (50% chance)`);
        }
    }

    return false; // 沒有匹配的關鍵字
}

/**
 * Reloads keyword responses (use when the JSON file is updated).
 */
export function reloadResponses() {
    loadResponses();
    console.log("🔄 Keyword responses have been reloaded.");
}