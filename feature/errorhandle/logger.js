import winston from 'winston';
import fs from 'fs';
import path from 'path';

/**
 * Logger class for managing application logs and crash reports.
 */
class Logger {
  /**
   * Creates a Logger instance.
   * @param {string} [logDir='/app/data/logs'] - The directory where logs will be stored (persistent in Docker).
   */
  constructor(logDir = '/app/data/logs') {
    this.logDir = logDir;
    this.logFilename = this.getLogFilename();

    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Initialize the logger instance
    this.logger = winston.createLogger({
      levels: winston.config.npm.levels,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp }) => {
          return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
        })
      ),
      transports: [
        // Console output
        new winston.transports.Console({
          level: 'debug', // Display debug and higher level logs in the console
        }),
        // Persistent logs stored in Docker volume
        new winston.transports.File({
          filename: path.join(this.logDir, this.logFilename),
          level: 'info', // Record info and higher level logs
          maxsize: 10 * 1024 * 1024, // Max file size 10MB
          maxFiles: 5, // Retain up to 5 log files
        }),
      ],
    });

    // Setup crash handling
    this.setupCrashHandlers();
  }

  /**
   * Generates a timestamp-based log filename.
   * @returns {string} - The generated log filename.
   * @private
   */
  getLogFilename() {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace('T', '_').split('.')[0];
    return `${timestamp}.log`;
  }

  /**
   * Sets up crash handling event listeners.
   * Captures uncaught exceptions and unhandled promise rejections, generating crash reports.
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
   * Logs a crash report to a file.
   * @param {Error} error - The caught exception object.
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
   * Logs a debug-level message.
   * @param {string} message - The log message.
   */
  debug(message) {
    this.logger.debug(message);
  }

  /**
   * Logs an info-level message.
   * @param {string} message - The log message.
   */
  info(message) {
    this.logger.info(message);
  }

  /**
   * Logs a warning-level message.
   * @param {string} message - The log message.
   */
  warn(message) {
    this.logger.warn(message);
  }

  /**
   * Logs an error-level message.
   * @param {string|Error} err - The log message or error object.
   */
  error(err) {
    if (err instanceof Error) {
      this.logger.error(`${err.message}\nStack Trace: ${err.stack}`);
    } else {
      this.logger.error(err);
    }
  }
}

export default Logger;