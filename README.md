# Skyflow CLI (sky)

> **⚠️ Warning:** This CLI is experimental and unsupported. Use it at your own risk. Contributions and feedback are welcome, but no guarantees are provided for stability or support.

A command-line interface for interacting with the Skyflow data privacy platform. This CLI allows you to manage vaults, service accounts, and other Skyflow resources directly from your terminal.

## Features

- Create and manage vaults
- Create and manage service accounts
- Create and manage connections (inbound/outbound routes)
- Assign roles to service accounts
- Interactive prompts for missing options

## Installation

### Local Development Installation

To use sky-cli, clone the repo from GitHub and then do a local npm installation. Note that you will need to have Node.js installed and configured, see package.json for dependencies.

```bash
# Clone this repository. Make sure the URL is correct.
git clone https://github.com/SkyflowFoundry/sky_cli.git
cd sky-cli

# Install dependencies
npm install

# Build the CLI
npm run build

# Install the cloned CLI globally with npm
npm i -g .
```

## Configuration

Before using the CLI, you need to configure it with your Skyflow credentials:

```bash
sky configure
```

You will be prompted to enter:

1. Your Skyflow Bearer Token
2. Your Skyflow Account ID
3. Your Skyflow Workspace ID (required for vault creation)

You can also set these as environment variables:

```bash
export SKYFLOW_BEARER_TOKEN="your-bearer-token"
export SKYFLOW_ACCOUNT_ID="your-account-id"
export SKYFLOW_WORKSPACE_ID="your-workspace-id"
```

## Usage

### Creating a Vault

The most basic way to create a vault is to run:

```bash
sky create-vault
```

This will prompt you for all necessary information.

### Creating a Vault with Options

You can also specify options directly, for example:

```bash
sky create-vault --name testvault --description "My test vault"
```

#### Available Options

- `--name`: Name for the vault (lowercase, no special characters)
- `--template`: Template to use for the vault
- `--description`: Description for the vault
- `--master-key`: Master encryption key for the vault
- `--create-service-account`: Whether to create a service account (defaults to true)
- `--schema`: Path to JSON schema file for the vault
- `--workspace-id`: Workspace ID for the vault (required, but can be set via configuration)
- `--verbose`: Enable detailed logging for debugging purposes

#### Examples

Using a template:

```bash
sky create-vault --name testvault --template optional-template-name --description "Full string description of the vault."
```

Using a schema file:

```bash
sky create-vault --name testvault --schema /path/to/schema.json
```

Simplest form:

```bash
sky create-vault
```

![prompts](assets/prompts.png)

### Creating Connections

The `create-connection` command allows you to create inbound and outbound connection routes from a JSON configuration file.

#### Basic Usage

```bash
sky create-connection --file-path /path/to/connections.json
```

#### Available Options

- `--file-path <path>`: Path to connection configuration file (required)
- `--vault-id <id>`: ID of the vault (optional if SKYFLOW_VAULT_ID env var is set)
- `--verbose`: Enable detailed logging for debugging purposes

#### Configuration File Format

The configuration file can be either:
1. A direct array of connection configurations
2. An object with a `connections` property containing the array

**Direct Array Format:**
```json
[
  {
    "name": "my-connection",
    "description": "Example connection",
    "mode": "INGRESS",
    "vaultID": "vault-123",
    "authMode": "NOAUTH",
    "routes": [...]
  }
]
```

**Object Format:**
```json
{
  "connections": [
    {
      "name": "my-connection",
      "description": "Example connection",
      "mode": "INGRESS",
      "vaultID": "vault-123",
      "authMode": "NOAUTH",
      "routes": [...]
    }
  ]
}
```

#### Connection Properties

- `name` (required): Name of the connection
- `description` (required): Description of the connection
- `vaultID` (required): ID of the target vault
- `mode`: Connection mode - "INGRESS" (inbound) or "EGRESS" (outbound)
- `authMode`: Authentication mode - "NOAUTH", "MTLS", or "SHAREDKEY"
- `baseURL`: Base URL for the connection
- `routes` (required): Array of route configurations
- `denyPassThrough`: Whether to deny pass-through requests
- `formEncodedKeysPassThrough`: Whether to pass through form-encoded keys

