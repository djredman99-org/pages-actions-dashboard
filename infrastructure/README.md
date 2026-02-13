# Azure Infrastructure

This directory contains the Infrastructure as Code (IaC) for deploying the Azure resources required by the GitHub Actions Dashboard and the Insights feature.

## Resources Created

The repository provides two separate Bicep templates:

### Main Infrastructure (main.bicep)

The main Bicep template creates the following Azure resources for the Dashboard:

#### Core Resources

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

### Insights Infrastructure (insights.bicep)

The Insights Bicep template creates separate Azure resources for the Insights feature:

#### Insights Resources

1. **Separate Azure Function App** (Consumption Plan)
   - Runtime: Node.js 20
   - System-assigned Managed Identity
   - CORS enabled for GitHub Pages
   - Dedicated Application Insights

2. **Azure Cosmos DB** (Serverless)
   - Database: ActionsInsights
   - Container: events
   - Partition Key: `/partitionKey` (YYYY-MM format)
   - Optimized for time-series data

3. **Application Insights** (Insights-specific)
   - Separate monitoring for Insights functions
   - Performance metrics and error tracking

4. **App Service Plan** (Insights)
   - Separate consumption plan for Insights functions
   - Independent scaling from main dashboard

#### Key Vault Integration

The Insights infrastructure reuses the existing Key Vault from the main infrastructure to:
- Store the GitHub webhook secret
- Maintain centralized secret management
- Leverage existing Managed Identity setup

### Security Configuration

**Main Infrastructure**:
- **Managed Identity**: Function App uses system-assigned managed identity
- **RBAC Roles**:
  - Function App → Key Vault: "Key Vault Secrets User"
  - Function App → Storage: "Storage Blob Data Contributor"

**Insights Infrastructure**:
- **Managed Identity**: Insights Function App uses system-assigned managed identity
- **RBAC Roles**:
  - Insights Function App → Key Vault: "Key Vault Secrets User"
  - Insights Function App → Cosmos DB: "Cosmos DB Data Contributor"

**Common Security**:
- **Network Security**:
  - HTTPS only for all services
  - TLS 1.2 minimum
  - No public blob access

## Files

### Main Infrastructure
- **main.bicep**: Main Bicep template defining dashboard resources
- **parameters.example.json**: Example parameter file (template)
- **parameters.json**: Deployment parameters (tracked in git, NO SECRETS - GitHub App ID is injected by workflow)
- **deploy.sh**: Manual deployment script for main infrastructure

### Insights Infrastructure
- **insights.bicep**: Bicep template for Insights feature resources (Cosmos DB, Function App)
- **insights.parameters.example.json**: Example parameter file for Insights deployment
- **deploy-insights.sh**: Deployment script for Insights infrastructure

### Documentation
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

4. **Webhook Secret** (for Insights): A strong random secret for validating GitHub webhooks

## Deployment

### Automated Deployment (Recommended)

