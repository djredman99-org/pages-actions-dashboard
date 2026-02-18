# Azure Backend - Manual Deployment Guide

> **Note:** This guide is for advanced users who want to manually deploy the Azure infrastructure and function code. For automated deployment using GitHub Actions workflows, see [SETUP.md](SETUP.md).

This guide explains how to manually deploy the Azure Function App backend using Azure CLI commands.

## Prerequisites

- Azure subscription with permissions to create resources
- Azure CLI installed and configured ([Install Guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
- Node.js 18+ ([Download](https://nodejs.org/))
- Azure Functions Core Tools ([Install Guide](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local))
- GitHub App created (see [SETUP.md](SETUP.md#step-1-create-a-github-app))

## Manual Deployment Steps

### 1. Prepare Configuration

1. Navigate to the infrastructure directory:
   ```bash
   cd infrastructure
   ```

2. Copy the example parameters file:
   ```bash
   cp parameters.example.json parameters.json
   ```

3. Edit `parameters.json` with your values:
   ```json
   {
     "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
     "contentVersion": "1.0.0.0",
     "parameters": {
       "location": {
         "value": "eastus"
       },
       "baseName": {
         "value": "ghactionsdash"
       },
       "environment": {
         "value": "dev"
       },
       "githubAppId": {
         "value": "YOUR_GITHUB_APP_ID"
       }
     }
   }
   ```

### 2. Deploy Infrastructure

1. Login to Azure CLI:
   ```bash
   az login
   ```

2. Set your subscription (if you have multiple):
   ```bash
   az account set --subscription "YOUR_SUBSCRIPTION_NAME_OR_ID"
   ```

3. Run the deployment script:
   ```bash
   ./deploy.sh
   ```

   This script will:
   - Create a resource group
   - Deploy all Azure resources (Function App, Key Vault, Storage Account)
   - Configure managed identity permissions
   - Store GitHub App ID in Key Vault
   - Output configuration details

4. **Save the deployment outputs** - you'll need them for the next steps

### 3. Upload GitHub App Private Key

**Required Permissions:** Your user account needs the **Key Vault Secrets Officer** role:

```bash
az role assignment create \
  --role "Key Vault Secrets Officer" \
  --assignee YOUR_USER_EMAIL \
  --scope /subscriptions/SUBSCRIPTION_ID/resourceGroups/RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/KEY_VAULT_NAME
```

Upload the private key:

```bash
az keyvault secret set \
  --vault-name KEY_VAULT_NAME \
  --name github-app-private-key \
  --file /path/to/your/private-key.pem
```

Verify:

```bash
az keyvault secret show \
  --vault-name KEY_VAULT_NAME \
  --name github-app-private-key \
  --query "name"
```

### 4. Deploy Function App Code

1. Navigate to the function app directory:
   ```bash
   cd ../function-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Deploy to Azure:
   ```bash
   func azure functionapp publish FUNCTION_APP_NAME --javascript
   ```

4. Verify deployment:
   ```bash
   curl https://FUNCTION_APP_NAME.azurewebsites.net/api/get-workflow-statuses
   ```

### 5. Upload Workflow Configuration

Create and upload your workflow configuration:

1. Create `workflows.json`:
   ```json
   [
     {
       "dashboardId": "00000000-0000-0000-0000-000000000000",
       "owner": "your-org",
       "repo": "your-repo",
       "workflow": "ci.yml",
       "label": "CI Build"
     }
   ]
   ```

2. Upload to Azure Storage:
   ```bash
   az storage blob upload \
     --account-name STORAGE_ACCOUNT_NAME \
     --container-name workflow-configs \
     --name workflows.json \
     --file workflows.json \
     --auth-mode login
   ```

## Troubleshooting

### Resource Provider Registration

If you encounter resource provider not registered errors:

```bash
az provider register --namespace microsoft.operationalinsights
az provider register --namespace microsoft.insights  
az provider register --namespace microsoft.web
az provider register --namespace microsoft.storage
az provider register --namespace microsoft.keyvault
```

Wait for the status to change from "Registering" to "Registered" (usually 2-5 minutes):

```bash
az provider show -n microsoft.operationalinsights --query "registrationState"
```

### Storage Blob Permissions

If you encounter permission errors when uploading workflows.json:

**Assign Storage Blob Data Contributor role:**
```bash
USER_ID=$(az ad signed-in-user show --query objectId -o tsv)

az role assignment create \
  --assignee $USER_ID \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/ghactionsdash-rg/providers/Microsoft.Storage/storageAccounts/STORAGE_ACCOUNT_NAME"
```

### GitHub App Private Key Format

If the Function App fails to authenticate with GitHub, verify the private key format:

```bash
# Check the stored private key (first few lines)
az keyvault secret show \
  --vault-name KEY_VAULT_NAME \
  --name github-app-private-key \
  --query "value" -o tsv | head -5
```

The output should start with:
```
-----BEGIN RSA PRIVATE KEY-----
```

If incorrect, re-upload the private key and restart the Function App:

```bash
az keyvault secret set \
  --vault-name KEY_VAULT_NAME \
  --name github-app-private-key \
  --file /path/to/your/private-key.pem

az functionapp restart --name FUNCTION_APP_NAME --resource-group RESOURCE_GROUP_NAME
```

## For Automated Deployment

**Looking for automated deployment?** See [SETUP.md](SETUP.md) for the recommended approach using GitHub Actions workflows.

The automated approach:
- ✅ No manual Azure CLI commands
- ✅ Secrets management via GitHub Secrets
- ✅ Automatic credential injection
- ✅ Built-in validation and error reporting
- ✅ Workflow summaries with next steps

## Support

For manual deployment issues:
- Check [SETUP.md](SETUP.md#troubleshooting) for common issues
- Review [infrastructure/README.md](infrastructure/README.md) for infrastructure details
- Consult [Azure Functions documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
