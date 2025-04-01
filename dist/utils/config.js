"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveConfig = exports.loadConfig = void 0;
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const api_1 = require("./api");
// Config directory and file
const CONFIG_DIR = path_1.default.join(os_1.default.homedir(), '.skyflow');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'config.json');
// Ensure config directory exists
const ensureConfigDir = () => {
    if (!fs_1.default.existsSync(CONFIG_DIR)) {
        fs_1.default.mkdirSync(CONFIG_DIR, { recursive: true });
    }
};
// Load configuration
const loadConfig = () => {
    // First check environment variables
    const envToken = process.env.SKYFLOW_BEARER_TOKEN;
    const envAccountId = process.env.SKYFLOW_ACCOUNT_ID;
    const envWorkspaceID = process.env.SKYFLOW_WORKSPACE_ID;
    if (envToken && envAccountId) {
        (0, api_1.configure)(envToken, envAccountId);
        return {
            bearerToken: envToken,
            accountId: envAccountId,
            workspaceID: envWorkspaceID
        };
    }
    // Check if config file exists
    ensureConfigDir();
    if (!fs_1.default.existsSync(CONFIG_FILE)) {
        throw new Error('Skyflow CLI is not configured. Please set environment variables:\n' +
            'SKYFLOW_BEARER_TOKEN and SKYFLOW_ACCOUNT_ID\n\n' +
            'Or run: sky configure');
    }
    try {
        const configData = fs_1.default.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(configData);
        if (!config.bearerToken || !config.accountId) {
            throw new Error('Invalid configuration');
        }
        // Configure the API client
        (0, api_1.configure)(config.bearerToken, config.accountId);
        return config;
    }
    catch (error) {
        throw new Error(`Error loading configuration: ${error instanceof Error ? error.message : String(error)}\n` +
            'Please run: sky configure');
    }
};
exports.loadConfig = loadConfig;
// Save configuration
const saveConfig = (config) => {
    ensureConfigDir();
    fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    // Configure the API client
    if (config.bearerToken && config.accountId) {
        (0, api_1.configure)(config.bearerToken, config.accountId);
    }
};
exports.saveConfig = saveConfig;
