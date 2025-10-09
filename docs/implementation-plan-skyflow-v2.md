# Implementation Plan: Skyflow Node v2 SDK Integration

## Overview
This document outlines the plan to integrate the skyflow-node v2 SDK into the CLI, adding three new commands: `insert`, `deidentify`, and `reidentify`.

## Phase 1: SDK Setup & Configuration

### 1.1 Install Dependencies
- SDK already installed (`skyflow-node: ^2.3.0`)
- Verify package.json has correct version

### 1.2 Create Shared SDK Utilities (`src/utils/skyflow.ts`)
- `initializeSkyflowClient()` - Initialize Skyflow client from config
- `loadSkyflowCredentials()` - Load credentials from config/environment
- `handleSkyflowError()` - Centralized error handling for SkyflowError

### 1.3 Update Types (`src/types.ts`)
- Add interfaces for Insert, Deidentify, Reidentify operations
- Add DetectEntity enums and token type definitions

### 1.4 Extend Configuration
- Update `~/.skyflow/config.json` schema to include:
  - `clusterId` (extracted from vault URL)
  - `environment` (PROD, SANDBOX, STAGE, DEV)
  - Credentials storage options

## Phase 2: Command Implementation

### 2.1 Insert Command (`src/commands/insert.ts`)
**Purpose**: Insert sensitive data into vault table

**Required Options**:
- `--table <name>` - Target table name
- `--data <json>` - JSON data to insert

**Optional Options**:
- `--return-tokens` - Return tokens for inserted data
- `--continue-on-error` - Continue if some records fail
- `--upsert-column <name>` - Column name for upsert operations

**Flow**:
1. Parse JSON data or accept from stdin
2. Initialize Skyflow client with vault config
3. Create `InsertRequest` with table and data
4. Configure `InsertOptions` based on flags
5. Execute insert and display tokens/IDs

**Example Usage**:
```bash
sky-cli insert --table credit_cards --data '{"card_number":"4111111111111111"}' --return-tokens
```

### 2.2 Deidentify Command (`src/commands/deidentify.ts`)
**Purpose**: Detect and redact sensitive data from text

**Required Options**:
- `--text <string>` - Text to deidentify (or accept from stdin)

**Optional Options**:
- `--entities <list>` - Comma-separated entity types to detect (SSN, CREDIT_CARD, EMAIL, etc.)
- `--token-type <type>` - Token format: vault_token, entity_only, random_token
- `--output <format>` - Output format: text, json

**Flow**:
1. Accept text from flag or stdin
2. Initialize Detect API client
3. Create `DeidentifyTextRequest`
4. Configure entities (SSN, CREDIT_CARD, EMAIL, etc.)
5. Set token format (VAULT_TOKEN, ENTITY_ONLY, RANDOM_TOKEN)
6. Execute and display processed text + entity metadata

**Example Usage**:
```bash
sky-cli deidentify --text "My SSN is 123-45-6789" --entities SSN,CREDIT_CARD
echo "sensitive data" | sky-cli deidentify --entities EMAIL,PHONE_NUMBER
```

### 2.3 Reidentify Command (`src/commands/reidentify.ts`)
**Purpose**: Restore original values from tokenized text

**Required Options**:
- `--text <string>` - Tokenized text to reidentify (or accept from stdin)

**Optional Options**:
- `--plain-text <entities>` - Entities to return as plain text
- `--masked <entities>` - Entities to return masked
- `--redacted <entities>` - Entities to keep redacted

**Flow**:
1. Accept tokenized text from flag or stdin
2. Initialize Detect API client
3. Create `ReidentifyTextRequest`
4. Configure entity display options
5. Execute and display restored text

**Example Usage**:
```bash
sky-cli reidentify --text "My SSN is [SSN_0ykQWPA]" --plain-text SSN
echo "[token] data" | sky-cli reidentify
```

## Phase 3: Integration & Testing

### 3.1 Update Main CLI (`src/index.ts`)
- Register new commands: `insert`, `deidentify`, `reidentify`
- Add pre-action hooks for credential validation

### 3.2 Add Prompts
- Interactive mode for missing required options
- Entity selection prompt for deidentify (multi-select)

### 3.3 Error Handling
- Implement SkyflowError handling
- User-friendly error messages
- Proper exit codes

### 3.4 Documentation
- Update README with new command examples
- Add usage examples for each command
- Document configuration requirements

## Phase 4: Enhancements

### 4.1 Batch Operations
- Support file input for bulk insert operations
- Process multiple texts for deidentify/reidentify

### 4.2 Output Formatting
- JSON output mode (`--json`)
- Table format for structured data
- Quiet mode for scripting

