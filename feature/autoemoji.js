import dotenv from 'dotenv';

dotenv.config(); // 載入 .env 檔案
console.log(`🔍 SELFINTRODUCTIONCHANNEL: ${process.env.SELFINTRODUCTIONCHANNEL}`);

/**
 * 偵測訊息是否來自指定頻道，並添加反應
 * @param {import('discord.js').Message} message - Discord 訊息物件
 * @returns {Promise<boolean>} - 是否成功處理訊息
 */
export async function handleAutoResponse(message) {
    // 從 .env 中取得 SELFINTRODUCTIONCHANNEL 的頻道 ID
    const selfIntroductionChannelId = process.env.SELFINTRODUCTIONCHANNEL?.trim();

    // 檢查訊息是否來自指定頻道
    console.log(`🔍 檢查頻道 ID: 訊息頻道 ID = ${message.channel.id}, 指定頻道 ID = ${selfIntroductionChannelId}`);
    if (message.channel.id !== selfIntroductionChannelId) {
        console.log(`❌ 訊息來自非指定頻道 (ID: ${message.channel.id})，指定頻道為: ${selfIntroductionChannelId}`);
        return false; // 如果不是指定頻道，直接返回
    }

    try {
        // 為訊息添加反應
        await message.react('<:yyin39:1365321302369374208>'); // 添加揮手表情符號
        console.log(`✅ 已為訊息添加反應: ${message.content}`);
        return true; // 表示成功處理訊息
    } catch (error) {
        console.error('❌ 添加反應時發生錯誤:', error);
        return false; // 表示處理失敗
    }
}

/**
 * 偵測訊息是否來自指定頻道，並添加表情符號反應
 * @param {import('discord.js').Message} message - Discord 訊息物件
 * @returns {Promise<boolean>} - 是否成功處理訊息
 */
export async function handleAutoEmojiResponse(message) {
    // ...existing code...
}