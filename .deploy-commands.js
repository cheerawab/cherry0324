// Import required modules from Discord.js
import { REST, Routes } from 'discord.js';

// Import Node.js built-in modules
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path, { dirname } from 'node:path';
import dotenv from 'dotenv';
import Logger from './feature/errorhandle/logger.js';

dotenv.config(); // Load environment variables from .env

const logger = new Logger();
const commands = [];
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to command folders
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// Iterate through all command folders
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    // Iterate through each command file
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = await import(filePath);
        
        // Ensure the command file contains 'data' and 'execute' properties
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            logger.warn(`[WARNING] Command in ${filePath} is missing a required "data" or "execute" attribute.`);
        }
    }
}

// Create REST instance and set token
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Deploy application (/) commands
(async () => {
    try {
        logger.info(`Registering APP token: ${process.env.DISCORD_TOKEN}`);
        logger.info(`🔄 Starting to refresh ${commands.length} application (/) commands.`);

        // Use put method to fully refresh commands on the server
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        logger.info(`✅ Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // Log any errors encountered
        logger.error('❌ Error deploying commands:', error);
    }
})();
