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
    logger.info(`Generated random value: ${random}`);

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
    .setName('sign')
    .setDescription('Sign in for the day.');

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
            return await interaction.editReply(`✅ You have already signed in today, ${userName}!`);
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
        logger.info(`Selected image for ${userName}: ${randomImage}`);
        
        if (randomImage) {
            const imagePath = path.join(imagesDir, randomImage);
            logger.info(`Sending image: ${imagePath}`);
            await interaction.editReply({
                content: `🎉 ${userName}, you have signed in! Streak: ${userRecord.streak} days. Total: ${userRecord.total} times.`,
                files: [imagePath]
            });
        } else {
            logger.warn(`No image available for ${userName}`);
            await interaction.editReply(`🎉 ${userName}, you have signed in! Streak: ${userRecord.streak} days. Total: ${userRecord.total} times.`);
        }
    } catch (error) {
        logger.error(`❌ Error processing sign-in: ${error.message}`);
        await interaction.editReply('❌ An error occurred while signing in. Please try again later.');
    }
};