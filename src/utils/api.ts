import axios from 'axios';
import fs from 'fs';
import { VaultOptions, ServiceAccount, Role, VaultResponse, ConnectionConfig, ConnectionResponse } from '../types';
import { verboseLog, verboseWarn, errorLog } from './logger';

const API_BASE_URL = 'https://manage.skyflowapis.com/v1';

// Configuration for API requests
let token: string | null = null;
let accountId: string | null = null;

export const configure = (bearerToken: string, skyflowAccountId: string): void => {
  token = bearerToken;
  accountId = skyflowAccountId;
};

// Shared headers for Skyflow API requests
const getHeaders = (customToken?: string) => {
  if (!token && !customToken) {
    throw new Error('API not configured. Please set token and account ID first.');
  }

  return {
    'Authorization': `Bearer ${customToken || token}`,
    'X-SKYFLOW-ACCOUNT-ID': accountId!,
    'Content-Type': 'application/json'
  };
};

// Create a new vault
export const createVault = async (options: VaultOptions): Promise<VaultResponse> => {
  const { name, description, template, schema, workspaceID } = options;
  
  if (!workspaceID) {
    throw new Error('Workspace ID is required for vault creation');
  }
  
  let vaultSchema = undefined;
  if (schema) {
    try {
      const schemaContent = fs.readFileSync(schema, 'utf8');
      vaultSchema = JSON.parse(schemaContent);
    } catch (error) {
      throw new Error(`Failed to read schema file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    const payload: Record<string, any> = {
      name,
      description: description || `Vault created with Sky CLI on ${new Date().toISOString()}`,
      workspaceID
    };

    if (vaultSchema) {
      payload.vaultSchema = vaultSchema;
    } else if (template) {
      payload.templateID = template;
    }

    const response = await axios.post(
      `${API_BASE_URL}/vaults`,
      payload,
      { headers: getHeaders() }
    );

    // Log the full API response for debugging (only in verbose mode)
    verboseLog('API Response from vault creation:');
    verboseLog(JSON.stringify(response.data, null, 2));

    // According to the API documentation, the vault creation response just contains an ID field
    // Extract the vault ID from the response
    let vaultId: string | undefined;
    
    if (typeof response.data === 'string') {
      // If the response is just a string, use it as the ID
      vaultId = response.data;
    } else if (response.data && typeof response.data === 'object') {
      // Check all possible field names for the ID
      const possibleIdFields = ['id', 'vaultID', 'vault_id', 'ID'];
      
      for (const field of possibleIdFields) {
        if (response.data[field]) {
          verboseLog(`Found vault ID in field "${field}": ${response.data[field]}`);
          vaultId = response.data[field];
          break;
        }
      }
    }
    
    if (!vaultId) {
      errorLog('Could not find vault ID in the API response', { responseData: response.data });
      throw new Error('Vault ID not found in API response');
    }
    
    // Build the vault response using the input parameters and the ID from the response
    const vaultResponse = {
      vaultID: vaultId,
      name: name || '', // Use the input name
      description: description || '', // Use the input description
      vaultURL: '', // This comes from a different API
      clusterID: '', // This comes from a different API
      workspaceID: workspaceID // Use the input workspaceID
    };

    // Log the mapped response (only in verbose mode)
    verboseLog('Mapped vault response:');
    verboseLog(JSON.stringify(vaultResponse, null, 2));

    return vaultResponse;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Vault creation failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Vault creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Create a service account
export const createServiceAccount = async (name: string): Promise<ServiceAccount> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/serviceAccounts`,
      {
        apiKeyEnabled: true,
        serviceAccount: {
          name,
          description: `Service account created with Sky CLI for ${name} vault`
        }
      },
      { headers: getHeaders() }
    );

    return {
      clientID: response.data.clientID,
      clientName: response.data.clientName,
      apiKeyID: response.data.apiKeyID,
      apiKey: response.data.apiKey
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Service account creation failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Service account creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Get roles for a vault
export const getVaultRoles = async (vaultId: string): Promise<Role[]> => {
  if (!vaultId) {
    errorLog('getVaultRoles called with empty vaultId');
    throw new Error('Vault ID is required to fetch roles');
  }
  
  verboseLog(`Fetching roles for vault ID: ${vaultId}`);
  
  try {
    const url = `${API_BASE_URL}/roles?resource.type=VAULT&resource.ID=${vaultId}`;
    verboseLog(`Making GET request to: ${url}`);
    
    const response = await axios.get(url, { headers: getHeaders() });

    verboseLog('Role API Response:');
    verboseLog(JSON.stringify(response.data, null, 2));

    if (!response.data.roles || !Array.isArray(response.data.roles)) {
      errorLog('Unexpected roles response format', response.data);
      throw new Error('Invalid role data format from API');
    }
    
    verboseLog(`Found ${response.data.roles.length} roles for vault`);
    return response.data.roles;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      errorLog(`Role API error: ${error.response.status}`, error.response.data);
      throw new Error(`Get vault roles failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    errorLog('Role API unexpected error', error);
    throw new Error(`Get vault roles failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Assign a role to a service account
export const assignRoleToServiceAccount = async (
  roleId: string, 
  serviceAccountId: string
): Promise<string> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/roles/assign`,
      {
        ID: roleId,
        members: [
          {
            ID: serviceAccountId,
            type: 'SERVICE_ACCOUNT'
          }
        ]
      },
      { headers: getHeaders() }
    );

    return response.data.ID;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Role assignment failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Role assignment failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Verify a service account has access to a vault
export const verifyVaultAccess = async (
  vaultId: string, 
  apiKey: string
): Promise<boolean> => {
  try {
    await axios.get(
      `${API_BASE_URL}/vaults/${vaultId}`,
      { 
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-SKYFLOW-ACCOUNT-ID': accountId!
        }
      }
    );
    
    return true;
  } catch (error) {
    return false;
  }
};

// Create a new connection in a vault
export const createConnection = async (
  vaultId: string,
  connectionConfig: ConnectionConfig
): Promise<ConnectionResponse> => {
  if (!vaultId) {
    throw new Error('Vault ID is required for connection creation');
  }
  
  if (!connectionConfig.name || !connectionConfig.type) {
    throw new Error('Connection name and type are required');
  }
  
  verboseLog(`Creating connection "${connectionConfig.name}" of type "${connectionConfig.type}" in vault ${vaultId}`);
  
  try {
    const payload = {
      name: connectionConfig.name,
      type: connectionConfig.type,
      description: connectionConfig.description || `Connection created with Sky CLI on ${new Date().toISOString()}`,
      settings: connectionConfig.settings || {}
    };
    
    verboseLog('Connection creation payload:');
    verboseLog(JSON.stringify(payload, null, 2));
    
    const response = await axios.post(
      `${API_BASE_URL}/vaults/${vaultId}/connections`,
      payload,
      { headers: getHeaders() }
    );
    
    verboseLog('Connection API Response:');
    verboseLog(JSON.stringify(response.data, null, 2));
    
    // Extract connection ID from response
    let connectionId: string;
    if (typeof response.data === 'string') {
      connectionId = response.data;
    } else if (response.data && typeof response.data === 'object') {
      const possibleIdFields = ['id', 'connectionID', 'connection_id', 'ID'];
      connectionId = '';
      
      for (const field of possibleIdFields) {
        if (response.data[field]) {
          verboseLog(`Found connection ID in field "${field}": ${response.data[field]}`);
          connectionId = response.data[field];
          break;
        }
      }
      
      if (!connectionId) {
        // If no specific ID field found, use the whole response as ID or generate one
        connectionId = response.data.id || response.data.connectionID || `conn-${Date.now()}`;
      }
    } else {
      connectionId = `conn-${Date.now()}`;
    }
    
    const connectionResponse: ConnectionResponse = {
      connectionID: connectionId,
      name: connectionConfig.name,
      type: connectionConfig.type,
      description: connectionConfig.description,
      vaultID: vaultId
    };
    
    verboseLog('Mapped connection response:');  
    verboseLog(JSON.stringify(connectionResponse, null, 2));
    
    return connectionResponse;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Connection creation failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Connection creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};
