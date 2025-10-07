"use strict";
/**
 * Simple logger utility that controls output based on verbosity level
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.logVerbose = exports.errorLog = exports.verboseWarn = exports.verboseLog = exports.isVerboseMode = exports.setVerbose = void 0;
let isVerbose = false;
/**
 * Set the global verbose flag
 */
const setVerbose = (verbose) => {
    isVerbose = verbose;
};
exports.setVerbose = setVerbose;
/**
 * Get the current verbose state
 */
const isVerboseMode = () => {
    return isVerbose;
};
exports.isVerboseMode = isVerboseMode;
/**
 * Log messages only when in verbose mode
 */
const verboseLog = (...args) => {
    if (isVerbose) {
        console.log(...args);
    }
};
exports.verboseLog = verboseLog;
/**
 * Log warnings only when in verbose mode
 */
const verboseWarn = (...args) => {
    if (isVerbose) {
        console.warn(...args);
    }
};
exports.verboseWarn = verboseWarn;
/**
 * Log errors (these always show regardless of verbose mode, but may be more detailed in verbose mode)
 */
const errorLog = (message, details) => {
    if (isVerbose && details) {
        console.error(`ERROR: ${message}`, details);
    }
    else {
        console.error(`ERROR: ${message}`);
    }
};
exports.errorLog = errorLog;
/**
 * Alias for verboseLog for consistency
 */
exports.logVerbose = exports.verboseLog;
/**
 * Alias for errorLog for consistency
 */
exports.logError = exports.errorLog;
