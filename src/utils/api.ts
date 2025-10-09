import axios from 'axios';
import fs from 'fs';
import { VaultOptions, ServiceAccount, Role, VaultResponse, Connection, CreateConnectionResponse } from '../types';
import { verboseLog, verboseWarn, errorLog } from './logger';

const API_BASE_URL = 'https://manage.skyflowapis.com/v1';

// Configuration for API requests
let token: string | null = null;
let accountId: string | null = null;

// Interface for vault template
export interface VaultTemplate {
  ID: string;
  name: string;
  description?: string;
}

// Interface for workspace
export interface Workspace {
  ID: string;
  name: string;
  displayName: string;
  description?: string;
  url: string;
  type: string;
  regionID: string;
  status: string;
}

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

// Fetch all vault templates
export const getVaultTemplates = async (): Promise<VaultTemplate[]> => {
  try {
    verboseLog('Fetching vault templates...');
    const response = await axios.get(
      `${API_BASE_URL}/vault-templates`,
      {
        headers: getHeaders(),
        params: {
          accountID: accountId
        }
      }
    );

    verboseLog('Vault templates API response:');
    verboseLog(JSON.stringify(response.data, null, 2));

    if (!response.data.vaultTemplates || !Array.isArray(response.data.vaultTemplates)) {
      errorLog('Unexpected templates response format', response.data);
      throw new Error('Invalid template data format from API');
    }

    return response.data.vaultTemplates;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      errorLog(`Template API error: ${error.response.status}`, error.response.data);
      throw new Error(`Get vault templates failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    errorLog('Template API unexpected error', error);
    throw new Error(`Get vault templates failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Fetch all workspaces for an account
export const getWorkspaces = async (bearerToken: string, accountID: string): Promise<Workspace[]> => {
  try {
    verboseLog('Fetching workspaces...');
    const response = await axios.get(
      `${API_BASE_URL}/workspaces`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'X-SKYFLOW-ACCOUNT-ID': accountID,
          'Content-Type': 'application/json'
        }
      }
    );

    verboseLog('Workspaces API response:');
    verboseLog(JSON.stringify(response.data, null, 2));

    if (!response.data.workspaces || !Array.isArray(response.data.workspaces)) {
      errorLog('Unexpected workspaces response format', response.data);
      throw new Error('Invalid workspace data format from API');
    }

    const workspaces: Workspace[] = response.data.workspaces;

    verboseLog(`Found ${workspaces.length} workspace(s)`);
    return workspaces;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      errorLog(`Workspaces API error: ${error.response.status}`, error.response.data);
      throw new Error(`Get workspaces failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    errorLog('Workspaces API unexpected error', error);
    throw new Error(`Get workspaces failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Helper function to extract cluster ID from workspace URL
const extractClusterIdFromUrl = (url: string): string => {
  // Extract the first segment before .vault.skyflowapis.com
  const match = url.match(/^([^.]+)\.vault\.skyflowapis/);
  if (match && match[1]) {
    return match[1];
  }
  // If no match, return the whole URL (fallback)
  return url;
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

    // Fetch workspace details to get vault URL and cluster ID
    verboseLog('Fetching workspace details to populate vault URL and cluster ID...');
    verboseLog(`Token available: ${!!token}, AccountId available: ${!!accountId}`);
    let vaultURL = '';
    let clusterID = '';

    try {
      if (!token || !accountId) {
        console.warn('Warning: Unable to fetch workspace details - authentication not configured');
        verboseLog('Token or accountId not set in API module');
      } else {
        verboseLog(`Calling getWorkspaces with accountId: ${accountId}, workspaceID: ${workspaceID}`);
        const workspaces = await getWorkspaces(token, accountId);
        verboseLog(`Fetched ${workspaces.length} workspace(s)`);

        console.log(`\nDEBUG: Looking for workspace ID: ${workspaceID}`);
        console.log(`DEBUG: Available workspaces:`);
        workspaces.forEach(ws => {
          console.log(`  - ID: ${ws.ID}`);
          console.log(`    Name: ${ws.displayName} (${ws.name})`);
          console.log(`    URL: ${ws.url}`);
          console.log(`    Type: ${ws.type}`);
        });

        const workspace = workspaces.find(ws => ws.ID === workspaceID);

        if (workspace) {
          vaultURL = `https://${workspace.url}`;
          clusterID = extractClusterIdFromUrl(workspace.url);
          verboseLog(`Found workspace details - URL: ${vaultURL}, Cluster ID: ${clusterID}`);
          console.log(`\nMatched workspace: ${workspace.displayName}`);
          console.log(`Vault URL: ${vaultURL}`);
          console.log(`Cluster ID: ${clusterID}`);
        } else {
          console.warn(`\nWarning: Workspace ${workspaceID} not found in available workspaces`);
        }
      }
    } catch (error) {
      console.warn(`Warning: Failed to fetch workspace details: ${error instanceof Error ? error.message : String(error)}`);
      verboseLog(`Full error: ${JSON.stringify(error, null, 2)}`);
      // Continue without vault URL and cluster ID - non-critical
    }

    // Build the vault response using the input parameters and the ID from the response
    const vaultResponse = {
      vaultID: vaultId,
      name: name || '', // Use the input name
      description: description || '', // Use the input description
      vaultURL,
      clusterID,
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

// Create a new connection
export const createConnection = async (connection: Connection): Promise<CreateConnectionResponse> => {
  try {
    verboseLog('Creating connection with payload:');
    verboseLog(JSON.stringify(connection, null, 2));
    const route = connection.mode == "EGRESS" ? 'outboundRoutes' : 'inboundRoutes';
    const response = await axios.post(
      `${API_BASE_URL}/gateway/${route}`,
      connection,
      { headers: getHeaders() }
    );

    verboseLog('Connection creation API response:');
    verboseLog(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      errorLog(`Connection creation failed: ${error.response.status}`, error.response.data);
      throw new Error(`Connection creation failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    errorLog('Connection creation unexpected error', error);
    throw new Error(`Connection creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};
