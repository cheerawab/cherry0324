import fs from 'fs';
import path from 'path';
import Logger from './errorhandle/logger.js';

// Initialize logger
const logger = new Logger();

// Define the JSON file for storing deletion schedules
const dataFile = path.resolve('/app/data/delete_schedule.json');

/**
 * 從 JSON 檔案載入刪除排程。
 * @returns {Object} 載入的刪除排程，若不存在則回傳空物件。
 */
export function loadDeleteSchedule() {
    try {
        if (!fs.existsSync(dataFile)) {
            logger.warn('⚠️ 刪除排程檔案不存在，回傳空物件。');
            return {};
        }
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        logger.info('✅ 刪除排程載入成功。');
        return data;
    } catch (error) {
        logger.error('❌ 載入刪除排程時發生錯誤：', error);
        return {};
    }
}

/**
 * 將刪除排程儲存到 JSON 檔案。
 * @param {Object} data - 要儲存的刪除排程資料。
 */
export function saveDeleteSchedule(data) {
    try {
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
        logger.info('✅ 刪除排程儲存成功。');
    } catch (error) {
        logger.error('❌ 儲存刪除排程時發生錯誤：', error);
    }
}