Use the GitHub Actions workflow for automated deployment. See [CI/CD Deployment](#cicd-deployment) section below.

### Manual Deployment

#### 1. Prepare Parameters

The `parameters.json` file is already in the repository with default values. For manual deployment, you can either:

**Option A: Edit the existing parameters.json**
```bash
cd infrastructure
# Edit parameters.json with your values
```

**Option B: Copy from example**
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
```

## Deploying Insights Infrastructure

The Insights infrastructure must be deployed **after** the main infrastructure since it depends on the existing Key Vault.

### Prerequisites

1. Main infrastructure already deployed (see above)
2. Key Vault name from main deployment
3. Strong webhook secret generated

### Deployment Steps

#### 1. Prepare Insights Parameters

```bash
cd infrastructure
cp insights.parameters.example.json insights.parameters.json
```

Edit `insights.parameters.json` with your values:
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
    "existingKeyVaultName": {
      "value": "ghactionsdash-kv-dev"
    }
  }
}
```

**Note**: Use the same `baseName` and `environment` as the main infrastructure.

#### 2. Deploy Insights Infrastructure

```bash
./deploy-insights.sh
```

The script will:
1. Verify the main resource group exists
2. Deploy Cosmos DB and Insights Function App
3. Configure RBAC permissions
4. Output deployment details and next steps

#### 3. Create Webhook Secret

Generate a strong random secret and store it in Key Vault:

```bash
# Generate a random secret (32 characters)
WEBHOOK_SECRET=$(openssl rand -base64 32)

# Store in Key Vault
az keyvault secret set \
  --vault-name <KEY_VAULT_NAME> \
  --name github-webhook-secret \
  --value "$WEBHOOK_SECRET"

# Save the secret for GitHub webhook configuration
echo "Webhook Secret: $WEBHOOK_SECRET"
```

#### 4. Deploy Insights Function Code

```bash
cd ../function-app-insights
npm install
func azure functionapp publish <INSIGHTS_FUNCTION_APP_NAME> --javascript
```

#### 5. Configure GitHub Webhook

1. Go to your GitHub organization or repository settings
2. Navigate to **Webhooks** → **Add webhook**
3. Configure:
   - **Payload URL**: `https://<INSIGHTS_FUNCTION_APP_NAME>.azurewebsites.net/api/event-triage`
   - **Content type**: `application/json`
   - **Secret**: Use the webhook secret from step 3
   - **Events**: Select **Workflow runs**
   - **Active**: Check

#### 6. Verify Deployment

Test the webhook endpoint:
```bash
curl https://<INSIGHTS_FUNCTION_APP_NAME>.azurewebsites.net/api/health
```

Check Cosmos DB:
```bash
az cosmosdb sql database show \
  --account-name <COSMOS_DB_ACCOUNT_NAME> \
  --resource-group <RESOURCE_GROUP_NAME> \
  --name ActionsInsights
```

### Insights Outputs

After Insights deployment, the following outputs are available:

- **functionAppInsightsName**: Name of the Insights Function App
- **functionAppInsightsUrl**: HTTPS URL of the Insights Function App
- **cosmosDbAccountName**: Name of the Cosmos DB account
- **cosmosDbDatabaseName**: Database name (ActionsInsights)
- **cosmosDbContainerName**: Container name (events)
- **cosmosDbEndpoint**: Cosmos DB endpoint URL
- **functionAppInsightsPrincipalId**: Managed Identity principal ID

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

For automated infrastructure deployment, this repository includes a GitHub Actions workflow at `.github/workflows/deploy-azure-infrastructure.yml`.

### Setup

1. **Add Required Secrets** to your repository (Settings → Secrets and variables → Actions):
   - `GH_APP_ID`: Your GitHub App ID
   - `GH_APP_PRIVATE_KEY`: Your GitHub App Private Key (.pem file contents)
   - `AZURE_CREDENTIALS`: Azure service principal credentials (JSON format)

2. **Configure parameters.json**: Update `infrastructure/parameters.json` with your deployment values (location, baseName, environment). The GitHub App ID is automatically injected from secrets during deployment.

3. **Trigger Deployment**:
   - Manually: Go to Actions → Deploy Azure Infrastructure → Run workflow
   - Automatically: Push changes to `infrastructure/` directory on main branch

The workflow automatically:
- ✅ Validates required secrets and tools
- ✅ Checks for parameters.json file
- ✅ Injects GitHub App ID securely
- ✅ Deploys Azure infrastructure
- ✅ Uploads GitHub App Private Key to Key Vault
- ✅ Validates deployment
- ✅ Provides detailed job summaries with next steps

## Support

For issues with:
- **Bicep syntax**: See [Bicep documentation](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- **Azure resources**: See [Azure documentation](https://docs.microsoft.com/en-us/azure/)
- **Deployment errors**: Check Azure deployment logs in the portal
