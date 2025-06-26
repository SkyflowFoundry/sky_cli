# Skyflow CLI (sky)

> **⚠️ Warning:** This CLI is experimental and unsupported. Use it at your own risk. Contributions and feedback are welcome, but no guarantees are provided for stability or support.

A command-line interface for interacting with the Skyflow data privacy platform. This CLI allows you to manage vaults, service accounts, and other Skyflow resources directly from your terminal.

## Features

- Create and manage vaults
- Create and manage service accounts
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

## License

MIT