#### Route Configuration

Each route in the `routes` array supports:

- `name` (required): Name of the route
- `description`: Description of the route
- `path`: URL path for the route
- `method`: HTTP method (GET, POST, PUT, DELETE, etc.)
- `contentType`: Content type - "JSON", "XML", "X_WWW_FORM_URLENCODED", "X_MULTIPART_FORM_DATA", or "UNKNOWN_CONTENT"
- `soapAction`: SOAP action for XML content
- `mleType`: MLE (Message Level Encryption) requirement - "NOT_REQUIRED" or "MANDATORY"

#### Field Mapping Configuration

Routes can include field mappings for different parts of the request/response:

- `url`: URL field mappings
- `requestBody`: Request body field mappings
- `responseBody`: Response body field mappings
- `requestHeader`: Request header field mappings
- `responseHeader`: Response header field mappings
- `queryParams`: Query parameter field mappings

Each field mapping includes:
```json
{
  "action": "TOKENIZATION|DETOKENIZATION|ENCRYPTION|NOT_SELECTED",
  "fieldName": "field-name",
  "table": "table-name",
  "column": "column-name",
  "dataSelector": "selector-expression",
  "dataSelectorRegex": "regex-pattern",
  "transformFormat": "format",
  "encryptionType": "encryption-type",
  "redaction": "DEFAULT|REDACTED|MASKED|PLAIN_TEXT",
  "sourceRegex": "source-regex",
  "transformedRegex": "transformed-regex"
}
```

#### Message Actions

Routes support message actions at different stages:

- `preFieldRequestMessageActions`: Actions before processing request fields
- `postFieldRequestMessageActions`: Actions after processing request fields
- `preFieldResponseMessageActions`: Actions before processing response fields
- `postFieldResponseMessageActions`: Actions after processing response fields

Message action types:
```json
{
  "type": "NOACTION|ENCRYPTION|DECRYPTION|SIGN|VERIFY|FIND_AND_REPLACE",
  "action": "action-name",
  "keyEncryptionAlgo": "algorithm",
  "contentEncryptionAlgo": "algorithm",
  "signatureAlgorithm": "algorithm",
  "sourceRegex": "source-pattern",
  "transformedRegex": "transformed-pattern",
  "target": "target-location"
}
```

#### Table Upsert Configuration

```json
{
  "tableUpsertInfo": [
    {
      "table": "table-name",
      "column": "column-name"
    }
  ]
}
```

#### Example Usage

**Simple connection with basic route:**
```bash
sky create-connection --file-path simple-connection.json --vault-id vault-123
```

**With verbose logging:**
```bash
sky create-connection --file-path connections.json --verbose
```

**Using environment variable for vault ID:**
```bash
export SKYFLOW_VAULT_ID=vault-123
sky create-connection --file-path connections.json
```

#### Expected Output

The command will output progress for each connection:
```
Creating 2 connection(s)...

[1/2] Creating connection: api-gateway
Successfully created connection "api-gateway" (ID: conn-abc123)

[2/2] Creating connection: webhook-handler
Successfully created connection "webhook-handler" (ID: conn-def456)

Summary:
Successfully created: 2 connection(s)
      - api-gateway (ID: conn-abc123)
      - webhook-handler (ID: conn-def456)
```

## Vault Creation Output

Upon successful vault creation, the CLI will output:

- Vault details (name, description, ID, etc.)
- Service account details (if created)
- Environment variables for easy export

Example:

```bash
=== Vault Created Successfully ===

Name: testvault
Description: My test vault
Vault URL: (not yet populated)
Cluster ID: (not yet populated)
Vault ID: v123456
Service Account ID: sa123456
Service Account API Key: sky-xxxxxxx

Environment Variables:
export SKYFLOW_VAULT_ID=v123456
export SKYFLOW_CLUSTER_ID=
export SKYFLOW_VAULT_URL=
export SKYFLOW_WORKSPACE_ID=ws123456
export SKYFLOW_SERVICE_ACCOUNT_ID=sa123456
export SKYFLOW_API_KEY=sky-xxxxxxx
```

## License

MIT
