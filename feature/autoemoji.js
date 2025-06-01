import fs from 'fs';
import path from 'path';

// 載入 setting.json 並取得自動表符頻道ID
const settingPath = path.resolve('./events/interaction/setting.json');
let selfIntroductionChannelId = undefined;
try {
    const setting = JSON.parse(fs.readFileSync(settingPath, 'utf8'));
    selfIntroductionChannelId = setting['自動表符']?.channelid?.trim();
    console.log(`🔍 從 setting.json 取得自我介紹頻道ID: ${selfIntroductionChannelId}`);
} catch (err) {
    console.error('❌ 載入 setting.json 失敗：', err);
}

/**
 * 偵測訊息是否來自指定頻道，並添加反應
 * @param {import('discord.js').Message} message - Discord 訊息物件
 * @returns {Promise<boolean>} - 是否成功處理訊息
 */
let selfIntroductionEmoji = undefined;
export async function handleAutoResponse(message) {
    console.log(`🔍 檢查頻道 ID：訊息頻道 ID = ${message.channel.id}，指定頻道 ID = ${selfIntroductionChannelId}`);
    if (message.channel.id !== selfIntroductionChannelId) {
        console.log(`❌ 訊息來自非指定頻道（ID: ${message.channel.id}），請將指定頻道設為：${selfIntroductionChannelId}`);
        return false;
    }

    try {
        const setting = JSON.parse(fs.readFileSync(settingPath, 'utf8'));
        selfIntroductionEmoji = setting['自動表符']?.emoji?.trim();
        await message.react(selfIntroductionEmoji);
        console.log(`✅ 已為訊息添加反應：${message.content}`);
        return true;
    } catch (error) {
        console.error('❌ 添加反應時發生錯誤：', error);
        return false;
    }
}