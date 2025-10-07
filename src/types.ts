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
export interface FunctionInfo {
  deploymentID: string;
  method: string;
  template: "NO_TEMPLATE" | "HTTP_TEMPLATE";
}
// Connection-related interfaces
export interface FieldMappingConfig {
  action: "NOT_SELECTED" | "TOKENIZATION" | "DETOKENIZATION" | "ENCRYPTION";
  fieldName: string;
  table: string;
  column: string;
  dataSelector: string;
  dataSelectorRegex: string;
  transformFormat: string;
  encryptionType: string;
  redaction: "DEFAULT" | "REDACTED" | "MASKED" | "PLAIN_TEXT";
  functionName?: string;
  functionInfo: FunctionInfo | null;
  sourceRegex: string;
  transformedRegex: string;
}

export interface MessageAction {
  type: "NOACTION" | "ENCRYPTION" | "DECRYPTION" | "SIGN" | "VERIFY" | "FIND_AND_REPLACE";
  action: string;
  keyEncryptionAlgo: string;
  contentEncryptionAlgo: string;
  signatureAlgorithm: string;
  sourceRegex: string;
  transformedRegex: string;
  target: string
}

export interface TableUpsertInfo {
  table: string;
  column: string;
}

export interface RouteConfig {
  path: string;
  method: string;
  contentType:
    | "JSON"
    | "XML"
    | "X_WWW_FORM_URLENCODED"
    | "X_MULTIPART_FORM_DATA"
    | "UNKNOWN_CONTENT";
  url: FieldMappingConfig[];
  requestBody: FieldMappingConfig[];
  responseBody: FieldMappingConfig[];
  responseHeader: FieldMappingConfig[];
  queryParams: FieldMappingConfig[];
  requestHeader: FieldMappingConfig[];
  name: string;
  description: string;
  soapAction: string;
  mleType: "NOT_REQUIRED" | "MANDATORY";
  preFieldRequestMessageActions: MessageAction[];
  postFieldRequestMessageActions: MessageAction[];
  preFieldResponseMessageActions: MessageAction[];
  postFieldResponseMessageActions: MessageAction[];
  tableUpsertInfo: TableUpsertInfo[];
  invocationURL?: string;
}

export interface ConnectionConfig {
  ID?: string;
  name: string;
  mode?: string;
  baseURL?: string;
  vaultID: string;
  routes: RouteConfig[];
  authMode: "NOAUTH" | "MTLS" | "SHAREDKEY";
  description: string;
  denyPassThrough?: boolean;
  BasicAudit?: object;
  formEncodedKeysPassThrough?: boolean;
}

export type Connection = Omit<ConnectionConfig, "ID"|"BasicAudit"> & { routes: Route[] };
export type Route = Omit<RouteConfig, "invocationURL">;
export interface ConnectionConfigFile {
  connections?: ConnectionConfig[] | ConnectionConfig;
}

export interface CreateConnectionResponse {
  ID?: string;
  connectionURL?: string;
  name?: string;
  status?: "success" | "failed";
  error?: string;
}
