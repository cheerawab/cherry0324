import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import Logger from '../../feature/errorhandle/logger.js';

// Manually define __dirname for ES module support
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = new Logger();
const signInFile = path.resolve('/app/data/signInRecords.json');
const imagesDir = path.resolve(__dirname, '../../feature/signimage/');

// Load available images from local directory
function getLocalImages() {
    if (!fs.existsSync(imagesDir)) return {
        "great_fortune": [],
        "fortune": [],
        "great_misfortune": [],
        "misfortune": [],
        "funny": []
    };
    
    const files = fs.readdirSync(imagesDir);
    const images = {
        "great_fortune": files.filter(f => f.startsWith('great_fortune')),
        "fortune": files.filter(f => f.startsWith('fortune')),
        "great_misfortune": files.filter(f => f.startsWith('great_misfortune')),
        "misfortune": files.filter(f => f.startsWith('misfortune')),
        "funny": files.filter(f => f.startsWith('funny'))
    };
    
    logger.info(`Images loaded: ${JSON.stringify(images)}`);
    return images;
}

const images = getLocalImages();

// Randomly select an image category based on defined probabilities
function getRandomImage() {
    const random = Math.floor(Math.random() * 100);
    logger.info(`產生的隨機值：${random}`);

    if (random < 10 && images.great_fortune.length > 0)
        return images.great_fortune[Math.floor(Math.random() * images.great_fortune.length)];
    
    if (random < 40 && images.fortune.length > 0)
        return images.fortune[Math.floor(Math.random() * images.fortune.length)];
    
    if (random < 50 && images.great_misfortune.length > 0)
        return images.great_misfortune[Math.floor(Math.random() * images.great_misfortune.length)];
    
    if (random < 80 && images.misfortune.length > 0)
        return images.misfortune[Math.floor(Math.random() * images.misfortune.length)];
    
    if (images.funny.length > 0) {
        const randomFunnyIndex = Math.floor(Math.random() * images.funny.length);
        return images.funny[randomFunnyIndex];
    }
    
    return null; // No image available
}

// Load sign-in data
function loadSignInData() {
    if (!fs.existsSync(signInFile)) return {};
    return JSON.parse(fs.readFileSync(signInFile, 'utf8'));
}

// Save sign-in data
function saveSignInData(data) {
    fs.writeFileSync(signInFile, JSON.stringify(data, null, 4), 'utf8');
}

export const data = new SlashCommandBuilder()
    .setName('簽到')
    .setDescription('你今天簽到了嗎?');

export const execute = async (interaction) => {
    try {
        await interaction.deferReply();
        
        const userId = interaction.user.id;
        const userName = interaction.user.username;
        const today = new Date().toISOString().split('T')[0];
        
        const signInData = loadSignInData();

        if (!signInData[userId]) {
            signInData[userId] = { lastSignIn: null, streak: 0, total: 0 };
        }

        const userRecord = signInData[userId];
        
        if (userRecord.lastSignIn === today) {
            return await interaction.editReply(`✅ 你今天簽到過了明天再來吧, ${userName}!`);
        }

        if (userRecord.lastSignIn) {
            const lastDate = new Date(userRecord.lastSignIn);
            lastDate.setDate(lastDate.getDate() + 1);
            if (lastDate.toISOString().split('T')[0] === today) {
                userRecord.streak += 1;
            } else {
                userRecord.streak = 1;
            }
        } else {
            userRecord.streak = 1;
        }
        
        userRecord.lastSignIn = today;
        userRecord.total += 1;
        saveSignInData(signInData);
        
        // Select a random image
        const randomImage = getRandomImage();
        logger.info(`為 ${userName} 選定的圖片：${randomImage}`);
        
        if (randomImage) {
            const imagePath = path.join(imagesDir, randomImage);
            logger.info(`傳送圖片：${imagePath}`);
            await interaction.editReply({
                content: `🎉 ${userName}, 你簽到了! 連續: ${userRecord.streak} 天真厲害. 總共: ${userRecord.total} 天.`,
                files: [imagePath]
            });
        } else {
            logger.warn(`${userName} 沒有可用的圖片`);
            await interaction.editReply(`🎉 ${userName}, 你簽到了! 連續: ${userRecord.streak} 天真厲害. 總共: ${userRecord.total} 天.`);
        }
    } catch (error) {
        logger.error(`❌ 處理簽到時發生錯誤：${error.message}`);
        await interaction.editReply('❌ 哎呀,出了點問題誒');
    }
};