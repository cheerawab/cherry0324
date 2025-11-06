import fs from 'fs';
import path from 'path';

const responsesFile = path.resolve('./feature/autoresponses/responses.json');
const settingsFiles = [
    path.resolve('./events/interaction/setting.json'),
    path.resolve('./events/interaction/example_setting.json'),
];

let keywordResponses = {};
let globalChannelWhitelist = [];

/**
 * Normalizes channel identifiers to a trimmed string array.
 * @param {unknown} channels - Raw channel configuration from JSON.
 * @returns {string[]} - Normalized channel IDs.
 */
function normalizeChannelIds(channels) {
    if (!channels) return [];

    if (typeof channels === 'string') {
        const trimmed = channels.trim();
        return trimmed ? [trimmed] : [];
    }

    if (Array.isArray(channels)) {
        return channels
            .map((id) => (typeof id === 'number' ? String(id) : id))
            .filter((id) => typeof id === 'string')
            .map((id) => id.trim())
            .filter(Boolean);
    }

    return [];
}

/**
 * Reads the JSON file and updates keywordResponses.
 */
function loadResponses() {
    try {
        const data = fs.readFileSync(responsesFile, 'utf8');
        const parsed = JSON.parse(data);
        globalChannelWhitelist = loadGlobalChannelWhitelist();
        keywordResponses = {};

        for (const [key, value] of Object.entries(parsed)) {
            if (key.startsWith('__')) {
                continue;
            }

            if (!value || typeof value !== 'object') {
                console.warn(`⚠️ 無法載入關鍵字設定「${key}」，請確認 JSON 結構。`);
                continue;
            }

            keywordResponses[key] = {
                ...value,
                channels: normalizeChannelIds(value.channels),
            };
        }
        console.log("✅ 關鍵字回應已載入。");
    } catch (error) {
        console.error("❌ 載入 responses.json 失敗：", error);
    }
}

/**
 * Loads channel whitelist from setting files.
 * @returns {string[]} - Global channel whitelist.
 */
function loadGlobalChannelWhitelist() {
    for (const settingsFile of settingsFiles) {
        try {
            if (!fs.existsSync(settingsFile)) continue;
            const content = fs.readFileSync(settingsFile, 'utf8');
            const parsed = JSON.parse(content);
            const configNode =
                parsed['自動關鍵字回覆'] ||
                parsed['關鍵字自動回覆'] ||
                parsed['自動回覆'] ||
                parsed.autoresponse;

            if (!configNode || typeof configNode !== 'object') continue;

            const channels = normalizeChannelIds(
                configNode.channels ||
                configNode.channelids ||
                configNode.channelid ||
                configNode.whitelist
            );

            if (channels.length > 0) {
                console.log(`🔧 從 ${path.basename(settingsFile)} 載入自動回覆頻道設定：${channels.join(', ')}`);
                return channels;
            }
        } catch (error) {
            console.error(`⚠️ 載入 ${path.basename(settingsFile)} 時發生錯誤：`, error);
        }
    }

    return [];
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
    const channelId = message.channel.id;

    if (globalChannelWhitelist.length > 0 && !globalChannelWhitelist.includes(channelId)) {
        return false; // Channel is not globally whitelisted
    }

    for (const key in keywordResponses) {
        const { keywords, responses, absolute, channels } = keywordResponses[key];

        if (Array.isArray(channels) && channels.length > 0 && !channels.includes(channelId)) {
            continue; // Skip channels that are not whitelisted
        }

        // 檢查 absolute 是否完全匹配
        if (Array.isArray(absolute) && absolute.length > 0) {
            if (absolute.includes(content)) {
                // 加入機率判斷
                if (Math.random() > 0.3) {
                    // 如果完全匹配 absolute，隨機回應
                    if (Array.isArray(responses) && responses.length > 0) {
                        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                        await message.reply(randomResponse);
                        console.log(`💬 已自動回覆（完全匹配）：「${content}」→「${randomResponse}」`);
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
                    console.log(`💬 已自動回覆（關鍵字匹配）：「${content}」→「${randomResponse}」`);
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
    console.log("🔄 關鍵字回應已重新載入。");
}