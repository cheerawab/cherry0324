import fs from 'fs/promises';
import path from 'path';
import Logger from './errorhandle/logger.js';

const logger = new Logger();
const warningsFile = path.resolve(process.cwd(), '/app/data/warnings.json');

/**
 * Initialize the warnings data file.
 */
async function initializeWarningsFile() {
    try {
        await fs.access(warningsFile);
        logger.info('✅ Warnings file already exists.');
    } catch {
        try {
            await fs.writeFile(warningsFile, JSON.stringify({}, null, 2), 'utf8');
            logger.info('✅ Initialized warnings file at: ' + warningsFile);
        } catch (error) {
            logger.error('❌ Failed to initialize warnings file:', error);
        }
    }
}

await initializeWarningsFile();

/**
 * Load warning data (asynchronous).
 * @returns {Promise<Object>} User warning data.
 */
export async function loadWarnings() {
    try {
        const data = await fs.readFile(warningsFile, 'utf8');
        logger.info(`File content read: ${data}`);
        const parsedData = JSON.parse(data);
        logger.info(`Parsed warnings data: ${JSON.stringify(parsedData, null, 2)}`);
        return parsedData;
    } catch (error) {
        logger.error("❌ Failed to load warning data:", error);
        if (error instanceof SyntaxError) {
            logger.warn("⚠️ Warnings file contains invalid JSON. Please manually check the file.");
        }
        return {};
    }
}

/**
 * Save warning data (asynchronous, atomic writing).
 * @param {Object} data Warning data to save.
 */
export async function saveWarnings(data) {
    try {
        const tempFile = `${warningsFile}.tmp`;
        await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
        await fs.rename(tempFile, warningsFile); // Ensure atomic writing
        logger.info('✅ Successfully saved warnings data.');
    } catch (error) {
        logger.error('❌ Failed to save warning data:', error);
    }
}