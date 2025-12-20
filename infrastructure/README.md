# Azure Infrastructure

This directory contains the Infrastructure as Code (IaC) for deploying the Azure resources required by the GitHub Actions Dashboard.

## Resources Created

The Bicep template creates the following Azure resources:

### Core Resources

1. **Azure Function App** (Consumption Plan)
   - Runtime: Node.js 18
   - System-assigned Managed Identity
   - CORS enabled for GitHub Pages
   - Application Insights integration

2. **Azure Key Vault**
   - Stores GitHub App credentials (App ID and Private Key)
   - RBAC-based access control
   - Secrets accessible only by Function App's Managed Identity

3. **Azure Storage Account**
   - Standard LRS tier
   - Blob container for workflow configurations
   - Accessible by Function App's Managed Identity

4. **Application Insights**
   - Function App monitoring and logging
   - Performance metrics and error tracking

5. **App Service Plan**
   - Consumption plan (serverless, pay-per-execution)
   - Auto-scaling based on demand

### Security Configuration

- **Managed Identity**: Function App uses system-assigned managed identity
- **RBAC Roles**:
  - Function App → Key Vault: "Key Vault Secrets User"
  - Function App → Storage: "Storage Blob Data Contributor"
- **Network Security**:
  - HTTPS only for all services
  - TLS 1.2 minimum
  - No public blob access

## Files

- **main.bicep**: Main Bicep template defining all resources
- **parameters.example.json**: Example parameter file (template)
- **parameters.json**: Actual parameters (git-ignored, contains secrets)
- **deploy.sh**: Deployment script
- **README.md**: This file

## Prerequisites

1. **Azure CLI**: Installed and authenticated
   ```bash
   az --version
   az login
   ```

2. **Azure Subscription**: Active subscription with permissions to:
   - Create resource groups
   - Create resources (Function App, Key Vault, Storage, etc.)
   - Assign RBAC roles

3. **GitHub App**: Created with:
   - App ID
   - Private key (.pem file)
   - Installed on target repositories

## Deployment

### 1. Prepare Parameters

Copy the example parameters file:
```bash
cp parameters.example.json parameters.json
```

Edit `parameters.json` with your values:
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
      "value": "123456"
    }
  }
}
```

**Important**: 
- Only the GitHub App ID is included in parameters.json
- The private key will be uploaded separately using `az keyvault secret set` (see step 3 below)
- Keep `parameters.json` secure and never commit it to version control (it's in .gitignore)

### 2. Run Deployment

```bash
./deploy.sh
```

The script will:
1. Create resource group (if it doesn't exist)
2. Deploy all resources from `main.bicep`
3. Configure RBAC permissions
4. Output deployment details
5. Save outputs to `deployment-outputs.env`

### 3. Upload GitHub App Private Key

**Security Note**: The private key is uploaded directly to Key Vault and never included in deployment parameters. This prevents the private key from being exposed in Azure deployment logs.

```bash
# Upload your .pem file directly to Key Vault
az keyvault secret set \
  --vault-name <KEY_VAULT_NAME> \
  --name github-app-private-key \
  --file /path/to/your/private-key.pem
```

Replace `<KEY_VAULT_NAME>` with the Key Vault name from the deployment outputs.

### 4. Verify Deployment

Check that all resources were created:
```bash
az resource list --resource-group <RESOURCE_GROUP_NAME> --output table
```

Verify the private key was uploaded:
```bash
az keyvault secret show \
  --vault-name <KEY_VAULT_NAME> \
  --name github-app-private-key \
  --query "name"
```

### 5. Save Outputs

The deployment outputs are saved to `deployment-outputs.env`. Source this file for subsequent operations:
```bash
source deployment-outputs.env
echo $FUNCTION_APP_NAME
```

## Manual Deployment

If you prefer not to use the deployment script:

```bash
# Set variables
RESOURCE_GROUP_NAME="ghactionsdash-rg"
LOCATION="eastus"

# Create resource group
az group create \
  --name $RESOURCE_GROUP_NAME \
  --location $LOCATION

# Deploy template
az deployment group create \
  --name ghactionsdash-deployment \
  --resource-group $RESOURCE_GROUP_NAME \
  --template-file main.bicep \
  --parameters @parameters.json
```

## Update Deployment

To update existing resources with changes:

```bash
./deploy.sh
```

Bicep deployments are idempotent - only changed resources will be updated.

## Resource Naming

Resources are named using a combination of:
- `baseName`: Base name for all resources (from parameters)
- `environment`: Environment name (dev/staging/prod)
- `uniqueSuffix`: Auto-generated unique string based on resource group ID

Example resource names:
- Function App: `ghactionsdash-func-dev-abc123`
- Key Vault: `ghactionsdash-kv-dev-abc123`
- Storage Account: `ghactionsdashdevabc123` (no hyphens, max 24 chars)

## Parameters

### Required Parameters

- **githubAppId**: GitHub App ID (numeric)

**Note**: The GitHub App private key is uploaded separately via `az keyvault secret set` and is not included as a parameter.

### Optional Parameters

- **location**: Azure region (default: resource group location)
- **baseName**: Base name for resources (default: "ghactionsdash")
- **environment**: Environment name (default: "dev", allowed: dev/staging/prod)

## Outputs

After deployment, the following outputs are available:

- **functionAppName**: Name of the deployed Function App
- **functionAppUrl**: HTTPS URL of the Function App
- **keyVaultName**: Name of the Key Vault
- **storageAccountName**: Name of the Storage Account
- **storageContainerName**: Name of the workflow config container
- **functionAppPrincipalId**: Managed Identity principal ID

Access outputs from the deployment:
```bash
az deployment group show \
  --name <DEPLOYMENT_NAME> \
  --resource-group <RESOURCE_GROUP_NAME> \
  --query properties.outputs
