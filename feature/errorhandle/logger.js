import winston from 'winston';
import fs from 'fs';
import path from 'path';

/**
 * Logger 類別，用於管理應用程式日誌與崩潰報告。
 */
class Logger {
  /**
   * 建立 Logger 實例。
   * @param {string} [logDir='/app/data/logs'] - 日誌儲存目錄（Docker 中為持久化路徑）。
   */
  constructor(logDir = '/app/data/logs') {
    this.logDir = logDir;
    this.logFilename = this.getLogFilename();

    // 確保日誌目錄存在
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // 初始化 logger 實例
    this.logger = winston.createLogger({
      levels: winston.config.npm.levels,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp }) => {
          return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
        })
      ),
      transports: [
        // 控制台輸出
        new winston.transports.Console({
          level: 'debug', // 控制台顯示除錯及更高級別的日誌
        }),
        // 儲存在 Docker 卷中的持久性日誌
        new winston.transports.File({
          filename: path.join(this.logDir, this.logFilename),
          level: 'info', // 記錄資訊及更高級別的日誌
          maxsize: 10 * 1024 * 1024, // 最大檔案大小 10MB
          maxFiles: 5, // 保留最多 5 個日誌檔案
        }),
      ],
    });

    // 設定崩潰處理
    this.setupCrashHandlers();
  }

  /**
   * 產生基於時間戳的日誌檔名。
   * @returns {string} - 產生的日誌檔名。
   * @private
   */
  getLogFilename() {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace('T', '_').split('.')[0];
    return `${timestamp}.log`;
  }

  /**
   * 設定崩潰處理事件監聽。
   * 捕捉未捕獲例外與未處理的 Promise 拒絕，並產生崩潰報告。
   * @private
   */
  setupCrashHandlers() {
    process.on('uncaughtException', (err) => {
      this.logCrashReport(err);
      console.error('Application crashed! Check crash.log for details.');
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      this.logger.error(`Unhandled Promise Rejection: ${reason}`);
    });
  }

  /**
   * 將崩潰報告寫入檔案。
   * @param {Error} error - 捕獲的例外物件。
   * @private
   */
  logCrashReport(error) {
    const crashLogPath = path.join(this.logDir, 'crash.log');
    const crashLog = `
=== Application Crash Report ===
Timestamp: ${new Date().toISOString()}
Error: ${error.message}
Stack Trace: ${error.stack}
================================
`;
    fs.appendFileSync(crashLogPath, crashLog, 'utf8');
  }

  /**
   * 記錄除錯等級訊息。
   * @param {string} message - 日誌訊息。
   */
  debug(message) {
    this.logger.debug(message);
  }

  /**
   * 記錄資訊等級訊息。
   * @param {string} message - 日誌訊息。
   */
  info(message) {
    this.logger.info(message);
  }

  /**
   * 記錄警告等級訊息。
   * @param {string} message - 日誌訊息。
   */
  warn(message) {
    this.logger.warn(message);
  }

  /**
   * 記錄錯誤等級訊息。
   * @param {string|Error} err - 日誌訊息或錯誤物件。
   */
  error(err) {
    if (err instanceof Error) {
        this.logger.error(`[ERROR]: ${err.message}\nStack Trace: ${err.stack}`);
    } else if (typeof err === 'object') {
        this.logger.error(`[ERROR]: ${JSON.stringify(err, null, 2)}`);
    } else {
        this.logger.error(`[ERROR]: ${err}`);
    }
  }
}

export default Logger;