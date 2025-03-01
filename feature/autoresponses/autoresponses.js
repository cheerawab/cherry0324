import fs from 'fs';
import path from 'path';

const responsesFile = path.resolve('./feature/autoresponses/responses.json'); // 定位 JSON 檔案
let keywordResponses = {};

/**
 * 讀取 JSON 檔案並更新 keywordResponses
 */
function loadResponses() {
    try {
        const data = fs.readFileSync(responsesFile, 'utf8');
        keywordResponses = JSON.parse(data);
        console.log("✅ 關鍵字回應已載入");
    } catch (error) {
        console.error("❌ 無法載入 responses.json:", error);
    }
}

// 啟動時先載入回應
loadResponses();

/**
 * 根據訊息內容回應關鍵字（隨機回應）
 * @param {import('discord.js').Message} message - Discord 訊息物件
 * @returns {Promise<boolean>} - 是否有發送回應
 */
export async function handleAutoResponse(message) {
    const content = message.content.trim().toLowerCase();

    for (const keyword in keywordResponses) {
        if (content.includes(keyword)) {
            const responses = keywordResponses[keyword]; // 取得回應陣列
            if (Array.isArray(responses) && responses.length > 0) {
                const randomResponse = responses[Math.floor(Math.random() * responses.length)]; // 隨機選擇回應
                await message.reply(randomResponse);
                console.log(`💬 自動回應：「${keyword}」 → 「${randomResponse}」`);
                return true; // 表示已經回應
            }
        }
    }

    return false; // 沒有找到符合的關鍵字
}

/**
 * 重新載入關鍵字回應（當 JSON 檔案有更新時可調用）
 */
export function reloadResponses() {
    loadResponses();
    console.log("🔄 關鍵字回應已重新載入");
}