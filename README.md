# Skyflow CLI (sky)

> **⚠️ Warning:** This CLI is experimental and unsupported. Use it at your own risk. Contributions and feedback are welcome, but no guarantees are provided for stability or support.

A command-line interface for interacting with the Skyflow data privacy platform. This CLI allows you to manage vaults, service accounts, and other Skyflow resources directly from your terminal.

## Features

- Create and manage vaults
- Create and manage service accounts
- Create and manage connections
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

## Output

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

### Creating Connections

The `create-connection` command allows you to create connections from a configuration file. Connections define how your application can securely interact with external services through Skyflow.

#### Basic Usage

```bash
sky create-connection --file-path /path/to/connections.json
```

#### Available Options

- `--file-path`: Path to the connection configuration file (required)
- `--vault-id`: ID of the vault (optional if SKYFLOW_VAULT_ID environment variable is set)
- `--verbose`: Enable detailed logging for debugging purposes

#### Configuration File Format

The configuration file should be a JSON file containing an array of connection definitions, or an object with a `connections` property containing the array.

##### Direct Array Format

```json
[
  {
    "name": "my-api-connection",
    "description": "Connection to external API service",
    "vaultID": "v123456",
    "authMode": "NOAUTH",
    "baseURL": "https://api.example.com",
    "routes": [
      {
        "name": "get-users",
        "description": "Retrieve user data",
        "path": "/users",
        "method": "GET",
        "contentType": "JSON",
        "mleType": "NOT_REQUIRED",
        "soapAction": "",
        "url": [],
        "requestBody": [],
        "responseBody": [
          {
            "action": "TOKENIZATION",
            "fieldName": "email",
            "table": "users",
            "column": "email",
            "dataSelector": "$.users[*].email",
            "dataSelectorRegex": "",
            "transformFormat": "",
            "encryptionType": "",
            "redaction": "DEFAULT",
            "functionInfo": null,
            "sourceRegex": "",
            "transformedRegex": ""
          }
        ],
        "responseHeader": [],
        "queryParams": [],
        "requestHeader": [],
        "preFieldRequestMessageActions": [],
        "postFieldRequestMessageActions": [],
        "preFieldResponseMessageActions": [],
        "postFieldResponseMessageActions": [],
        "tableUpsertInfo": []
      }
    ]
  }
]
```

##### Object Format

```json
{
  "connections": [
    {
      "name": "my-api-connection",
      "description": "Connection to external API service",
      "vaultID": "v123456",
      "authMode": "NOAUTH",
      "routes": [...]
    }
  ]
}
```

#### Connection Configuration Properties

- `name`: Unique name for the connection (required)
- `description`: Description of the connection's purpose (required)
- `vaultID`: ID of the vault to use (required)
- `authMode`: Authentication mode - `"NOAUTH"`, `"MTLS"`, or `"SHAREDKEY"` (required)
- `baseURL`: Base URL for the external service (optional)
- `mode`: Connection mode (optional)
- `denyPassThrough`: Whether to deny pass-through requests (optional)
- `formEncodedKeysPassThrough`: Whether to allow form-encoded keys pass-through (optional)
- `routes`: Array of route definitions (required)

#### Route Configuration Properties

Each route in the `routes` array defines an endpoint and its data handling rules:

- `name`: Route name (required)
- `description`: Route description (required)
- `path`: API endpoint path (required)
- `method`: HTTP method - `"GET"`, `"POST"`, `"PUT"`, `"DELETE"`, etc. (required)
- `contentType`: Content type - `"JSON"`, `"XML"`, `"X_WWW_FORM_URLENCODED"`, `"X_MULTIPART_FORM_DATA"`, or `"UNKNOWN_CONTENT"` (required)
- `mleType`: MLE (Message Level Encryption) requirement - `"NOT_REQUIRED"` or `"MANDATORY"` (required)
- `soapAction`: SOAP action for XML-based services (required, can be empty string)

#### Field Mapping Arrays

Each route contains several arrays for defining how data should be processed:

- `url`: Field mappings for URL parameters
- `requestBody`: Field mappings for request body data
- `responseBody`: Field mappings for response body data
- `responseHeader`: Field mappings for response headers
- `queryParams`: Field mappings for query parameters
- `requestHeader`: Field mappings for request headers

#### Field Mapping Configuration

Each field mapping defines how to handle sensitive data:

```json
{
  "action": "TOKENIZATION",
  "fieldName": "email",
  "table": "users",
  "column": "email",
  "dataSelector": "$.users[*].email",
  "dataSelectorRegex": "",
  "transformFormat": "",
  "encryptionType": "",
  "redaction": "DEFAULT",
  "functionInfo": null,
  "sourceRegex": "",
  "transformedRegex": ""
}
```

- `action`: Data processing action - `"NOT_SELECTED"`, `"TOKENIZATION"`, `"DETOKENIZATION"`, or `"ENCRYPTION"`
- `fieldName`: Name of the field to process
- `table`: Skyflow table name for data storage
- `column`: Skyflow column name for data storage
- `dataSelector`: JSONPath selector for extracting data
- `redaction`: Data redaction mode - `"DEFAULT"`, `"REDACTED"`, `"MASKED"`, or `"PLAIN_TEXT"`

#### Message Actions

Routes can also include message-level actions:

- `preFieldRequestMessageActions`: Actions to execute before field processing on requests
- `postFieldRequestMessageActions`: Actions to execute after field processing on requests
- `preFieldResponseMessageActions`: Actions to execute before field processing on responses
- `postFieldResponseMessageActions`: Actions to execute after field processing on responses

#### Examples

Create a single connection:

```bash
sky create-connection --file-path ./my-connection.json --vault-id v123456
```

Create connections with verbose logging:

```bash
sky create-connection --file-path ./connections.json --verbose
```

Using environment variable for vault ID:

```bash
export SKYFLOW_VAULT_ID=v123456
sky create-connection --file-path ./connections.json
```

#### Output

The command provides detailed feedback during execution:

```bash
Creating 1 connection(s)...

[1/1] Creating connection: my-api-connection
Successfully created connection "my-api-connection" (ID: conn_abc123)
Successfully created connections.

Summary:
Successfully created: 1 connection(s)
      - my-api-connection (ID: conn_abc123)
```

If any connections fail, the command will continue with remaining connections and provide a summary of successes and failures.

## License

MIT
