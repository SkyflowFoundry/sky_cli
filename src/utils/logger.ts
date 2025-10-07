/**
 * Simple logger utility that controls output based on verbosity level
 */

let isVerbose = false;

/**
 * Set the global verbose flag
 */
export const setVerbose = (verbose: boolean): void => {
  isVerbose = verbose;
};

/**
 * Get the current verbose state
 */
export const isVerboseMode = (): boolean => {
  return isVerbose;
};

/**
 * Log messages only when in verbose mode
 */
export const verboseLog = (...args: any[]): void => {
  if (isVerbose) {
    console.log(...args);
  }
};

/**
 * Log warnings only when in verbose mode
 */
export const verboseWarn = (...args: any[]): void => {
  if (isVerbose) {
    console.warn(...args);
  }
};

/**
 * Log errors (these always show regardless of verbose mode, but may be more detailed in verbose mode)
 */
export const errorLog = (message: string, details?: any): void => {
  if (isVerbose && details) {
    console.error(`ERROR: ${message}`, details);
  } else {
    console.error(`ERROR: ${message}`);
  }
};

/**
 * Alias for verboseLog for consistency
 */
export const logVerbose = verboseLog;

/**
 * Alias for errorLog for consistency
 */
export const logError = errorLog;
