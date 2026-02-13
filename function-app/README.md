# Azure Function App - GitHub Actions Dashboard API

> **Note:** This is a development reference. For deployment instructions, see [SETUP.md](../SETUP.md).

This Azure Function App provides the secure backend API for the GitHub Actions Dashboard.

## Overview

The function app handles:
- GitHub App authentication
- Workflow configuration management
- Workflow status retrieval from GitHub API
- Dashboard management (create, rename, delete)

All data is stored securely:
- GitHub App credentials in Azure Key Vault
- Workflow configurations in Azure Storage
- No credentials exposed to the frontend

## Architecture

### Functions

#### Workflow Management
- **get-workflow-statuses**: HTTP-triggered function that returns workflow statuses for all configured workflows
- **add-workflow**: HTTP-triggered function that adds a new workflow to the dashboard configuration
- **remove-workflow**: HTTP-triggered function that removes a workflow from the dashboard configuration
- **reorder-workflows**: HTTP-triggered function that reorders workflows within the active dashboard

#### Dashboard Management
- **create-dashboard**: HTTP-triggered function that creates a new dashboard
- **set-active-dashboard**: HTTP-triggered function that switches the active dashboard
- **rename-dashboard**: HTTP-triggered function that renames an existing dashboard
- **delete-dashboard**: HTTP-triggered function that deletes a dashboard

### Modules

- **github-auth.js**: Handles GitHub App authentication using private key
- **keyvault-client.js**: Retrieves secrets from Azure Key Vault using Managed Identity
- **storage-client.js**: Reads/writes workflow configurations from Azure Blob Storage using Managed Identity

### Data Flow

1. Client (GitHub Pages) calls `/api/get-workflow-statuses`
2. Function retrieves GitHub App credentials from Key Vault
3. Function retrieves workflow configurations from Azure Storage
4. Function authenticates with GitHub as App installation
5. Function fetches workflow run statuses from GitHub API
6. Function returns combined results as JSON

## Local Development

### Prerequisites

