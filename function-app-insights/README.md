# GitHub Actions Insights Function App

Azure Function App for the GitHub Actions Insights feature - receives webhooks from GitHub, processes workflow events, and stores them in Cosmos DB for analytics and reporting.

## Overview

This Function App is part of the GitHub Actions Dashboard Insights feature and provides:

- **Webhook Receiver**: Receives and validates GitHub webhook events
- **Event Triage**: Processes workflow_run events and stores them in Cosmos DB
- **Data Retrieval**: Provides API endpoints for querying insights data

## Architecture

The Insights Function App consists of three main functions:

### 1. webhook-receiver
- **Purpose**: Entry point for GitHub webhooks
- **Method**: POST
- **Authentication**: Validates webhook signatures using shared secret
- **Endpoint**: `/api/webhook-receiver`

### 2. event-triage
- **Purpose**: Processes and stores workflow events in Cosmos DB
- **Method**: POST
- **Authentication**: Validates webhook signatures using shared secret
- **Endpoint**: `/api/event-triage`
- **Storage**: Extracts key fields and stores complete webhook payload

### 3. get-insights-data
- **Purpose**: Retrieves insights data for reporting and analytics
- **Method**: GET
- **Authentication**: Anonymous (consider adding authentication for production)
- **Endpoint**: `/api/get-insights-data`

## Data Model

Events are stored in Cosmos DB with the following schema:

```json
{
  "id": "repo_id_run_id",
  "partitionKey": "2026-01",
  "timestamp": "2026-01-15T10:30:00Z",
  "eventType": "workflow_run",
  "action": "completed",
  "repository": "owner/repo",
  "repositoryId": 12345,
  "workflowName": "CI/CD Pipeline",
  "workflowId": 12345,
  "runId": 67890,
  "runNumber": 42,
  "status": "completed",
  "conclusion": "success",
  "duration_seconds": 145,
  "actor": "username",
  "branch": "main",
  "triggeredBy": "push",
  "htmlUrl": "https://github.com/owner/repo/actions/runs/67890",
  "rawPayload": { /* complete GitHub webhook JSON */ }
}
```

**Key Design Decisions**:
- **Partition Key**: Uses `YYYY-MM` format for monthly partitioning
- **ID**: Combines repository ID and run ID for uniqueness
- **Raw Payload**: Stores complete webhook data for future analysis
- **Indexed Fields**: Key fields extracted for efficient querying

## Prerequisites

- Node.js 18 or higher
- Azure CLI
- Azure Functions Core Tools v4
- Azure subscription with:
  - Cosmos DB account (serverless mode)
  - Key Vault (for webhook secret)
  - Managed Identity configured

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create local settings**:
   ```bash
   cp local.settings.json.example local.settings.json
   ```

3. **Configure local.settings.json**:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "KEY_VAULT_URL": "https://your-keyvault.vault.azure.net/",
       "COSMOS_DB_ENDPOINT": "https://your-cosmosdb.documents.azure.com:443/",
       "COSMOS_DB_DATABASE": "ActionsInsights",
       "COSMOS_DB_CONTAINER": "events"
     }
   }
   ```

4. **Start the function app**:
   ```bash
   npm start
   ```

   The functions will be available at:
   - http://localhost:7071/api/webhook-receiver
   - http://localhost:7071/api/event-triage
   - http://localhost:7071/api/get-insights-data
   - http://localhost:7071/api/health

## Deployment

### Prerequisites

1. Deploy the Insights infrastructure using the Bicep template:
   ```bash
   cd ../infrastructure
   ./deploy-insights.sh
   ```

2. Create the webhook secret in Key Vault:
   ```bash
   az keyvault secret set \
     --vault-name <KEY_VAULT_NAME> \
     --name github-webhook-secret \
     --value '<GENERATE_A_STRONG_SECRET>'
   ```

### Deploy Function App

```bash
# Install dependencies
npm install

# Deploy to Azure
func azure functionapp publish <FUNCTION_APP_NAME> --javascript
```

Replace `<FUNCTION_APP_NAME>` with your Insights Function App name (e.g., `ghactionsdash-func-insights-dev`).

## GitHub Webhook Configuration

1. Go to your GitHub organization or repository settings
2. Navigate to **Webhooks** → **Add webhook**
3. Configure:
   - **Payload URL**: `https://<FUNCTION_APP_NAME>.azurewebsites.net/api/event-triage`
   - **Content type**: `application/json`
   - **Secret**: Use the same secret stored in Key Vault
   - **Which events**: Select **Workflow runs** (or **Let me select individual events**)
   - **Active**: Check this box

4. Click **Add webhook**

## API Documentation

### POST /api/webhook-receiver

Receives and validates GitHub webhook events (basic validation endpoint).

**Headers**:
- `X-Hub-Signature-256`: GitHub webhook signature
- `X-GitHub-Event`: Event type

**Response**:
```json
{
  "message": "Webhook received and validated",
  "eventType": "workflow_run",
  "action": "completed",
  "deliveryId": "12345678-1234-1234-1234-123456789012",
  "received": "2026-01-27T12:00:00Z"
}
```

### POST /api/event-triage

Processes webhook events and stores them in Cosmos DB.

**Headers**:
- `X-Hub-Signature-256`: GitHub webhook signature
- `X-GitHub-Event`: Event type

