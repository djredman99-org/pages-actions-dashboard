# Azure Infrastructure

> **Note:** This is a technical reference for infrastructure developers. For setup instructions, see [SETUP.md](../SETUP.md).

This directory contains the Infrastructure as Code (IaC) for deploying Azure resources required by the GitHub Actions Dashboard.

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
- **parameters.json**: Deployment parameters (tracked in git, NO SECRETS - GitHub App ID is injected by workflow)
- **deploy.sh**: Manual deployment script
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

### Automated Deployment (Recommended)

Use the GitHub Actions workflow for deployment:

1. Ensure `parameters.json` exists with your configuration
2. Configure required GitHub Secrets (see [SETUP.md](../SETUP.md))
3. Run the **"Deploy Azure Infrastructure"** workflow from the Actions tab

The workflow automatically:
- Validates secrets and configuration
- Deploys all resources
- Uploads GitHub App credentials to Key Vault
- Outputs resource names and URLs

**See:** [SETUP.md](../SETUP.md) for complete automated setup instructions.

### Manual Deployment (Advanced)

For manual deployment using Azure CLI:

**See:** [AZURE_SETUP.md](../AZURE_SETUP.md) for detailed manual deployment instructions.
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
- For manual deployment, you must update `githubAppId` with your actual GitHub App ID
- For CI/CD deployment, the GitHub App ID is automatically injected from secrets
- The private key will be uploaded separately using `az keyvault secret set` (see step 3 below)
- **Never** commit actual secrets to `parameters.json` - use placeholders for CI/CD workflows

#### 2. Run Deployment

```bash
./deploy.sh
```

The script will:
1. Create resource group (if it doesn't exist)
2. Deploy all resources from `main.bicep`
3. Configure RBAC permissions
4. Output deployment details
5. Save outputs to `deployment-outputs.env`

#### 3. Upload GitHub App Private Key

**Security Note**: The private key is uploaded directly to Key Vault and never included in deployment parameters. This prevents the private key from being exposed in Azure deployment logs.

```bash
# Upload your .pem file directly to Key Vault
az keyvault secret set \
  --vault-name <KEY_VAULT_NAME> \
  --name github-app-private-key \
  --file /path/to/your/private-key.pem
```

Replace `<KEY_VAULT_NAME>` with the Key Vault name from the deployment outputs.

#### 4. Verify Deployment

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

#### 5. Save Outputs

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
## Parameters

The `parameters.json` file configures the deployment:

| Parameter | Description | Default | Notes |
|-----------|-------------|---------|-------|
| `location` | Azure region | `eastus` | Choose based on your location |
| `baseName` | Resource name prefix | `ghactionsdash` | Must be globally unique |
| `environment` | Environment suffix | `dev` | e.g., dev, staging, prod |
| `githubAppId` | GitHub App ID | - | Injected by workflow or set manually |

**Resource Naming Pattern:**
- Function App: `{baseName}-func-{environment}`
- Key Vault: `{baseName}-kv-{environment}`
- Storage Account: `{baseName}{environment}` (no hyphens, lowercase)

## Outputs
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

📖 **Pages Setup**: See [PAGES_SETUP.md](../PAGES_SETUP.md) for complete GitHub Pages configuration and authentication setup.

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

Estimated cost: **$5-10/month** for typical usage.

## Monitoring

See [DEPLOYMENT_NOTES.md](../DEPLOYMENT_NOTES.md#monitoring) for monitoring guidance and Application Insights queries.

## Troubleshooting

### Common Issues

**Deployment fails with "Name not available":**
- Resource names must be globally unique
- Change `baseName` parameter to a unique value

**RBAC assignment fails:**
- Ensure you have Owner or User Access Administrator role
- Service Principal needs both Contributor and User Access Administrator roles

**Key Vault access denied:**
- Wait 2-5 minutes for RBAC permissions to propagate after deployment

For comprehensive troubleshooting, see:
- [SETUP.md](../SETUP.md#troubleshooting) - General troubleshooting
- [AZURE_SETUP.md](../AZURE_SETUP.md#troubleshooting) - Manual deployment troubleshooting

## Cleanup

To delete all resources:

```bash
az group delete --name RESOURCE_GROUP_NAME --yes --no-wait
```

⚠️ **Warning:** This permanently deletes all resources in the resource group.

## Multiple Environments

Deploy multiple environments using separate parameter files:

1. Create separate parameter files:
   - `parameters.dev.json`
   - `parameters.staging.json`
   - `parameters.prod.json`

2. Deploy to different resource groups:
   ```bash
   RESOURCE_GROUP_NAME="ghactionsdash-dev-rg" PARAMETERS_FILE="parameters.dev.json" ./deploy.sh
   RESOURCE_GROUP_NAME="ghactionsdash-prod-rg" PARAMETERS_FILE="parameters.prod.json" ./deploy.sh
   ```

## Automated Deployment with GitHub Actions

This repository includes a workflow at `.github/workflows/deploy-azure-infrastructure.yml` for automated deployment.

**Benefits:**
- ✅ Validates secrets and configuration
- ✅ Securely injects GitHub App credentials
- ✅ Deploys all resources
- ✅ Provides detailed summaries with next steps

**See:** [SETUP.md](../SETUP.md) for complete automated deployment guide.

## Support

For issues:
- **General setup**: See [SETUP.md](../SETUP.md#troubleshooting)
- **Manual deployment**: See [AZURE_SETUP.md](../AZURE_SETUP.md#troubleshooting)
- **Bicep syntax**: See [Bicep documentation](https://docs.microsoft.com/azure/azure-resource-manager/bicep/)
- **Azure resources**: See [Azure documentation](https://docs.microsoft.com/azure/)