- Node.js 18+
- Azure Functions Core Tools v4
- Azure CLI (logged in)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `local.settings.json`:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "KEY_VAULT_URL": "https://your-keyvault.vault.azure.net/",
       "STORAGE_ACCOUNT_URL": "https://yourstorageaccount.blob.core.windows.net/",
       "WORKFLOW_CONFIG_CONTAINER": "workflow-configs"
     }
   }
   ```

3. Ensure you're logged in to Azure CLI:
   ```bash
   az login
   ```

4. Start the function locally:
   ```bash
   npm start
   ```

5. Test the function:
   ```bash
   curl http://localhost:7071/api/get-workflow-statuses
   ```

### Local Testing with Azure Resources

When running locally, the function uses your Azure CLI credentials (via `DefaultAzureCredential`) to access Key Vault and Storage. Ensure you have the necessary permissions:

- **Key Vault**: "Key Vault Secrets User" role
- **Storage Account**: "Storage Blob Data Contributor" role

## Deployment

### Automated Deployment (Recommended)

Use the GitHub Actions workflow:

1. Run the **"Deploy Azure Function"** workflow from the Actions tab
2. Workflow automatically builds and deploys the function code
3. Triggers automatically on changes to `function-app/**`

**See:** [SETUP.md](../SETUP.md) for complete deployment guide.

### Manual Deployment

For manual deployment:

```bash
# Install dependencies
npm install

# Deploy to Azure
func azure functionapp publish FUNCTION_APP_NAME
```

**See:** [AZURE_SETUP.md](../AZURE_SETUP.md) for manual deployment details.

## Configuration

### Environment Variables

The function uses these environment variables (set automatically by Bicep deployment):

- `KEY_VAULT_URL`: Azure Key Vault URL
- `STORAGE_ACCOUNT_URL`: Azure Storage Account URL
- `WORKFLOW_CONFIG_CONTAINER`: Storage container name for workflow configs
- `APPINSIGHTS_INSTRUMENTATIONKEY`: Application Insights key
- `APPLICATIONINSIGHTS_CONNECTION_STRING`: Application Insights connection string

### Workflow Configuration Format

Workflows are stored in Azure Storage as `workflows.json`:

```json
{
  "dashboardId": "550e8400-e29b-41d4-a716-446655440000",
  "workflows": [
    {
      "owner": "your-org",
      "repo": "your-repo",
      "workflow": "ci.yml",
      "label": "CI Build"
    }
  ]
}
```

**Structure:**
- `dashboardId` (string, required): GUID identifying the dashboard. Auto-generated on first run if missing.
- `workflows` (array, required): Array of workflow configurations

**Workflow Fields:**
- `owner` (string, required): GitHub repository owner (org or user)
- `repo` (string, required): GitHub repository name
- `workflow` (string, required): Workflow filename (e.g., "ci.yml")
- `label` (string, required): Display label for the dashboard

**Note:** Configuration automatically migrates from legacy array format.

**See:** [SETUP.md](../SETUP.md#configure-workflows-to-monitor) for workflow configuration guide.

### API Endpoints

For complete API documentation, see [WORKFLOW_MANAGEMENT_API.md](../WORKFLOW_MANAGEMENT_API.md).

**Key endpoints:**
- `GET /api/get-workflow-statuses` - Get workflow statuses
- `POST /api/add-workflow` - Add a workflow
- `POST /api/remove-workflow` - Remove a workflow
- `POST /api/create-dashboard` - Create a dashboard
- `POST /api/rename-dashboard` - Rename a dashboard
- `POST /api/delete-dashboard` - Delete a dashboard

## Monitoring

Application Insights is automatically configured for monitoring. View logs:

```bash
az functionapp log tail --name FUNCTION_APP_NAME --resource-group RESOURCE_GROUP_NAME
```

**See:** [DEPLOYMENT_NOTES.md](../DEPLOYMENT_NOTES.md#monitoring) for monitoring queries and alerts.

## Troubleshooting
```

### Error Tracking

Track errors and exceptions:
```kusto
exceptions
| where operation_Name == "get-workflow-statuses"
| project timestamp, type, message, operation_Name
| order by timestamp desc
```

## Troubleshooting

### Function returns 500 error

Check Application Insights logs for detailed error messages:
```bash
az monitor app-insights query \
  --app <APP_INSIGHTS_NAME> \
  --analytics-query "exceptions | order by timestamp desc | take 10"
```

### "Missing required environment variables"

Verify environment variables are set in Function App configuration:
```bash
az functionapp config appsettings list \
  --name <FUNCTION_APP_NAME> \
  --resource-group <RESOURCE_GROUP_NAME>
```

### "Key Vault access failed"

Ensure Function App's Managed Identity has "Key Vault Secrets User" role:
```bash
az role assignment list \
  --assignee <FUNCTION_APP_PRINCIPAL_ID> \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RG_NAME>/providers/Microsoft.KeyVault/vaults/<VAULT_NAME>
```

### "Storage access failed"

Ensure Function App's Managed Identity has "Storage Blob Data Contributor" role:
```bash
Application Insights is automatically configured for monitoring. View logs:

```bash
az functionapp log tail --name FUNCTION_APP_NAME --resource-group RESOURCE_GROUP_NAME
```

**See:** [DEPLOYMENT_NOTES.md](../DEPLOYMENT_NOTES.md#monitoring) for monitoring queries and alerts.

## Troubleshooting

### Common Issues

**Function returns 500 errors:**
- Check Application Insights logs
- Verify RBAC permissions (Key Vault Secrets User, Storage Blob Data Contributor)
- Ensure GitHub App credentials are in Key Vault

**GitHub App authentication failed:**
- Verify GitHub App ID and private key in Key Vault
- Check GitHub App is installed on target repositories
- Ensure App has "Actions: Read" permission

**See:** [SETUP.md](../SETUP.md#troubleshooting) for comprehensive troubleshooting.

## Security

### Managed Identity

The function uses System-assigned Managed Identity to access Azure resources without storing credentials.

### CORS

Configure CORS to restrict access:

```bash
az functionapp cors add \
  --name FUNCTION_APP_NAME \
  --resource-group RESOURCE_GROUP_NAME \
  --allowed-origins "https://your-org.github.io"
```

## Contributing

When modifying the function:

1. Test locally with `npm start`
2. Verify against real Azure resources
3. Deploy to a test environment first
4. Monitor Application Insights for errors
5. Update documentation

## Dependencies

Key packages:
- `@azure/functions` - Azure Functions runtime
- `@azure/identity` - Managed Identity authentication
- `@azure/keyvault-secrets` - Key Vault access
- `@azure/storage-blob` - Blob Storage access
- `@octokit/auth-app` - GitHub App authentication
- `@octokit/rest` - GitHub API client

Update dependencies regularly:
```bash
npm outdated
npm update
```

## Support

For function-related issues:
- **Setup/Deployment**: See [SETUP.md](../SETUP.md)
- **API Documentation**: See [WORKFLOW_MANAGEMENT_API.md](../WORKFLOW_MANAGEMENT_API.md)
- **Monitoring**: See [DEPLOYMENT_NOTES.md](../DEPLOYMENT_NOTES.md)
