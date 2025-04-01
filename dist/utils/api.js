"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyVaultAccess = exports.assignRoleToServiceAccount = exports.getVaultRoles = exports.createServiceAccount = exports.createVault = exports.configure = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("./logger");
const API_BASE_URL = 'https://manage.skyflowapis.com/v1';
// Configuration for API requests
let token = null;
let accountId = null;
const configure = (bearerToken, skyflowAccountId) => {
    token = bearerToken;
    accountId = skyflowAccountId;
};
exports.configure = configure;
// Shared headers for Skyflow API requests
const getHeaders = (customToken) => {
    if (!token && !customToken) {
        throw new Error('API not configured. Please set token and account ID first.');
    }
    return {
        'Authorization': `Bearer ${customToken || token}`,
        'X-SKYFLOW-ACCOUNT-ID': accountId,
        'Content-Type': 'application/json'
    };
};
// Create a new vault
const createVault = async (options) => {
    const { name, description, template, schema, workspaceID } = options;
    if (!workspaceID) {
        throw new Error('Workspace ID is required for vault creation');
    }
    let vaultSchema = undefined;
    if (schema) {
        try {
            const schemaContent = fs_1.default.readFileSync(schema, 'utf8');
            vaultSchema = JSON.parse(schemaContent);
        }
        catch (error) {
            throw new Error(`Failed to read schema file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    try {
        const payload = {
            name,
            description: description || `Vault created with Sky CLI on ${new Date().toISOString()}`,
            workspaceID
        };
        if (vaultSchema) {
            payload.vaultSchema = vaultSchema;
        }
        else if (template) {
            payload.templateID = template;
        }
        const response = await axios_1.default.post(`${API_BASE_URL}/vaults`, payload, { headers: getHeaders() });
        // Log the full API response for debugging (only in verbose mode)
        (0, logger_1.verboseLog)('API Response from vault creation:');
        (0, logger_1.verboseLog)(JSON.stringify(response.data, null, 2));
        // According to the API documentation, the vault creation response just contains an ID field
        // Extract the vault ID from the response
        let vaultId;
        if (typeof response.data === 'string') {
            // If the response is just a string, use it as the ID
            vaultId = response.data;
        }
        else if (response.data && typeof response.data === 'object') {
            // Check all possible field names for the ID
            const possibleIdFields = ['id', 'vaultID', 'vault_id', 'ID'];
            for (const field of possibleIdFields) {
                if (response.data[field]) {
                    (0, logger_1.verboseLog)(`Found vault ID in field "${field}": ${response.data[field]}`);
                    vaultId = response.data[field];
                    break;
                }
            }
        }
        if (!vaultId) {
            (0, logger_1.errorLog)('Could not find vault ID in the API response', { responseData: response.data });
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
        (0, logger_1.verboseLog)('Mapped vault response:');
        (0, logger_1.verboseLog)(JSON.stringify(vaultResponse, null, 2));
        return vaultResponse;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error) && error.response) {
            throw new Error(`Vault creation failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        }
        throw new Error(`Vault creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
};
exports.createVault = createVault;
// Create a service account
const createServiceAccount = async (name) => {
    try {
        const response = await axios_1.default.post(`${API_BASE_URL}/serviceAccounts`, {
            apiKeyEnabled: true,
            serviceAccount: {
                name,
                description: `Service account created with Sky CLI for ${name} vault`
            }
        }, { headers: getHeaders() });
        return {
            clientID: response.data.clientID,
            clientName: response.data.clientName,
            apiKeyID: response.data.apiKeyID,
            apiKey: response.data.apiKey
        };
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error) && error.response) {
            throw new Error(`Service account creation failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        }
        throw new Error(`Service account creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
};
exports.createServiceAccount = createServiceAccount;
// Get roles for a vault
const getVaultRoles = async (vaultId) => {
    if (!vaultId) {
        (0, logger_1.errorLog)('getVaultRoles called with empty vaultId');
        throw new Error('Vault ID is required to fetch roles');
    }
    (0, logger_1.verboseLog)(`Fetching roles for vault ID: ${vaultId}`);
    try {
        const url = `${API_BASE_URL}/roles?resource.type=VAULT&resource.ID=${vaultId}`;
        (0, logger_1.verboseLog)(`Making GET request to: ${url}`);
        const response = await axios_1.default.get(url, { headers: getHeaders() });
        (0, logger_1.verboseLog)('Role API Response:');
        (0, logger_1.verboseLog)(JSON.stringify(response.data, null, 2));
        if (!response.data.roles || !Array.isArray(response.data.roles)) {
            (0, logger_1.errorLog)('Unexpected roles response format', response.data);
            throw new Error('Invalid role data format from API');
        }
        (0, logger_1.verboseLog)(`Found ${response.data.roles.length} roles for vault`);
        return response.data.roles;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error) && error.response) {
            (0, logger_1.errorLog)(`Role API error: ${error.response.status}`, error.response.data);
            throw new Error(`Get vault roles failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        }
        (0, logger_1.errorLog)('Role API unexpected error', error);
        throw new Error(`Get vault roles failed: ${error instanceof Error ? error.message : String(error)}`);
    }
};
exports.getVaultRoles = getVaultRoles;
// Assign a role to a service account
const assignRoleToServiceAccount = async (roleId, serviceAccountId) => {
    try {
        const response = await axios_1.default.post(`${API_BASE_URL}/roles/assign`, {
            ID: roleId,
            members: [
                {
                    ID: serviceAccountId,
                    type: 'SERVICE_ACCOUNT'
                }
            ]
        }, { headers: getHeaders() });
        return response.data.ID;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error) && error.response) {
            throw new Error(`Role assignment failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        }
        throw new Error(`Role assignment failed: ${error instanceof Error ? error.message : String(error)}`);
    }
};
exports.assignRoleToServiceAccount = assignRoleToServiceAccount;
// Verify a service account has access to a vault
const verifyVaultAccess = async (vaultId, apiKey) => {
    try {
        await axios_1.default.get(`${API_BASE_URL}/vaults/${vaultId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'X-SKYFLOW-ACCOUNT-ID': accountId
            }
        });
        return true;
    }
    catch (error) {
        return false;
    }
};
exports.verifyVaultAccess = verifyVaultAccess;
