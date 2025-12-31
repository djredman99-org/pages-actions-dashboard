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
       }
     }
   }
   ```

   **Important**: 
   - Only the GitHub App ID is included in parameters.json
   - The private key will be uploaded separately in Step 4
   - ⚠️ **Never commit `parameters.json` with secrets to source control**
   
   **Required Permissions**: To upload secrets to Key Vault, your user account needs the **Key Vault Secrets Officer** role or equivalent permissions (e.g., `Secret Set` permission). You can assign this role using:
   ```bash
   az role assignment create \
     --role "Key Vault Secrets Officer" \
     --assignee <your-user-email> \
     --scope /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.KeyVault/vaults/<keyvault-name>
   ```
   
   **Option A: Upload file directly (Recommended)**
   ```bash
   # Upload your .pem file directly to Key Vault
   az keyvault secret set \
     --vault-name ghactionsdash-kv-dev \
     --name github-app-private-key \
     --file /path/to/your/private-key.pem
   ```

   **Option B: Via VS Code file upload**
   - In VS Code/Codespace: Right-click Explorer → "Upload..." → Select your `.pem` file
   - Run: `az keyvault secret set --vault-name ghactionsdash-kv-dev --name github-app-private-key --file ./uploaded-file.pem`
   - Clean up: `rm ./uploaded-file.pem`

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
   - Store GitHub App ID in Key Vault
   - Output configuration details

4. **Save the deployment outputs** - you'll need them for the next steps:
   - Function App Name
   - Function App URL
   - Key Vault Name
   - Storage Account Name
   - Storage Container Name

## Step 4: Upload GitHub App Private Key

**Security Note**: The private key is uploaded directly to Key Vault and never included in deployment parameters. This prevents the private key from being exposed in Azure deployment logs.

1. **Required Permissions**: To upload secrets to Key Vault, your user account needs the **Key Vault Secrets Officer** role or equivalent permissions (e.g., `Secret Set` permission). You can assign this role using:
   ```bash
   az role assignment create \
     --role "Key Vault Secrets Officer" \
     --assignee <your-user-email> \
     --scope /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.KeyVault/vaults/<keyvault-name>
   ```

2. **Upload the private key** (Required):
   
   **Option A: Upload file directly (Recommended)**
   ```bash
   # Upload your .pem file directly to Key Vault
   az keyvault secret set \
     --vault-name <KEY_VAULT_NAME> \
     --name github-app-private-key \
     --file /path/to/your/private-key.pem
   ```

   **Option B: Via VS Code file upload**
   - In VS Code/Codespace: Right-click Explorer → "Upload..." → Select your `.pem` file
   - Run: `az keyvault secret set --vault-name <KEY_VAULT_NAME> --name github-app-private-key --file ./uploaded-file.pem`
   - Clean up: `rm ./uploaded-file.pem`

3. **Verify the upload**:
   ```bash
   # Check that the secret exists (shows metadata only, not the actual key)
   az keyvault secret show \
     --vault-name <KEY_VAULT_NAME> \
     --name github-app-private-key \
     --query "name"
   ```

## Step 5: Deploy Function App Code

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
   func azure functionapp publish <FUNCTION_APP_NAME> --javascript
   ```

   Replace `<FUNCTION_APP_NAME>` with the name from the deployment outputs.

4. Verify deployment:
   ```bash
   curl https://<FUNCTION_APP_NAME>.azurewebsites.net/api/get-workflow-statuses
   ```

   You should get a response (may be empty if no workflows configured yet).

## Step 6: Upload Workflow Configuration

You need to create an initial workflow configuration. You can either upload it manually now or add workflows later using the dashboard UI.

**Option 1: Upload Initial Configuration (Recommended for first-time setup)**

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

**Option 2: Add Workflows via Dashboard UI (After deployment)**

After completing the setup and deploying your dashboard, you can add workflows using the dashboard's UI:
1. Navigate to your dashboard
2. Click the "Add Workflow" button
3. Enter workflow details and click "Add Workflow"

