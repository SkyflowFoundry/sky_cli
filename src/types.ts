export interface VaultOptions {
  name?: string;
  template?: string;
  description?: string;
  masterKey?: string;
  createServiceAccount?: boolean;
  schema?: string;
  workspaceID: string; // Required for vault creation
}

export interface ServiceAccount {
  clientID: string;
  clientName: string;
  apiKeyID: string;
  apiKey: string;
}

export interface Role {
  ID: string;
  definition: {
    name: string;
    displayName: string;
    description: string;
  };
}

export interface VaultResponse {
  vaultID: string;
  name: string;
  description: string;
  vaultURL: string;
  clusterID: string;
  workspaceID: string;
}

export interface CreateVaultResult {
  vault: VaultResponse;
  serviceAccount?: ServiceAccount;
  serviceAccountID?: string;
  serviceAccountApiKey?: string;
}
