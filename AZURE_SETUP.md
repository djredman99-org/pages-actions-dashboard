# Azure Function Backend Setup Guide

This guide walks you through setting up the Azure Function App backend for the GitHub Actions Dashboard. This new architecture moves API logic from client-side JavaScript to a secure Azure Function, using Azure Key Vault for credential storage and Azure Storage for workflow configurations.

## Architecture Overview

The new architecture consists of:

1. **Azure Function App**: Serverless backend that handles GitHub API calls
2. **Azure Key Vault**: Securely stores GitHub App credentials (App ID and Private Key)
3. **Azure Storage**: Stores workflow configurations in a blob container
4. **Managed Identity**: Allows Function App to securely access Key Vault and Storage without storing credentials
5. **GitHub App**: Provides secure authentication to GitHub API

### Benefits

- ✅ **Enhanced Security**: GitHub credentials never exposed to the browser
- ✅ **Centralized Management**: Workflow configurations stored in Azure Storage, not hardcoded
- ✅ **No Token Exposure**: No need to inject tokens at build time
- ✅ **Cross-Device Sync**: Workflow configurations persist in Azure, not browser local storage
- ✅ **GitHub App Authentication**: More secure than Personal Access Tokens

## Prerequisites

Before you begin, ensure you have:

1. **Azure Account**: Active Azure subscription with permissions to create resources
2. **Azure CLI**: Installed and configured ([Install Guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
3. **GitHub App**: Created and installed on your organization/repositories
4. **Node.js**: Version 18+ for function development ([Download](https://nodejs.org/))
5. **Azure Functions Core Tools**: For local development and deployment ([Install Guide](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local))

## Step 1: Create a GitHub App

1. Go to your GitHub organization settings → Developer settings → GitHub Apps
2. Click "New GitHub App"
3. Configure the app:
   - **Name**: `GitHub Actions Dashboard` (or your preferred name)
   - **Homepage URL**: Your dashboard URL
   - **Webhook**: Uncheck "Active" (not needed for this use case)
   - **Permissions**:
     - Repository permissions:
       - **Actions**: Read-only
       - **Metadata**: Read-only (automatically granted)
4. Click "Create GitHub App"
5. **Save the App ID** (you'll need this later)
6. **Generate a private key**:
   - Scroll down to "Private keys" section
   - Click "Generate a private key"
   - Download and save the `.pem` file securely
7. **Install the app**:
   - Go to "Install App" in the left sidebar
   - Click "Install" next to your organization
   - Select repositories to monitor (or "All repositories")

## Step 2: Prepare Configuration Files

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
       },
       "githubAppPrivateKey": {
         "value": "-----BEGIN RSA PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END RSA PRIVATE KEY-----"
       }
     }
   }
   ```

   **Important**: Replace the private key content with your actual private key from the `.pem` file. Include the full content including the BEGIN and END lines.

## Step 3: Deploy Azure Infrastructure

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
   - Store GitHub App credentials in Key Vault
   - Output configuration details

4. **Save the deployment outputs** - you'll need them for the next steps:
   - Function App Name
   - Function App URL
   - Key Vault Name
   - Storage Account Name
   - Storage Container Name

## Step 4: Deploy Function App Code

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
   func azure functionapp publish <FUNCTION_APP_NAME>
   ```

   Replace `<FUNCTION_APP_NAME>` with the name from the deployment outputs.

4. Verify deployment:
   ```bash
   curl https://<FUNCTION_APP_NAME>.azurewebsites.net/api/get-workflow-statuses
   ```

   You should get a response (may be empty if no workflows configured yet).

## Step 5: Upload Workflow Configuration

1. Edit `function-app/workflows.json` with your workflows:
   ```json
   [
     {
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
     --account-name <STORAGE_ACCOUNT_NAME> \
     --container-name workflow-configs \
     --name workflows.json \
     --file workflows.json \
     --auth-mode login
   ```

3. Verify upload:
   ```bash
   az storage blob list \
     --account-name <STORAGE_ACCOUNT_NAME> \
     --container-name workflow-configs \
     --auth-mode login
   ```

## Step 6: Configure GitHub Pages Deployment

1. Add Azure Function URL as a repository secret:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `AZURE_FUNCTION_URL`
   - Value: `https://<FUNCTION_APP_NAME>.azurewebsites.net` (from deployment outputs)

2. The deployment workflow will automatically inject this URL into the Pages site

3. Push changes to trigger deployment:
   ```bash
   git add .
   git commit -m "Configure Azure Function backend"
   git push
   ```

## Step 7: Verify End-to-End Flow

1. Wait for GitHub Pages deployment to complete
2. Visit your dashboard URL
3. Verify that workflow statuses are loading
4. Check the browser console for any errors

### Troubleshooting

If workflows don't load:

1. **Check Function App logs**:
   ```bash
   az functionapp log tail --name <FUNCTION_APP_NAME> --resource-group <RESOURCE_GROUP_NAME>
   ```

2. **Verify Key Vault access**:
   ```bash
   az keyvault secret show --vault-name <KEY_VAULT_NAME> --name github-app-id
   ```

3. **Check Storage container**:
   ```bash
   az storage blob download \
     --account-name <STORAGE_ACCOUNT_NAME> \
     --container-name workflow-configs \
     --name workflows.json \
     --file downloaded-workflows.json \
     --auth-mode login
   cat downloaded-workflows.json
   ```

4. **Test Function directly**:
   ```bash
   curl https://<FUNCTION_APP_NAME>.azurewebsites.net/api/get-workflow-statuses
   ```

## Managing Workflows

### Add/Update Workflows

1. Edit `workflows.json` locally
2. Upload to Azure Storage:
   ```bash
   az storage blob upload \
     --account-name <STORAGE_ACCOUNT_NAME> \
     --container-name workflow-configs \
     --name workflows.json \
     --file workflows.json \
     --auth-mode login \
     --overwrite
   ```

### View Current Workflows

```bash
az storage blob download \
  --account-name <STORAGE_ACCOUNT_NAME> \
  --container-name workflow-configs \
  --name workflows.json \
  --file - \
  --auth-mode login
```

## Cost Considerations

Azure resources used:

- **Function App (Consumption Plan)**: Pay-per-execution, very low cost for typical usage
- **Storage Account (Standard LRS)**: Minimal cost for storing workflow configurations
- **Key Vault**: Standard tier, very low cost for storing secrets
- **Application Insights**: Included for monitoring

Estimated cost: **Less than $5-10/month** for typical dashboard usage.

## Security Best Practices

1. **Restrict CORS**: Update Function App CORS settings to only allow your Pages domain:
   ```bash
   az functionapp cors add \
     --name <FUNCTION_APP_NAME> \
     --resource-group <RESOURCE_GROUP_NAME> \
     --allowed-origins "https://your-org.github.io"
   ```

2. **Enable Function Keys** (optional): For additional security, enable function-level authentication

3. **Regular Key Rotation**: Rotate GitHub App private keys regularly

4. **Monitor Access**: Use Application Insights to monitor Function App usage

## Advanced Configuration

### Custom Domain

To use a custom domain for your Function App:

```bash
az functionapp config hostname add \
  --webapp-name <FUNCTION_APP_NAME> \
  --resource-group <RESOURCE_GROUP_NAME> \
  --hostname api.yourdomain.com
```

### Scale Settings

By default, the Function App uses a Consumption plan. To adjust scaling:

```bash
az functionapp config set \
  --name <FUNCTION_APP_NAME> \
  --resource-group <RESOURCE_GROUP_NAME> \
  --always-on true
```

## Support

For issues or questions:
- Check the [README.md](README.md) for general information
- Review [GitHub Issues](https://github.com/djredman99-org/pages-actions-dashboard/issues)
- Consult [Azure Functions documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
