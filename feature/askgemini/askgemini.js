import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Logger from '../errorhandle/logger.js';

dotenv.config();

const logger = new Logger();
// Check if the environment variable is set
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error("❌ GEMINI_API_KEY is missing in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Load character settings
const characterFile = path.resolve('./feature/character/xihai/xihai.json');
let characterData = {};

if (fs.existsSync(characterFile)) {
    try {
        characterData = JSON.parse(fs.readFileSync(characterFile, 'utf8'));
        logger.info(`✅ Character profile loaded: ${characterData.name}`);
    } catch (error) {
        logger.error("⚠️ Failed to read character profile, using default settings: ", error);
        characterData = getDefaultCharacterData();
    }
} else {
    logger.warn("⚠️ Character profile file not found, using default settings.");
    characterData = getDefaultCharacterData();
}

function getDefaultCharacterData() {
    return {
        name: "希海",
        nickname: "小希, 希希, CC, 吸吸, 希總, 希海龜",
        description: "一個活潑可愛、充滿好奇心的小女孩。",
        personality: "開朗、幽默、喜歡聊天。",
        speech_style: "使用輕鬆俏皮的語氣，經常加入 Emoji。",
        greeting: "嗨嗨！我是希海，今天想聊什麼呢？😆",
        likes: [],
        dislikes: [],
        age: "未知",
        surname: "志斗",
        given_name: "未知",
        name_meaning: "未知",
        birthday: "3/24",
        siblings: {}
    };
}

// Memory storage folder
const memoryFolder = path.resolve('/app/data/memory');
if (!fs.existsSync(memoryFolder)) {
    fs.mkdirSync(memoryFolder, { recursive: true });
}

/**
 * Loads conversation memory for a specific thread.
 * @param {string} threadId - Thread ID
 * @returns {Array} - Conversation history
 */
function loadMemory(threadId) {
    const memoryFile = path.join(memoryFolder, `${threadId}.json`);
    if (!fs.existsSync(memoryFile)) return [];
    try {
        return JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
    } catch (error) {
        logger.error(`Error reading memory file (Thread: ${threadId}):`, error);
        return [];
    }
}

/**
 * Saves conversation memory for a specific thread.
 * @param {string} threadId - Thread ID
 * @param {Array} conversationHistory - Conversation history
 */
function saveMemory(threadId, conversationHistory) {
    const memoryFile = path.join(memoryFolder, `${threadId}.json`);
    try {
        fs.writeFileSync(memoryFile, JSON.stringify(conversationHistory, null, 2), 'utf8');
    } catch (error) {
        logger.error(`Error saving memory file (Thread: ${threadId}):`, error);
    }
}

/**
 * Communicates with Google Gemini AI while maintaining conversation memory within a thread.
 * @param {string} threadId - Thread ID
 * @param {string} userId - User ID
 * @param {string} userName - User name
 * @param {string} question - User's question
 * @returns {Promise<string>} - AI response
 */
export async function askGeminiAI(threadId, userId, userName, question, message) {
    if (!question || typeof question !== 'string') {
        logger.warn(`⚠️ Invalid question (Thread: ${threadId}, User: ${userId}, Name: ${userName}), skipping processing.`);
        return "❌ 我好像沒聽清楚你的問題，可以再說一次嗎？";
    }

    try {
        logger.info(`Querying Gemini AI (Thread: ${threadId}, User: ${userId}, Name: ${userName}): ${question}`);
        
        // Retrieve conversation history
        const conversationHistory = loadMemory(threadId);

        // Construct conversation prompt
        const prompt = `你是一個名為 ${characterData.name} (${characterData.surname} ${characterData.given_name}) 的角色。
        - 性別：${characterData.Gender}
        - 名字含義：${characterData.name_meaning}
        - 暱稱：${characterData.nickname}，也可能被稱作 ${characterData.alternative_names?.join(", ") || "無"}
        - 個性描述：${characterData.description}
        - 性格特點：${characterData.personality}
        - 說話風格：${characterData.speech_style}
        - 生日：${characterData.birthday}
        - 年齡：${characterData.age}
        - 語言：${characterData.language}
        - 喜歡的事物：${characterData.likes?.join(", ") || "未知"}
        - 討厭的事物：${characterData.dislikes?.join(", ") || "未知"}
        - 兄弟姐妹：${characterData.siblings?.has_sibling ? `有一個${characterData.siblings.relation}，${characterData.siblings.feelings}` : "沒有兄弟姐妹"}
        - 寵物: ${characterData.pets?.has_pets ? `有一隻${characterData.pets.type}，${characterData.pets.pet_names?.join(", ")}，${characterData.pets.pet_description}` : "未知"}
        - 示例回應，參考但避免直接使用：${characterData.example_responses?.join("\n") || "未知"}

        你的回應應該保持這些特性。以下是你過去的對話歷史：
        ${conversationHistory.map(entry => `使用者 ${entry.userName} (${entry.userId}): ${entry.user}\n${characterData.name}: ${entry.ai}`).join('\n')}

        現在開始對話：
        使用者 ${userName} (${userId}): ${question}
        ${characterData.name}:`;

        logger.info(`📨 送出的 Prompt: ${prompt}`);
        
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const result = await model.generateContent(prompt);
        let reply = result.response.text().trim();
        
        logger.info(`🔍 AI 原始回應 (Thread: ${threadId}, User: ${userId}): ${JSON.stringify(result, null, 2)}`);        

        if (!reply) {
            logger.error(`❌ AI 回應內容為空 (Thread: ${threadId}, User: ${userId})`);
            return "❌ 我好像遇到了一點問題，請稍後再試一次！";
        }

        // Check if the reply mentions pets based on pet_type and append images
        const petType = characterData.pets?.pet_type?.split(',').map(type => type.trim()) || [];
        const petImages = characterData.pets?.pet_images || [];

        if (petType.some(type => question.includes(type) || reply.includes(type))) {
            const petKeyword = petType[1]?.trim(); // 取出 `,` 後的名稱
            const petFolderPath = path.join('./feature/character/xihai', petImages[0]); // 使用相對路徑

            logger.info(`📂 檢查目錄：${petFolderPath}`);
            logger.info(`🔑 檢查關鍵字：${petKeyword}`);

            // 確保目錄存在，並篩選符合條件的檔案
            let matchedImages = [];
            if (fs.existsSync(petFolderPath) && fs.lstatSync(petFolderPath).isDirectory()) {
                matchedImages = fs.readdirSync(petFolderPath)
                    .filter(file => file.toLowerCase().startsWith(petKeyword.toLowerCase())) // 檢測檔名是否以 petKeyword 開頭（忽略大小寫）
                    .map(file => path.join(petFolderPath, file)); // 生成完整路徑
            } else {
                logger.warn(`⚠️ 目錄不存在或不是目錄：${petFolderPath}`);
            }

            if (!message || !message.channel) {
                logger.error("❌ 無法發送圖片，因為 message 或 message.channel 未定義。");
                return "❌ 我好像遇到了一點問題，請稍後再試一次！";
            }

            logger.info(`🔍 傳遞的 message 物件：${JSON.stringify(message, null, 2)}`);

            if (matchedImages.length > 0) {
                reply += `\n\n🐾 這是我家的${petType[0]}照片：`;
                const attachments = matchedImages.map(image => ({
                    attachment: image,
                    name: path.basename(image),
                }));

                try {
                    // 發送圖片作為附件
                    await message.channel.send({
                        content: reply,
                        files: attachments,
                    });
                    return; // 確保不重複發送回應
                } catch (error) {
                    logger.error(`❌ 發送圖片時發生錯誤：${error.message}`);
                }
            } else {
                reply += `\n\n🐾 抱歉，我找不到符合條件的${petType[0]}照片，可能牠們躲起來了！🤣`;
                logger.warn(`⚠️ 未找到符合條件的圖片，檢查 pet_images 或檔案名稱是否正確。`);
            }
        }

        // Save conversation history
        conversationHistory.push({ userId, userName, user: question, ai: reply });
        saveMemory(threadId, conversationHistory);

        return `🌟 ${characterData.nickname}: ${reply}`;
    } catch (error) {
        console.error('❌ Gemini API error:', error);
        return "❌ 我好像遇到了一點問題，請稍後再試一次！";
    }
}
