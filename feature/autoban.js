import fs from 'fs';
import path from 'path';
import Logger from '../feature/errorhandle/logger.js';

const logger = new Logger();
const configPath = path.resolve('/app/data/autobanConfig.json');

/**
 * Loads the AutoBan configuration from a JSON file.
 * @returns {Object} The loaded AutoBan configuration.
 */
export function loadAutoBanConfig() {
    try {
        if (!fs.existsSync(configPath)) {
            return {};
        }
        const data = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error(`❌ Error loading AutoBan configuration: ${error.message}`);
        return {};
    }
}

/**
 * Saves the AutoBan configuration to a JSON file.
 * @param {Object} config - The AutoBan configuration to save.
 */
export function saveAutoBanConfig(config) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
        logger.info('✅ AutoBan configuration saved successfully.');
    } catch (error) {
        logger.error(`❌ Error saving AutoBan configuration: ${error.message}`);
    }
}

/**
 * Checks if a given channel is enabled for AutoBan.
 * @param {string} channelId - The ID of the channel to check.
 * @returns {boolean} True if the channel is set for AutoBan, false otherwise.
 */
export function isAutoBanEnabled(channelId) {
    const config = loadAutoBanConfig();
    return Boolean(config[channelId]);
}