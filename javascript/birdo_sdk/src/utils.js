/**
 * Utility functions shared across browser and Node.js implementations
 */

export function validateOptions(options) {
  if (!options || typeof options !== 'object') {
    throw new Error('Options must be an object');
  }

  if (!options.apiKey || typeof options.apiKey !== 'string') {
    throw new Error('API key is required and must be a string');
  }

  if (!options.serverName || typeof options.serverName !== 'string') {
    throw new Error('Server name is required and must be a string');
  }

  return {
    apiKey: options.apiKey,
    serverName: options.serverName,
    endpoint: sanitizeEndpoint(options.endpoint),
    interval: sanitizeInterval(options.interval),
    maxRetries: sanitizeNumber(options.maxRetries, 3, 1, 10),
    timeout: sanitizeNumber(options.timeout, 10000, 1000, 30000),
    logger: getValidLogger(options.logger)
  };
}

function sanitizeEndpoint(endpoint) {
  const defaultEndpoint = 'https://dashboard.birdo.uk';
  
  if (!endpoint) return defaultEndpoint;
  
  try {
    const url = new URL(endpoint);
    return url.origin;
  } catch (e) {
    console.warn(`Invalid endpoint "${endpoint}", using default`);
    return defaultEndpoint;
  }
}

function sanitizeInterval(interval) {
  const defaultInterval = 5000; // 5 seconds
  const minInterval = 1000; // 1 second
  const maxInterval = 60000; // 1 minute
  
  return sanitizeNumber(interval, defaultInterval, minInterval, maxInterval);
}

function sanitizeNumber(value, defaultValue, min, max) {
  const num = Number(value);
  if (isNaN(num)) return defaultValue;
  return Math.min(max, Math.max(min, num));
}

function getValidLogger(logger) {
  const noop = () => {};
  const consoleLogger = {
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: noop
  };

  if (!logger) return consoleLogger;

  return {
    info: typeof logger.info === 'function' ? logger.info : consoleLogger.info,
    warn: typeof logger.warn === 'function' ? logger.warn : consoleLogger.warn,
    error: typeof logger.error === 'function' ? logger.error : consoleLogger.error,
    debug: typeof logger.debug === 'function' ? logger.debug : noop
  };
}

export function calculateRates(prev, current, timeDiff) {
  if (!prev || !current || timeDiff <= 0) return { rate: 0, perSecond: 0 };

  const delta = current - prev;
  const rate = delta / timeDiff;
  const perSecond = rate * 1000; // Convert to per second

  return { rate, perSecond };
}

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function deepMerge(target, source) {
  if (!isObject(target) || !isObject(source)) {
    return source;
  }

  const output = { ...target };
  
  Object.keys(source).forEach(key => {
    if (isObject(source[key]) && key in target) {
      output[key] = deepMerge(target[key], source[key]);
    } else {
      output[key] = source[key];
    }
  });

  return output;
}