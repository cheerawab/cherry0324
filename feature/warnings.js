import fs from 'fs/promises';
import path from 'path';
import Logger from './errorhandle/logger.js';

const logger = new Logger();
const warningsFile = path.resolve(process.cwd(), '/app/data/warnings.json');

/**
 * 初始化警告資料檔案。
 */
async function initializeWarningsFile() {
    try {
        await fs.access(warningsFile);
        logger.info('✅ 警告資料檔案已存在。');
    } catch {
        try {
            await fs.writeFile(warningsFile, JSON.stringify({}, null, 2), 'utf8');
            logger.info('✅ 已初始化警告資料檔案於：' + warningsFile);
        } catch (error) {
            logger.error('❌ 初始化警告資料檔案失敗：', error);
        }
    }
}

await initializeWarningsFile();

/**
 * 載入警告資料（非同步）。
 * @returns {Promise<Object>} 使用者警告資料。
 */
export async function loadWarnings() {
    try {
        const data = await fs.readFile(warningsFile, 'utf8');
        logger.info(`檔案內容讀取：${data}`);
        const parsedData = JSON.parse(data);
        logger.info(`解析後的警告資料：${JSON.stringify(parsedData, null, 2)}`);
        return parsedData;
    } catch (error) {
        logger.error("❌ 載入警告資料失敗：", error);
        if (error instanceof SyntaxError) {
            logger.warn("⚠️ 警告資料檔案包含無效的 JSON，請手動檢查檔案。");
        }
        return {};
    }
}

/**
 * 儲存警告資料（非同步，原子寫入）。
 * @param {Object} data 要儲存的警告資料。
 */
export async function saveWarnings(data) {
    try {
        const tempFile = `${warningsFile}.tmp`;
        await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
        await fs.rename(tempFile, warningsFile); // 確保原子寫入
        logger.info('✅ 警告資料儲存成功。');
    } catch (error) {
        logger.error('❌ 儲存警告資料失敗：', error);
    }
}