See the [Managing Workflows](#managing-workflows) section for more options.

## Step 7: Configure GitHub Pages Deployment

### Add Repository Secret

1. Add Azure Function URL as a repository secret:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `AZURE_FUNCTION_URL`
   - Value: `https://<FUNCTION_APP_NAME>.azurewebsites.net` (from deployment outputs)
   
   **Important**: Use only the **base URL** without any path or endpoint. 
   - ✅ Correct: `https://actionsdash-func-dev.azurewebsites.net`
   - ❌ Incorrect: `https://actionsdash-func-dev.azurewebsites.net/api/get-workflow-statuses`
   
   The frontend code will automatically append the `/api/get-workflow-statuses` endpoint path.

### Configure GitHub Pages

2. Set up GitHub Pages to use GitHub Actions for deployment:
   - Go to your repository → Settings → Pages
   - Under **"Build and deployment"** → **"Source"**, select **"GitHub Actions"**
   - Do NOT select "Deploy from a branch"
   
   📖 **Why GitHub Actions?** We use a custom workflow that injects the Azure Function URL during build. See [PAGES_SETUP.md](PAGES_SETUP.md) for complete Pages setup guide including authentication benefits and troubleshooting.

### Deploy

3. Push changes to trigger deployment:
   ```bash
   git add .
   git commit -m "Configure Azure Function backend"
   git push
   ```

4. Monitor the deployment:
   - Go to **Actions** tab
   - Watch **"Deploy Dashboard to GitHub Pages"** workflow
   - Once complete, access your dashboard at `https://{owner}.github.io/{repo}/`

## Step 8: Verify End-to-End Flow

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

You can manage workflows in multiple ways:

**Option 1: Dashboard UI (Easiest)**
1. Navigate to your dashboard
2. Click the "Add Workflow" button
3. Enter the workflow details in the format: `owner/repo/workflow.yml`
4. Click "Add Workflow"
5. To remove a workflow, click the X button on the workflow card

**Option 2: Azure CLI (Manual)**
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

**Option 3: API (Programmatic)**
See [WORKFLOW_MANAGEMENT_API.md](WORKFLOW_MANAGEMENT_API.md) for API documentation.

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

## Troubleshooting

### Resource Provider Registration Error

If you encounter an error like this during deployment:

```
Failed to register resource provider 'microsoft.operationalinsights'. 
Ensure that microsoft.operationalinsights is registered for this subscription.
```

**Solution**: Register the required resource provider:

```bash
az provider register --namespace microsoft.operationalinsights
```

You may also need to register other providers:

```bash
# Register all commonly needed providers for Azure Functions
az provider register --namespace microsoft.operationalinsights
az provider register --namespace microsoft.insights  
az provider register --namespace microsoft.web
az provider register --namespace microsoft.storage
az provider register --namespace microsoft.keyvault
```

**Check registration status**:
```bash
az provider show -n microsoft.operationalinsights --query "registrationState"
```

Wait for the status to change from "Registering" to "Registered" (usually 2-5 minutes), then retry your deployment.

### App Service Quota Errors

If you encounter quota errors for App Service Plans:

```
Operation cannot be completed without additional quota.
Current Limit (Basic VMs): 0
```

**Solutions**:
1. **Request quota increase**: Go to Azure Portal → Subscriptions → Usage + quotas → Request increase for "App Service Plans"
2. **Try different region**: Deploy to a region with available quota
3. **Use different subscription**: If using a trial/student subscription, consider upgrading

### Storage Blob Permission Errors

If you encounter permission errors when uploading workflows.json:

```
You do not have the required permissions needed to perform this operation.
Depending on your operation, you may need to be assigned one of the following roles:
    "Storage Blob Data Owner"
    "Storage Blob Data Contributor"
    "Storage Blob Data Reader"
```

**Solutions**:

1. **Assign Storage Blob Data Contributor role**:
   ```bash
   # Get your user object ID
   USER_ID=$(az ad signed-in-user show --query objectId -o tsv)
   
   # Assign Storage Blob Data Contributor role
   az role assignment create \
     --assignee $USER_ID \
     --role "Storage Blob Data Contributor" \
     --scope "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/ghactionsdash-rg/providers/Microsoft.Storage/storageAccounts/ghactionsdashdev"
   ```

2. **Alternative: Use account key authentication**:
   ```bash
   az storage blob upload \
     --account-name ghactionsdashdev \
     --container-name workflow-configs \
     --name workflows.json \
     --file workflows.json \
     --auth-mode key
   ```

3. **Grant permissions through Azure Portal**:
   - Go to Azure Portal → Storage Account → Access Control (IAM)
   - Click "Add role assignment"
   - Select "Storage Blob Data Contributor"
   - Assign to your user account

### GitHub App Private Key Format Error

If you encounter an authentication error when the Function App tries to access GitHub:

```
"GitHub App authentication failed: secretOrPrivateKey must be an asymmetric key when using RS256"
```

**Cause**: The GitHub App private key in Key Vault is not properly formatted.

**Solutions**:

1. **Re-upload the private key with proper formatting**:
   ```bash
   # Upload the private key directly from the .pem file
   az keyvault secret set \
     --vault-name ghactionsdash-kv-dev \
     --name github-app-private-key \
     --file /path/to/your/private-key.pem
   ```

2. **Verify the private key format**:
   ```bash
   # Check the stored private key (first few lines)
   az keyvault secret show \
     --vault-name ghactionsdash-kv-dev \
     --name github-app-private-key \
     --query "value" -o tsv | head -5
   ```

   The output should start with:
   ```
   -----BEGIN RSA PRIVATE KEY-----
   ```

2. **Restart Function App after updating the key**:
   ```bash
   az functionapp restart --name ghactionsdash-func-dev --resource-group ghactionsdash-rg
   ```

## Support

For issues or questions:
- Check the [README.md](README.md) for general information
- Review [GitHub Issues](https://github.com/djredman99-org/pages-actions-dashboard/issues)
- Consult [Azure Functions documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