**Response**:
```json
{
  "message": "Event processed and stored successfully",
  "eventId": "12345_67890",
  "partitionKey": "2026-01",
  "repository": "owner/repo",
  "workflowName": "CI/CD Pipeline",
  "conclusion": "success"
}
```

### GET /api/get-insights-data

Retrieves insights data from Cosmos DB.

**Query Parameters**:
- `type`: Query type (`recent`, `stats`, `repository`) - default: `recent`
- `repository`: Filter by repository (format: `owner/repo`)
- `partition`: Partition key (YYYY-MM format) - default: current month
- `limit`: Maximum results (default: 100, max: 1000)
- `includeRaw`: Include raw payload (default: false)
- `startPartition`: Start partition for stats (YYYY-MM format)
- `endPartition`: End partition for stats (YYYY-MM format)

**Examples**:

Get recent events for current month:
```
GET /api/get-insights-data?type=recent
```

Get events for a specific repository:
```
GET /api/get-insights-data?type=repository&repository=owner/repo
```

Get aggregated statistics:
```
GET /api/get-insights-data?type=stats&startPartition=2026-01&endPartition=2026-01
```

**Response**:
```json
{
  "queryType": "recent",
  "partition": "2026-01",
  "repository": null,
  "count": 42,
  "data": [
    {
      "id": "12345_67890",
      "partitionKey": "2026-01",
      "timestamp": "2026-01-27T12:00:00Z",
      "repository": "owner/repo",
      "workflowName": "CI Build",
      "conclusion": "success",
      "duration_seconds": 145
    }
  ]
}
```

### GET /api/health

Health check endpoint.

**Response**:
```json
{
  "status": "healthy",
  "service": "github-actions-insights",
  "timestamp": "2026-01-27T12:00:00Z"
}
```

## Monitoring

### View Logs

```bash
# Stream live logs
az functionapp log tail \
  --name <FUNCTION_APP_NAME> \
  --resource-group <RESOURCE_GROUP>

# View Application Insights
az monitor app-insights component show \
  --app <APP_INSIGHTS_NAME> \
  --resource-group <RESOURCE_GROUP>
```

### Key Metrics

Monitor these metrics in Application Insights:
- Request count and rate
- Response times
- Failed requests
- Cosmos DB request units (RU/s)
- Function execution time

## Troubleshooting

### Webhook Validation Fails

**Symptom**: Webhook returns 401 Unauthorized

**Solutions**:
1. Verify webhook secret matches between GitHub and Key Vault:
   ```bash
   az keyvault secret show \
     --vault-name <KEY_VAULT_NAME> \
     --name github-webhook-secret \
     --query "value"
   ```

2. Check that the Function App has access to Key Vault:
   ```bash
   az role assignment list \
     --assignee <FUNCTION_APP_PRINCIPAL_ID> \
     --scope <KEY_VAULT_RESOURCE_ID>
   ```

### Events Not Storing in Cosmos DB

**Symptom**: Event triage returns 500 error

**Solutions**:
1. Verify Cosmos DB connection:
   ```bash
   az cosmosdb show \
     --name <COSMOS_DB_ACCOUNT> \
     --resource-group <RESOURCE_GROUP>
   ```

2. Check RBAC permissions:
   ```bash
   az role assignment list \
     --assignee <FUNCTION_APP_PRINCIPAL_ID> \
     --scope <COSMOS_DB_RESOURCE_ID>
   ```

3. Verify database and container exist:
   ```bash
   az cosmosdb sql database show \
     --account-name <COSMOS_DB_ACCOUNT> \
     --resource-group <RESOURCE_GROUP> \
     --name ActionsInsights
   ```

### Function App Not Starting

**Symptom**: Functions not responding

**Solutions**:
1. Check configuration:
   ```bash
   az functionapp config appsettings list \
     --name <FUNCTION_APP_NAME> \
     --resource-group <RESOURCE_GROUP>
   ```

2. Restart the function app:
   ```bash
   az functionapp restart \
     --name <FUNCTION_APP_NAME> \
     --resource-group <RESOURCE_GROUP>
   ```

3. Check for deployment errors:
   ```bash
   az functionapp deployment list-publishing-profiles \
     --name <FUNCTION_APP_NAME> \
     --resource-group <RESOURCE_GROUP>
   ```

## Security Considerations

1. **Webhook Secret**: Use a strong, random secret (min 32 characters)
2. **CORS**: Configure allowed origins in infrastructure
3. **Authentication**: Consider adding authentication to get-insights-data endpoint
4. **Rate Limiting**: Implement rate limiting for public endpoints
5. **Managed Identity**: Always use Managed Identity for Azure service access
6. **Data Privacy**: Ensure webhook payloads don't contain sensitive data

## Cost Estimation

Azure resources used:
- **Function App (Consumption)**: Pay-per-execution (~$0.20/million executions)
- **Cosmos DB (Serverless)**: Pay-per-RU and storage (~$0.25/million RUs)
- **Application Insights**: Included (first 5GB free)
- **Key Vault**: Minimal cost for secret access

Estimated monthly cost: **$5-20** depending on webhook volume.

## Related Documentation

- [Main Infrastructure README](../infrastructure/README.md)
- [Azure Setup Guide](../AZURE_SETUP.md)
- [Cosmos DB Documentation](https://docs.microsoft.com/en-us/azure/cosmos-db/)
- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)

## License

MIT
