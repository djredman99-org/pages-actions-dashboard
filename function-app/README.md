# Azure Function App - GitHub Actions Dashboard API

This Azure Function App provides a secure backend API for the GitHub Actions Dashboard. It handles GitHub App authentication, retrieves workflow configurations from Azure Storage, and returns workflow statuses.

## Architecture

### Functions

- **get-workflow-statuses**: HTTP-triggered function that returns workflow statuses for all configured workflows
- **add-workflow**: HTTP-triggered function that adds a new workflow to the dashboard configuration
- **remove-workflow**: HTTP-triggered function that removes a workflow from the dashboard configuration

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

### Deploy to Azure

1. Ensure infrastructure is deployed (see `../infrastructure/README.md`)

2. Deploy function code:
   ```bash
   func azure functionapp publish <FUNCTION_APP_NAME>
   ```

3. Verify deployment:
   ```bash
   curl https://<FUNCTION_APP_NAME>.azurewebsites.net/api/get-workflow-statuses
   ```

### CI/CD Deployment

For automated deployments, use GitHub Actions with Azure Service Principal authentication. Example workflow:

```yaml
name: Deploy Function App

on:
  push:
    branches: [main]
    paths:
      - 'function-app/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd function-app
          npm install
      
      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Deploy to Function App
        run: |
          cd function-app
          func azure functionapp publish ${{ secrets.FUNCTION_APP_NAME }}
```

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
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "owner": "your-org",
    "repo": "your-repo",
    "workflow": "ci.yml",
    "label": "CI Build"
  }
]
```

**Fields:**
- `id` (string, required): GUID identifying the workflow. Auto-generated if missing.
- `owner` (string, required): GitHub repository owner (org or user)
- `repo` (string, required): GitHub repository name
- `workflow` (string, required): Workflow filename (e.g., "ci.yml")
- `label` (string, required): Display label for the dashboard

**Note:** The `id` field is automatically generated for existing workflows without one when the `get-workflow-statuses` function runs.

Upload using Azure CLI:
```bash
az storage blob upload \
  --account-name <STORAGE_ACCOUNT_NAME> \
  --container-name workflow-configs \
  --name workflows.json \
  --file workflows.json \
  --auth-mode login
```

### API Endpoints

#### GET/POST `/api/get-workflow-statuses`

Returns workflow statuses for all configured workflows.

**Response:**
```json
{
  "workflows": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "owner": "your-org",
      "repo": "your-repo",
      "workflow": "ci.yml",
      "label": "CI Build",
      "conclusion": "success",
      "status": "completed",
      "url": "https://github.com/your-org/your-repo/actions/runs/123456",
      "updatedAt": "2025-12-21T20:00:00Z"
    }
  ],
  "timestamp": "2025-12-21T20:17:31.942Z",
  "count": 1
}
```

#### POST `/api/add-workflow`

Adds a new workflow to the dashboard configuration.

**Request Body:**
```json
{
  "repo": "owner/repo",
  "workflow": "workflow-file.yml",
  "label": "Workflow Label"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Workflow added successfully",
  "workflow": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "owner": "owner",
    "repo": "repo",
    "workflow": "workflow-file.yml",
    "label": "Workflow Label"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body or validation error
- `409 Conflict`: Workflow already exists
- `500 Internal Server Error`: Server error

#### POST/DELETE `/api/remove-workflow`

Removes a workflow from the dashboard configuration.

**Request Body:**
```json
{
  "repo": "owner/repo",
  "workflow": "workflow-file.yml"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Workflow removed successfully",
  "workflow": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "owner": "owner",
    "repo": "repo",
    "workflow": "workflow-file.yml",
    "label": "Workflow Label"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body or validation error
- `404 Not Found`: Workflow not found
- `500 Internal Server Error`: Server error

## Monitoring

### Application Insights

The function automatically logs to Application Insights. View logs in Azure Portal:

1. Go to Function App → Application Insights
2. Navigate to "Logs" or "Live Metrics"

### Query Logs

Example query to view function executions:
```kusto
requests
| where operation_Name == "get-workflow-statuses"
| project timestamp, duration, resultCode
| order by timestamp desc
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
az role assignment list \
  --assignee <FUNCTION_APP_PRINCIPAL_ID> \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RG_NAME>/providers/Microsoft.Storage/storageAccounts/<STORAGE_NAME>
```

### GitHub App authentication failed

Verify GitHub App credentials in Key Vault:
```bash
az keyvault secret show \
  --vault-name <VAULT_NAME> \
  --name github-app-id

az keyvault secret show \
  --vault-name <VAULT_NAME> \
  --name github-app-private-key
```

## Performance

### Caching

The function uses a 60-second cache on the client side to reduce Azure Function invocations. Adjust in `pages/api.js`:

```javascript
this.cacheTTL = 60000; // milliseconds
```

### Cold Start

Azure Functions on Consumption plan may experience cold starts. Typical cold start: 2-5 seconds. For production, consider:

- Premium Plan: Eliminates cold starts with pre-warmed instances
- Always On: Keeps function loaded (requires Premium or App Service plan)

### Rate Limiting

GitHub API rate limits apply. GitHub App installations have higher rate limits (5,000 requests/hour) compared to Personal Access Tokens.

## Security

### Managed Identity

The function uses System-assigned Managed Identity to access:
- Azure Key Vault (for GitHub App credentials)
- Azure Storage (for workflow configurations)

No credentials are stored in the function code or configuration.

### CORS

Configure CORS to restrict access to your GitHub Pages domain:

```bash
az functionapp cors add \
  --name <FUNCTION_APP_NAME> \
  --resource-group <RESOURCE_GROUP_NAME> \
  --allowed-origins "https://your-org.github.io"
```

📖 **Pages Setup**: See [PAGES_SETUP.md](../PAGES_SETUP.md) for complete GitHub Pages configuration and authentication setup.

### Function Keys

By default, the function uses `authLevel: 'anonymous'` for easy access. For production, consider enabling function keys:

1. Change `authLevel: 'function'` in function definition
2. Retrieve function key:
   ```bash
   az functionapp function keys list \
     --name <FUNCTION_APP_NAME> \
     --resource-group <RESOURCE_GROUP_NAME> \
     --function-name get-workflow-statuses
   ```
3. Pass key in requests: `?code=<FUNCTION_KEY>`

## Contributing

When modifying the function:

1. Test locally with `npm start`
2. Verify against real Azure resources
3. Deploy to a test environment first
4. Monitor Application Insights for errors
5. Update documentation as needed

## Dependencies

- `@azure/functions`: Azure Functions runtime
- `@azure/identity`: Azure authentication (Managed Identity)
- `@azure/keyvault-secrets`: Key Vault client
- `@azure/storage-blob`: Blob Storage client
- `@octokit/auth-app`: GitHub App authentication
- `@octokit/rest`: GitHub API client

Keep dependencies updated:
```bash
npm outdated
npm update
```
