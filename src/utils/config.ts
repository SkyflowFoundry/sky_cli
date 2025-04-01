import os from 'os';
import fs from 'fs';
import path from 'path';
import { configure } from './api';

// Config directory and file
const CONFIG_DIR = path.join(os.homedir(), '.skyflow');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Default configuration
interface SkyflowConfig {
  bearerToken?: string;
  accountId?: string;
  workspaceID?: string;
}

// Ensure config directory exists
const ensureConfigDir = (): void => {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
};

// Load configuration
export const loadConfig = (): SkyflowConfig => {
  // First check environment variables
  const envToken = process.env.SKYFLOW_BEARER_TOKEN;
  const envAccountId = process.env.SKYFLOW_ACCOUNT_ID;
  const envWorkspaceID = process.env.SKYFLOW_WORKSPACE_ID;

  if (envToken && envAccountId) {
    configure(envToken, envAccountId);
    return {
      bearerToken: envToken,
      accountId: envAccountId,
      workspaceID: envWorkspaceID
    };
  }
  
  // Check if config file exists
  ensureConfigDir();
  
  if (!fs.existsSync(CONFIG_FILE)) {
    throw new Error(
      'Skyflow CLI is not configured. Please set environment variables:\n' +
      'SKYFLOW_BEARER_TOKEN and SKYFLOW_ACCOUNT_ID\n\n' +
      'Or run: sky configure'
    );
  }
  
  try {
    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(configData) as SkyflowConfig;
    
    if (!config.bearerToken || !config.accountId) {
      throw new Error('Invalid configuration');
    }
    
    // Configure the API client
    configure(config.bearerToken, config.accountId);
    
    return config;
  } catch (error) {
    throw new Error(
      `Error loading configuration: ${error instanceof Error ? error.message : String(error)}\n` +
      'Please run: sky configure'
    );
  }
};

// Save configuration
export const saveConfig = (config: SkyflowConfig): void => {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  
  // Configure the API client
  if (config.bearerToken && config.accountId) {
    configure(config.bearerToken, config.accountId);
  }
};