### 4.3 Advanced Features
- Date shifting transformations for deidentify
- Regex allow/restrict lists
- Upsert support for insert

## Technical Details

### Authentication Priority (from SDK docs)
1. Credentials in vault config
2. Skyflow credentials in client config
3. `SKYFLOW_CREDENTIALS` environment variable

### Client Initialization Pattern
```typescript
import { Skyflow, VaultConfig, Env, LogLevel } from 'skyflow-node';

const vaultConfig: VaultConfig = {
  vaultId: config.vaultId,
  clusterId: config.clusterId,
  env: Env.PROD,
  credentials: { apiKey: config.apiKey }
};

const skyflowClient = new Skyflow({
  vaultConfigs: [vaultConfig],
  logLevel: verbose ? LogLevel.INFO : LogLevel.ERROR
});
```

### Entity Types Available
- SSN
- CREDIT_CARD (alias: CREDIT_CARD_NUMBER)
- EMAIL
- PHONE_NUMBER
- NAME
- DOB
- ACCOUNT_NUMBER
- DRIVER_LICENSE
- PASSPORT_NUMBER
- And more...

### Token Types
- `VAULT_TOKEN` - Stored in vault, returns token reference
- `ENTITY_ONLY` - Returns entity type only (e.g., `[SSN]`)
- `RANDOM_TOKEN` - Generates random token without vault storage

### Insert Operation Details
```typescript
import { InsertRequest, InsertOptions, InsertResponse } from 'skyflow-node';

const insertData = [{ field: 'value' }];
const insertReq = new InsertRequest('table_name', insertData);
const insertOptions = new InsertOptions();
insertOptions.setReturnTokens(true);
insertOptions.setContinueOnError(true);

const response: InsertResponse = await skyflowClient
  .vault(vaultId)
  .insert(insertReq, insertOptions);
```

### Deidentify Operation Details
```typescript
import {
  DeidentifyTextRequest,
  DeidentifyTextOptions,
  DetectEntities,
  TokenFormat,
  TokenType
} from 'skyflow-node';

const request = new DeidentifyTextRequest('text to process');
const options = new DeidentifyTextOptions();
options.setEntities([DetectEntities.SSN, DetectEntities.CREDIT_CARD]);

const tokenFormat = new TokenFormat();
tokenFormat.setDefault(TokenType.VAULT_TOKEN);
options.setTokenFormat(tokenFormat);

const response = await skyflowClient
  .detect(vaultId)
  .deidentifyText(request, options);
```

### Reidentify Operation Details
```typescript
import {
  ReidentifyTextRequest,
  ReidentifyTextOptions,
  DetectEntities
} from 'skyflow-node';

const request = new ReidentifyTextRequest('[token] text');
const options = new ReidentifyTextOptions();
options.setPlainTextEntities([DetectEntities.SSN]);
options.setMaskedEntities([DetectEntities.CREDIT_CARD]);

const response = await skyflowClient
  .detect(vaultId)
  .reidentifyText(request, options);
```

### Error Handling Pattern
```typescript
import { SkyflowError } from 'skyflow-node';

try {
  // Skyflow operation
} catch (error) {
  if (error instanceof SkyflowError) {
    console.error('Skyflow Error:', {
      code: error.error?.http_code,
      message: error.message,
      details: error.error?.details,
      requestId: error.error?.request_ID
    });
  } else {
    console.error('Unexpected Error:', error);
  }
}
```

## Configuration Schema Extension

Update `~/.skyflow/config.json` to include:

```json
{
  "accountId": "existing field",
  "apiKey": "existing field",
  "vaultId": "existing field",
  "vaultUrl": "existing field",
  "clusterId": "extracted from vaultUrl",
  "environment": "PROD",
  "credentials": {
    "type": "apiKey",
    "value": "..."
  }
}
```

## Estimated Implementation Timeline

1. Create `src/utils/skyflow.ts` utilities - **30 minutes**
2. Implement insert command - **45 minutes**
3. Implement deidentify command - **45 minutes**
4. Implement reidentify command - **30 minutes**
5. Integration, testing, documentation - **60 minutes**

**Total**: ~3.5 hours for core functionality

## Dependencies

Current `package.json` already includes:
```json
{
  "skyflow-node": "^2.3.0"
}
```

No additional dependencies required for core functionality.

## References

- Local SDK Documentation: `/docs/skyflow-node/readme.md`
- Local SDK Samples: `/docs/skyflow-node/samples/`
- GitHub Samples (v2.0.0): https://github.com/skyflowapi/skyflow-node/tree/2.0.0/samples
