import fs from 'fs';
import path from 'path';
import Logger from './errorhandle/logger.js';

// Initialize logger
const logger = new Logger();

// Define the JSON file for storing deletion schedules
const dataFile = path.resolve('/app/data/delete_schedule.json');

/**
 * Loads the delete schedule from the JSON file.
 * @returns {Object} The loaded delete schedule or an empty object if not found.
 */
export function loadDeleteSchedule() {
    try {
        if (!fs.existsSync(dataFile)) {
            logger.warn('⚠️ Delete schedule file does not exist, returning empty object.');
            return {};
        }
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        logger.info('✅ Delete schedule loaded successfully.');
        return data;
    } catch (error) {
        logger.error('❌ Error loading delete schedule:', error);
        return {};
    }
}

/**
 * Saves the delete schedule to the JSON file.
 * @param {Object} data - The delete schedule data to save.
 */
export function saveDeleteSchedule(data) {
    try {
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
        logger.info('✅ Delete schedule saved successfully.');
    } catch (error) {
        logger.error('❌ Error saving delete schedule:', error);
    }
}