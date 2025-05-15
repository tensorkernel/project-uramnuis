import winston from 'winston';
import { config } from '../config/index.js';

/**
 * Custom format for console output with colors and timestamps
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

/**
 * Format for file logging with timestamps and JSON structure
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

/**
 * Creates and configures Winston logger with console and file transports
 */
export const logger = winston.createLogger({
  level: config.logLevel,
  transports: [
    // Console output
    new winston.transports.Console({
      format: consoleFormat
    }),
    // File output for general logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    // File output for error logs
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

/**
 * Adds additional context to log messages
 * @param context The context to add
 * @returns Logger with the added context
 */
export function createContextLogger(context: string) {
  return {
    info: (message: string, meta: Record<string, any> = {}) => {
      logger.info(`[${context}] ${message}`, meta);
    },
    warn: (message: string, meta: Record<string, any> = {}) => {
      logger.warn(`[${context}] ${message}`, meta);
    },
    error: (message: string, error?: any) => {
      if (error instanceof Error) {
        logger.error(`[${context}] ${message}`, {
          errorMessage: error.message,
          stack: error.stack
        });
      } else {
        logger.error(`[${context}] ${message}`, { error });
      }
    },
    debug: (message: string, meta: Record<string, any> = {}) => {
      logger.debug(`[${context}] ${message}`, meta);
    }
  };
}

export default logger;