```

## Customization

### Change Function App Plan

To use a different App Service Plan tier (e.g., Premium for no cold starts):

Edit `main.bicep`:
```bicep
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'EP1'  // Premium Elastic Plan
    tier: 'ElasticPremium'
  }
  properties: {}
}
```

### Restrict CORS Origins

By default, CORS allows all origins (`*`). To restrict to your GitHub Pages domain:

Edit `main.bicep`:
```bicep
cors: {
  allowedOrigins: [
    'https://your-org.github.io'
  ]
  supportCredentials: false
}
```

### Add Additional Secrets

To store additional secrets in Key Vault:

```bicep
resource mySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'my-secret-name'
  properties: {
    value: 'secret-value'
    contentType: 'text/plain'
  }
}
```

## Cost Optimization

### Consumption Plan (Default)

- **Pay-per-execution**: Only pay when function runs
- **No charges when idle**
- **Free tier**: 1M executions/month free

Estimated cost: **$1-5/month** for typical usage.

### Premium Plan

- **Pre-warmed instances**: No cold starts
- **Better performance**: Dedicated compute
- **Higher cost**: ~$150-200/month minimum

Use Premium plan for production if:
- Cold starts are unacceptable
- High request volume expected
- Need VNet integration

## Monitoring

### View Function App Status

```bash
az functionapp show \
  --name <FUNCTION_APP_NAME> \
  --resource-group <RESOURCE_GROUP_NAME> \
  --query state
```

### Check Deployment Status

```bash
az deployment group list \
  --resource-group <RESOURCE_GROUP_NAME> \
  --output table
```

### View Application Insights

```bash
az monitor app-insights component show \
  --app <APP_INSIGHTS_NAME> \
  --resource-group <RESOURCE_GROUP_NAME>
```

## Troubleshooting

### Deployment Fails

1. Check error message in deployment output
2. View detailed deployment logs:
   ```bash
   az deployment group show \
     --name <DEPLOYMENT_NAME> \
     --resource-group <RESOURCE_GROUP_NAME>
   ```

### "Name not available" Error

Resource names must be globally unique. Try:
- Change `baseName` parameter
- Use different `environment` value

### RBAC Assignment Fails

Ensure you have permissions to assign roles:
- Owner or User Access Administrator role on the resource group

### Key Vault Access Denied

Wait a few minutes after deployment for RBAC permissions to propagate.

## Cleanup

To delete all resources:

```bash
az group delete \
  --name <RESOURCE_GROUP_NAME> \
  --yes \
  --no-wait
```

**Warning**: This permanently deletes all resources in the resource group.

## Multiple Environments

To deploy multiple environments (dev, staging, prod):

1. Create separate parameter files:
   - `parameters.dev.json`
   - `parameters.staging.json`
   - `parameters.prod.json`

2. Deploy to different resource groups:
   ```bash
   RESOURCE_GROUP_NAME="ghactionsdash-dev-rg" PARAMETERS_FILE="parameters.dev.json" ./deploy.sh
   RESOURCE_GROUP_NAME="ghactionsdash-prod-rg" PARAMETERS_FILE="parameters.prod.json" ./deploy.sh
   ```

## CI/CD Deployment

For automated infrastructure deployment, use GitHub Actions:

```yaml
name: Deploy Infrastructure

on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Deploy Infrastructure
        run: |
          cd infrastructure
          az deployment group create \
            --name github-actions-deployment \
            --resource-group ${{ secrets.RESOURCE_GROUP_NAME }} \
            --template-file main.bicep \
            --parameters githubAppId=${{ secrets.GITHUB_APP_ID }}
      
      - name: Upload GitHub App Private Key
        run: |
          # Upload private key to Key Vault
          echo "${{ secrets.GITHUB_APP_PRIVATE_KEY }}" > /tmp/private-key.pem
          az keyvault secret set \
            --vault-name ${{ secrets.KEY_VAULT_NAME }} \
            --name github-app-private-key \
            --file /tmp/private-key.pem
          rm /tmp/private-key.pem
```

## Support

For issues with:
- **Bicep syntax**: See [Bicep documentation](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- **Azure resources**: See [Azure documentation](https://docs.microsoft.com/en-us/azure/)
- **Deployment errors**: Check Azure deployment logs in the portal
