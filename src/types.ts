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

// Insert command types
export interface InsertCommandOptions {
  table: string;
  data?: string;
  returnTokens?: boolean;
  continueOnError?: boolean;
  upsertColumn?: string;
  vaultId?: string;
  clusterId?: string;
  environment?: string;
}

export interface InsertData {
  [key: string]: unknown;
}

// Deidentify command types
export interface DeidentifyCommandOptions {
  text?: string;
  entities?: string;
  tokenType?: 'vault_token' | 'entity_only' | 'random_token';
  output?: 'text' | 'json';
  vaultId?: string;
  clusterId?: string;
  environment?: string;
}

// Reidentify command types
export interface ReidentifyCommandOptions {
  text?: string;
  plainText?: string;
  masked?: string;
  redacted?: string;
  output?: 'text' | 'json';
  vaultId?: string;
  clusterId?: string;
  environment?: string;
}
