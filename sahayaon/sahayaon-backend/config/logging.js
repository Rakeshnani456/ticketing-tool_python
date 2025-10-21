// Logging configuration
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

// Set log level based on environment
const LOG_LEVEL = process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;

class Logger {
    constructor(module = 'App') {
        this.module = module;
    }

    error(message, ...args) {
        if (LOG_LEVEL >= LOG_LEVELS.ERROR) {
            console.error(`[${this.module}] ERROR:`, message, ...args);
        }
    }

    warn(message, ...args) {
        if (LOG_LEVEL >= LOG_LEVELS.WARN) {
            console.warn(`[${this.module}] WARN:`, message, ...args);
        }
    }

    info(message, ...args) {
        if (LOG_LEVEL >= LOG_LEVELS.INFO) {
            console.log(`[${this.module}] INFO:`, message, ...args);
        }
    }

    debug(message, ...args) {
        if (LOG_LEVEL >= LOG_LEVELS.DEBUG) {
            console.log(`[${this.module}] DEBUG:`, message, ...args);
        }
    }

    // Special method for authentication logging (only in development)
    auth(message, ...args) {
        if (process.env.NODE_ENV === 'development' && LOG_LEVEL >= LOG_LEVELS.DEBUG) {
            console.log(`[${this.module}] AUTH:`, message, ...args);
        }
    }
}

// Create logger instances for different modules
const authLogger = new Logger('Auth');
const userLogger = new Logger('UserManagement');
const ticketLogger = new Logger('TicketManagement');
const appLogger = new Logger('App');

module.exports = {
    Logger,
    authLogger,
    userLogger,
    ticketLogger,
    appLogger,
    LOG_LEVELS,
    LOG_LEVEL
};
