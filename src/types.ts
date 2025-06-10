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

// Connection-related interfaces
export interface FieldMapping {
  action: 'NOT_SELECTED' | 'INSERT' | 'UPDATE' | 'DELETE';
  fieldName: string;
  table: string;
  column: string;
  dataSelector: string;
  dataSelectorRegex: string;
  transformFormat: string;
  encryptionType: string;
  redaction: 'DEFAULT' | 'NONE' | 'CUSTOM';
  sourceRegex: string;
  transformedRegex: string;
}

export interface MessageAction {
  type: 'NOACTION' | 'ENCRYPT' | 'DECRYPT' | 'SIGN' | 'VERIFY';
  action: string;
  keyEncryptionAlgo: string;
  contentEncryptionAlgo: string;
  signatureAlgorithm: string;
}

export interface TableUpsertInfo {
  table: string;
  column: string;
}

export interface ConnectionRoute {
  path: string;
  method: string;
  contentType: 'JSON' | 'XML' | 'FORM';
  url: FieldMapping[];
  requestBody: FieldMapping[];
  responseBody: FieldMapping[];
  responseHeader: FieldMapping[];
  queryParams: FieldMapping[];
  requestHeader: FieldMapping[];
  name: string;
  description: string;
  soapAction: string;
  mleType: 'NOT_REQUIRED' | 'REQUIRED';
  preFieldRequestMessageActions: MessageAction[];
  postFieldRequestMessageActions: MessageAction[];
  preFieldResponseMessageActions: MessageAction[];
  postFieldResponseMessageActions: MessageAction[];
  tableUpsertInfo: TableUpsertInfo[];
}

export interface Connection {
  ID?: string;
  name: string;
  baseURL: string;
  vaultID: string;
  routes: ConnectionRoute[];
  authMode: 'NOAUTH' | 'BASIC' | 'BEARER' | 'OAUTH2';
  description: string;
  denyPassThrough: boolean;
}

export interface ConnectionConfigFile {
  connections?: Connection[];
}

export interface CreateConnectionResult {
  connectionID: string;
  name: string;
  status: 'success' | 'failed';
  error?: string;
}
