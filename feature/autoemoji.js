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
    const selfIntroductionChannelId = process.env.SELFINTRODUCTION_CHANNEL_ID?.trim();

    // 檢查訊息是否來自指定頻道
    console.log(`🔍 Check channel ID: Message channel ID = ${message.channel.id}, Specify channel ID = ${selfIntroductionChannelId}`);
    if (message.channel.id !== selfIntroductionChannelId) {
        console.log(`❌ The message comes from a non-specified channel (ID: ${message.channel.id}), specify the channel as: ${selfIntroductionChannelId}`);
        return false; // 如果不是指定頻道，直接返回
    }

    try {
        // 為訊息添加反應
        await message.react('<:yyin39:1365321302369374208>'); // 添加揮手表情符號
        console.log(`✅ Added reaction to message: ${message.content}`);
        return true; // 表示成功處理訊息
    } catch (error) {
        console.error('❌ An error occurred while adding the reaction:', error);
        return false; // 表示處理失敗
    }
}