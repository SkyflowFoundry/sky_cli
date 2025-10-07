"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveVaultId = exports.handleSkyflowError = exports.initializeSkyflowClient = exports.parseEnvironment = exports.extractClusterIdFromUrl = exports.loadSkyflowCredentials = void 0;
const skyflow_node_1 = require("skyflow-node");
const config_1 = require("./config");
const logger_1 = require("./logger");
/**
 * Load Skyflow credentials from configuration or environment
 */
const loadSkyflowCredentials = () => {
    // Check for API key in environment first
    const apiKey = process.env.SKYFLOW_API_KEY;
    if (apiKey) {
        return { apiKey };
    }
    // Check for credentials file path in environment
    const credentialsPath = process.env.SKYFLOW_CREDENTIALS_PATH;
    if (credentialsPath) {
        return { path: credentialsPath };
    }
    // Check for credentials string in environment
    const credentialsString = process.env.SKYFLOW_CREDENTIALS;
    if (credentialsString) {
        return { credentialsString };
    }
    // Fall back to bearer token from config
    const config = (0, config_1.loadConfig)();
    if (config.bearerToken) {
        return { token: config.bearerToken };
    }
    throw new Error('No Skyflow credentials found. Please set one of:\n' +
        '  - SKYFLOW_API_KEY environment variable\n' +
        '  - SKYFLOW_CREDENTIALS_PATH environment variable\n' +
        '  - SKYFLOW_CREDENTIALS environment variable\n' +
        '  - Or run: sky configure');
};
exports.loadSkyflowCredentials = loadSkyflowCredentials;
/**
 * Extract cluster ID from vault URL
 * Example: https://ebfc9bee4242.vault.skyflowapis.com -> ebfc9bee4242
 */
const extractClusterIdFromUrl = (vaultUrl) => {
    const match = vaultUrl.match(/https?:\/\/([^.]+)\.vault\.skyflowapis/);
    if (!match || !match[1]) {
        throw new Error(`Invalid vault URL format: ${vaultUrl}`);
    }
    return match[1];
};
exports.extractClusterIdFromUrl = extractClusterIdFromUrl;
/**
 * Parse environment string to Env enum
 */
const parseEnvironment = (env) => {
    const envUpper = (env || 'PROD').toUpperCase();
    switch (envUpper) {
        case 'PROD':
        case 'PRODUCTION':
            return skyflow_node_1.Env.PROD;
        case 'SANDBOX':
            return skyflow_node_1.Env.SANDBOX;
        case 'STAGE':
        case 'STAGING':
            return skyflow_node_1.Env.STAGE;
        case 'DEV':
        case 'DEVELOPMENT':
            return skyflow_node_1.Env.DEV;
        default:
            (0, logger_1.logVerbose)(`Unknown environment '${env}', defaulting to PROD`);
            return skyflow_node_1.Env.PROD;
    }
};
exports.parseEnvironment = parseEnvironment;
/**
 * Initialize Skyflow client with vault configuration
 */
const initializeSkyflowClient = (vaultId, clusterId, environment, verbose = false) => {
    (0, logger_1.logVerbose)('Initializing Skyflow client...');
    // Load credentials
    const credentials = (0, exports.loadSkyflowCredentials)();
    (0, logger_1.logVerbose)('Credentials loaded successfully');
    // If no cluster ID provided, try to get from config or environment
    let resolvedClusterId = clusterId;
    if (!resolvedClusterId) {
        const vaultUrl = process.env.SKYFLOW_VAULT_URL;
        if (vaultUrl) {
            resolvedClusterId = (0, exports.extractClusterIdFromUrl)(vaultUrl);
            (0, logger_1.logVerbose)(`Cluster ID extracted from vault URL: ${resolvedClusterId}`);
        }
        else {
            throw new Error('Cluster ID not provided. Please provide --cluster-id or set SKYFLOW_VAULT_URL environment variable');
        }
    }
    // Parse environment
    const env = (0, exports.parseEnvironment)(environment);
    (0, logger_1.logVerbose)(`Using environment: ${environment || 'PROD'}`);
    // Create vault configuration
    const vaultConfig = {
        vaultId,
        clusterId: resolvedClusterId,
        env,
        credentials,
    };
    // Create Skyflow configuration
    const skyflowConfig = {
        vaultConfigs: [vaultConfig],
        skyflowCredentials: credentials,
        logLevel: verbose ? skyflow_node_1.LogLevel.INFO : skyflow_node_1.LogLevel.ERROR,
    };
    // Initialize and return client
    const client = new skyflow_node_1.Skyflow(skyflowConfig);
    (0, logger_1.logVerbose)('Skyflow client initialized successfully');
    return client;
};
exports.initializeSkyflowClient = initializeSkyflowClient;
/**
 * Handle Skyflow-specific errors with user-friendly messages
 */
const handleSkyflowError = (error) => {
    if (error instanceof skyflow_node_1.SkyflowError) {
        const errorInfo = error.error;
        const message = error.message;
        // Build detailed error message
        const errorParts = ['Skyflow API Error:'];
        if (errorInfo === null || errorInfo === void 0 ? void 0 : errorInfo.http_code) {
            errorParts.push(`  HTTP Code: ${errorInfo.http_code}`);
        }
        if (message) {
            errorParts.push(`  Message: ${message}`);
        }
        if ((errorInfo === null || errorInfo === void 0 ? void 0 : errorInfo.details) && Array.isArray(errorInfo.details)) {
            errorParts.push(`  Details: ${errorInfo.details.join(', ')}`);
        }
        if (errorInfo === null || errorInfo === void 0 ? void 0 : errorInfo.request_ID) {
            errorParts.push(`  Request ID: ${errorInfo.request_ID}`);
        }
        (0, logger_1.logError)(errorParts.join('\n'));
        process.exit(1);
    }
    else if (error instanceof Error) {
        (0, logger_1.logError)(`Error: ${error.message}`);
        process.exit(1);
    }
    else {
        (0, logger_1.logError)(`Unknown error: ${String(error)}`);
        process.exit(1);
    }
};
exports.handleSkyflowError = handleSkyflowError;
/**
 * Get vault ID from options or environment
 */
const resolveVaultId = (vaultId) => {
    if (vaultId) {
        return vaultId;
    }
    const envVaultId = process.env.SKYFLOW_VAULT_ID;
    if (envVaultId) {
        return envVaultId;
    }
    throw new Error('Vault ID not provided. Please provide --vault-id or set SKYFLOW_VAULT_ID environment variable');
};
exports.resolveVaultId = resolveVaultId;
