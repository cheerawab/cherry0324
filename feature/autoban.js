import fs from 'fs';
import path from 'path';
import Logger from '../feature/errorhandle/logger.js';

const logger = new Logger();
const configPath = path.resolve('/app/data/autobanConfig.json');

/**
 * 從 JSON 檔案載入 AutoBan 設定。
 * @returns {Object} 載入的 AutoBan 設定。
 */
export function loadAutoBanConfig() {
    try {
        if (!fs.existsSync(configPath)) {
            return {};
        }
        const data = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error(`❌ 載入 AutoBan 設定時發生錯誤：${error.message}`);
        return {};
    }
}

/**
 * 將 AutoBan 設定儲存到 JSON 檔案。
 * @param {Object} config - 要儲存的 AutoBan 設定。
 */
export function saveAutoBanConfig(config) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
        logger.info('✅ AutoBan 設定已成功儲存。');
    } catch (error) {
        logger.error(`❌ 儲存 AutoBan 設定時發生錯誤：${error.message}`);
    }
}

/**
 * 檢查指定頻道是否啟用 AutoBan。
 * @param {string} channelId - 要檢查的頻道 ID。
 * @returns {boolean} 若該頻道已設定 AutoBan 則回傳 true，否則回傳 false。
 */
export function isAutoBanEnabled(channelId) {
    const config = loadAutoBanConfig();
    return Boolean(config[channelId]);
}