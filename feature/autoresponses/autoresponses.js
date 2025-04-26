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
        const { keywords, responses } = keywordResponses[key];
        if (keywords.some(keyword => content.includes(keyword))) {
            if (Array.isArray(responses) && responses.length > 0) {
                const randomResponse = responses[Math.floor(Math.random() * responses.length)]; // Select a random response
                await message.reply(randomResponse);
                console.log(`💬 Auto-replied: "${keywords}" → "${randomResponse}"`);
                return true; // Indicates that a response was sent
            }
        }
    }

    return false; // No matching keyword found
}

/**
 * Reloads keyword responses (use when the JSON file is updated).
 */
export function reloadResponses() {
    loadResponses();
    console.log("🔄 Keyword responses have been reloaded.");
}