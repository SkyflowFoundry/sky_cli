import {
  Skyflow,
  Credentials,
  VaultConfig,
  SkyflowConfig,
  Env,
  LogLevel,
  SkyflowError,
} from 'skyflow-node';
import { loadConfig } from './config';
import { logError, logVerbose } from './logger';

/**
 * Load Skyflow credentials from configuration or environment
 */
export const loadSkyflowCredentials = (): Credentials => {
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
  const config = loadConfig();
  if (config.bearerToken) {
    return { token: config.bearerToken };
  }

  throw new Error(
    'No Skyflow credentials found. Please set one of:\n' +
    '  - SKYFLOW_API_KEY environment variable\n' +
    '  - SKYFLOW_CREDENTIALS_PATH environment variable\n' +
    '  - SKYFLOW_CREDENTIALS environment variable\n' +
    '  - Or run: sky configure'
  );
};

/**
 * Extract cluster ID from vault URL
 * Example: https://ebfc9bee4242.vault.skyflowapis.com -> ebfc9bee4242
 */
export const extractClusterIdFromUrl = (vaultUrl: string): string => {
  const match = vaultUrl.match(/https?:\/\/([^.]+)\.vault\.skyflowapis/);
  if (!match || !match[1]) {
    throw new Error(`Invalid vault URL format: ${vaultUrl}`);
  }
  return match[1];
};

/**
 * Parse environment string to Env enum
 */
export const parseEnvironment = (env?: string): Env => {
  const envUpper = (env || 'PROD').toUpperCase();
  switch (envUpper) {
    case 'PROD':
    case 'PRODUCTION':
      return Env.PROD;
    case 'SANDBOX':
      return Env.SANDBOX;
    case 'STAGE':
    case 'STAGING':
      return Env.STAGE;
    case 'DEV':
    case 'DEVELOPMENT':
      return Env.DEV;
    default:
      logVerbose(`Unknown environment '${env}', defaulting to PROD`);
      return Env.PROD;
  }
};

/**
 * Initialize Skyflow client with vault configuration
 */
export const initializeSkyflowClient = (
  vaultId: string,
  clusterId?: string,
  environment?: string,
  verbose = false
): Skyflow => {
  logVerbose('Initializing Skyflow client...');

  // Load credentials
  const credentials = loadSkyflowCredentials();
  logVerbose('Credentials loaded successfully');

  // If no cluster ID provided, try to get from config or environment
  let resolvedClusterId = clusterId;
  if (!resolvedClusterId) {
    const vaultUrl = process.env.SKYFLOW_VAULT_URL;
    if (vaultUrl) {
      resolvedClusterId = extractClusterIdFromUrl(vaultUrl);
      logVerbose(`Cluster ID extracted from vault URL: ${resolvedClusterId}`);
    } else {
      throw new Error(
        'Cluster ID not provided. Please provide --cluster-id or set SKYFLOW_VAULT_URL environment variable'
      );
    }
  }

  // Parse environment
  const env = parseEnvironment(environment);
  logVerbose(`Using environment: ${environment || 'PROD'}`);

  // Create vault configuration
  const vaultConfig: VaultConfig = {
    vaultId,
    clusterId: resolvedClusterId,
    env,
    credentials,
  };

  // Create Skyflow configuration
  const skyflowConfig: SkyflowConfig = {
    vaultConfigs: [vaultConfig],
    skyflowCredentials: credentials,
    logLevel: verbose ? LogLevel.INFO : LogLevel.ERROR,
  };

  // Initialize and return client
  const client = new Skyflow(skyflowConfig);
  logVerbose('Skyflow client initialized successfully');

  return client;
};

/**
 * Handle Skyflow-specific errors with user-friendly messages
 */
export const handleSkyflowError = (error: unknown): never => {
  if (error instanceof SkyflowError) {
    const errorInfo = error.error;
    const message = error.message;

    // Build detailed error message
    const errorParts: string[] = ['Skyflow API Error:'];

    if (errorInfo?.http_code) {
      errorParts.push(`  HTTP Code: ${errorInfo.http_code}`);
    }

    if (message) {
      errorParts.push(`  Message: ${message}`);
    }

    if (errorInfo?.details && Array.isArray(errorInfo.details)) {
      errorParts.push(`  Details: ${errorInfo.details.join(', ')}`);
    }

    if (errorInfo?.request_ID) {
      errorParts.push(`  Request ID: ${errorInfo.request_ID}`);
    }

    logError(errorParts.join('\n'));
    process.exit(1);
  } else if (error instanceof Error) {
    logError(`Error: ${error.message}`);
    process.exit(1);
  } else {
    logError(`Unknown error: ${String(error)}`);
    process.exit(1);
  }
};

/**
 * Get vault ID from options or environment
 */
export const resolveVaultId = (vaultId?: string): string => {
  if (vaultId) {
    return vaultId;
  }

  const envVaultId = process.env.SKYFLOW_VAULT_ID;
  if (envVaultId) {
    return envVaultId;
  }

  throw new Error(
    'Vault ID not provided. Please provide --vault-id or set SKYFLOW_VAULT_ID environment variable'
  );
};
