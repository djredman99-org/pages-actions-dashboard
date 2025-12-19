# Dev Container Configuration

This directory contains the configuration for GitHub Codespaces and VS Code Dev Containers.

## Features

The devcontainer is configured with the following tools and features:

### Base Image
- **Node.js 20** (Debian Bookworm): JavaScript runtime for the Azure Function App

### Installed Tools
- **Azure CLI**: Command-line tool for managing Azure resources (deployment, configuration)
- **Azure Functions Core Tools**: Local development and deployment of Azure Functions
- **GitHub CLI**: Command-line tool for GitHub operations

### VS Code Extensions
- **Azure Functions**: Azure Functions extension for VS Code
- **Bicep**: Language support for Azure Bicep templates
- **GitHub Copilot**: AI pair programmer
- **GitHub Copilot Chat**: Chat interface for GitHub Copilot
- **ESLint**: JavaScript linting

## Usage Options

### GitHub Codespaces
When you create a new Codespace for this repository, it will automatically use this configuration. All tools will be pre-installed and ready to use.

### VS Code Dev Containers
1. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open the repository in VS Code
3. Click "Reopen in Container" when prompted (or use Command Palette → "Dev Containers: Reopen in Container")

### Local Development
If you chose to develop this locally/your own infrastructure, please ensure you have the prerequisites installed [listed above](README.md#L10).

## Verifying Installation

After the container is created, you can verify the tools are installed:

```bash
# Check Node.js version
node --version

# Check Azure CLI version
az --version

# Check Azure Functions Core Tools version
func --version

# Check GitHub CLI version
gh --version
```

## Common Tasks

### Azure CLI Login
```bash
az login
```

### Deploy Infrastructure
```bash
cd infrastructure
./deploy.sh
```

### Deploy Function App
```bash
cd function-app
npm install
func azure functionapp publish <FUNCTION_APP_NAME>
```

### Upload Workflow Configuration
```bash
az storage blob upload \
  --account-name <STORAGE_ACCOUNT_NAME> \
  --container-name workflow-configs \
  --name workflows.json \
  --file workflows.json \
  --auth-mode login
```

## Customization

To modify the devcontainer configuration, edit `devcontainer.json` and rebuild the container:
- In Codespaces: Create a new Codespace or rebuild the current one
- In VS Code: Command Palette → "Dev Containers: Rebuild Container"
