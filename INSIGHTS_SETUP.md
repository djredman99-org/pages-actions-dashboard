# Azure Actions Insights Setup Guide

Complete guide for deploying and configuring the GitHub Actions Insights feature.

## Overview

The Insights feature captures GitHub webhook events (specifically `workflow_run` events) and stores them in Azure Cosmos DB for analytics and reporting. This enables you to:

- Track workflow execution history over time
- Analyze success/failure rates by repository and workflow
- Monitor workflow performance and duration trends
- Generate custom reports and insights

## Architecture

```
GitHub Webhooks → Azure Function (Insights) → Cosmos DB
                       ↓
                  Key Vault (webhook secret)
```

**Components**:
1. **Cosmos DB**: Time-series storage partitioned by month (YYYY-MM)
2. **Function App** (Insights): Separate from dashboard API
   - `webhook-receiver`: Validates incoming webhooks
   - `event-triage`: Processes and stores events
   - `get-insights-data`: Retrieves data for reporting
3. **Key Vault**: Reuses existing vault from main infrastructure
4. **Managed Identity**: Secure access to Cosmos DB and Key Vault

## Prerequisites

Before you begin, ensure you have:

1. **Main Dashboard Infrastructure**: Already deployed (see [AZURE_SETUP.md](AZURE_SETUP.md))
2. **Azure CLI**: Installed and authenticated (`az login`)
3. **Node.js 18+**: For function development
4. **Azure Functions Core Tools**: For deployment (`func` command)
5. **GitHub Organization Admin**: Access to configure webhooks

## Deployment Process

You can deploy Insights using either:
- **Option A: Automated GitHub Actions Workflow** (Recommended) - Deploys infrastructure and code automatically
- **Option B: Manual Deployment** - Deploy using command line for more control

### Option A: Automated Deployment via GitHub Actions (Recommended)

This is the easiest way to deploy the Insights infrastructure and function app code.

#### Step 1: Run the Infrastructure Deployment Workflow

1. Go to your repository on GitHub
2. Click on **Actions** tab
3. Select **Deploy Azure Infrastructure** workflow
4. Click **Run workflow**
5. Configure the workflow:
   - **Environment**: Choose your environment (dev/staging/prod)
   - **Also deploy Insights infrastructure**: ✅ **Check this box**
6. Click **Run workflow**

The workflow will:
- ✅ Deploy the main infrastructure (if not already deployed)
- ✅ Deploy Insights infrastructure (Cosmos DB and Function App)
- ✅ Configure all necessary permissions
- ✅ Display the Insights Function App name in the output

#### Step 2: Save the Insights Function App Name

After the workflow completes:
1. Check the workflow summary for the Insights Function App name
2. Add it as a repository secret:
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `INSIGHTS_FUNCTION_APP_NAME`
   - Value: The function app name from the workflow output (e.g., `ghactionsdash-func-insights-dev`)

#### Step 3: Deploy the Function App Code

1. Go to **Actions** tab
2. Select **Deploy Azure Function** workflow
3. Click **Run workflow**
4. Configure:
   - **Which function app to deploy**: Select **insights** or **both**
5. Click **Run workflow**

This will deploy the Insights function app code automatically.

#### Step 4: Configure GitHub Webhook

Continue with the webhook configuration in [Step 5 of Manual Deployment](#step-5-configure-github-webhook) below.

---

### Option B: Manual Deployment

Use this option if you prefer command-line control or need to customize the deployment.

#### Step 1: Prepare Infrastructure Parameters

Navigate to the infrastructure directory:
```bash
cd infrastructure
```

**Note**: The Insights deployment now reads from the shared `parameters.json` file (not a separate `insights.parameters.json`). The script will derive the Key Vault name from your base parameters using the pattern: `<baseName>-kv-<environment>` (e.g., `ghactionsdash-kv-dev`).

Make sure your main `parameters.json` exists with the correct values for `location`, `baseName`, and `environment`.

#### Step 2: Deploy Insights Infrastructure

Run the deployment script:
```bash
./deploy-insights.sh
```

The script will:
1. ✅ Verify the main resource group exists
2. ✅ Deploy Cosmos DB with serverless mode
3. ✅ Create the ActionsInsights database and events container
4. ✅ Deploy a separate Insights Function App
5. ✅ Configure Managed Identity and RBAC permissions
6. ✅ Output deployment details

**Expected Output**:
```
Insights Function App:
  Name: ghactionsdash-func-insights-dev
  URL: https://ghactionsdash-func-insights-dev.azurewebsites.net

Cosmos DB:
  Account Name: ghactionsdash-cosmos-dev
  Endpoint: https://ghactionsdash-cosmos-dev.documents.azure.com:443/
  Database: ActionsInsights
  Container: events
```

**Save these values** - you'll need them for the next steps.

### Step 3: Generate and Store Webhook Secret

Generate a strong random secret:
```bash
# Generate a 32-character random secret
WEBHOOK_SECRET=$(openssl rand -base64 32)
echo "Generated webhook secret: $WEBHOOK_SECRET"
```

Store the secret in Key Vault:
```bash
az keyvault secret set \
  --vault-name <KEY_VAULT_NAME> \
  --name github-webhook-secret \
  --value "$WEBHOOK_SECRET"
```

Replace `<KEY_VAULT_NAME>` with your Key Vault name from Step 1.

**Important**: Save the `$WEBHOOK_SECRET` value - you'll need it when configuring the GitHub webhook.

### Step 4: Deploy Function App Code

Navigate to the function app directory:
```bash
cd ../function-app-insights
```

Install dependencies:
```bash
npm install
```

Deploy to Azure:
```bash
func azure functionapp publish <INSIGHTS_FUNCTION_APP_NAME> --javascript
```

Replace `<INSIGHTS_FUNCTION_APP_NAME>` with the name from Step 2 (e.g., `ghactionsdash-func-insights-dev`).

**Expected Output**:
```
Functions in ghactionsdash-func-insights-dev:
    event-triage - [httpTrigger]
        Invoke url: https://ghactionsdash-func-insights-dev.azurewebsites.net/api/event-triage

    get-insights-data - [httpTrigger]
        Invoke url: https://ghactionsdash-func-insights-dev.azurewebsites.net/api/get-insights-data

    health - [httpTrigger]
        Invoke url: https://ghactionsdash-func-insights-dev.azurewebsites.net/api/health

    webhook-receiver - [httpTrigger]
        Invoke url: https://ghactionsdash-func-insights-dev.azurewebsites.net/api/webhook-receiver
```

### Step 5: Configure GitHub Webhook

#### Option A: Organization-Level Webhook (Recommended)

For monitoring all repositories in your organization:

1. Go to your GitHub organization settings
2. Navigate to **Settings** → **Webhooks** → **Add webhook**
3. Configure the webhook:
   - **Payload URL**: `https://<INSIGHTS_FUNCTION_APP_NAME>.azurewebsites.net/api/event-triage`
   - **Content type**: `application/json`
   - **Secret**: Enter the webhook secret from Step 3
   - **SSL verification**: Enable SSL verification
   - **Which events would you like to trigger this webhook?**: 
     - Select **Let me select individual events**
     - Check **Workflow runs** only
   - **Active**: ✅ Check this box
4. Click **Add webhook**

#### Option B: Repository-Level Webhook

For monitoring a single repository:

1. Go to your repository settings
2. Navigate to **Settings** → **Webhooks** → **Add webhook**
3. Use the same configuration as Option A

### Step 6: Verify Deployment

#### Test Health Endpoint

```bash
curl https://<INSIGHTS_FUNCTION_APP_NAME>.azurewebsites.net/api/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "service": "github-actions-insights",
  "timestamp": "2026-01-27T21:00:00Z"
}
```

#### Verify Cosmos DB

```bash
az cosmosdb sql database show \
  --account-name <COSMOS_DB_ACCOUNT_NAME> \
  --resource-group <RESOURCE_GROUP_NAME> \
  --name ActionsInsights
```

#### Test Webhook (Optional)

You can test the webhook by triggering a workflow run in any monitored repository. Check the webhook delivery status in GitHub:

1. Go to Settings → Webhooks
2. Click on your webhook
3. View recent deliveries
4. Verify the response shows `201 Created`

#### View Stored Events

Query the data using the Insights API:
```bash
curl "https://<INSIGHTS_FUNCTION_APP_NAME>.azurewebsites.net/api/get-insights-data?type=recent&limit=10"
```

## Data Model

Events are stored with the following structure:

```json
{
  "id": "12345_67890",
  "partitionKey": "2026-01",
  "timestamp": "2026-01-27T12:00:00Z",
  "eventType": "workflow_run",
  "action": "completed",
  "repository": "owner/repo",
  "repositoryId": 12345,
  "workflowName": "CI/CD Pipeline",
  "workflowId": 67890,
  "runId": 67890,
  "runNumber": 42,
  "status": "completed",
  "conclusion": "success",
  "duration_seconds": 145,
  "actor": "username",
  "branch": "main",
  "triggeredBy": "push",
  "htmlUrl": "https://github.com/owner/repo/actions/runs/67890",
  "rawPayload": { /* complete webhook payload */ }
}
```

**Key Points**:
- `id`: Unique identifier (repository_id + run_id)
- `partitionKey`: YYYY-MM format for monthly partitioning
- `rawPayload`: Complete GitHub webhook data for future analysis

## Querying Data

### Get Recent Events

```bash
curl "https://<FUNCTION_APP_URL>/api/get-insights-data?type=recent&limit=50"
```

### Get Events for a Repository

```bash
curl "https://<FUNCTION_APP_URL>/api/get-insights-data?type=repository&repository=owner/repo&limit=100"
```

### Get Aggregated Statistics

```bash
curl "https://<FUNCTION_APP_URL>/api/get-insights-data?type=stats&startPartition=2026-01&endPartition=2026-01"
```

### Include Raw Payload

```bash
curl "https://<FUNCTION_APP_URL>/api/get-insights-data?type=recent&includeRaw=true"
```

For detailed API documentation, see [function-app-insights/README.md](function-app-insights/README.md).

## Monitoring

### View Function Logs

Stream live logs:
```bash
az functionapp log tail \
  --name <INSIGHTS_FUNCTION_APP_NAME> \
  --resource-group <RESOURCE_GROUP_NAME>
```

### Check Application Insights

View metrics in Azure Portal:
1. Navigate to your Function App
2. Click **Application Insights**
3. View metrics: Requests, Response times, Failed requests

### Monitor Cosmos DB

Check request units and storage:
```bash
az cosmosdb show \
  --name <COSMOS_DB_ACCOUNT_NAME> \
  --resource-group <RESOURCE_GROUP_NAME>
```

## Cost Estimation

Based on typical usage patterns:

| Resource | Pricing Model | Estimated Monthly Cost |
|----------|---------------|------------------------|
| Function App (Consumption) | Pay-per-execution | $0.50 - $2 |
| Cosmos DB (Serverless) | Pay-per-RU + storage | $3 - $15 |
| Application Insights | First 5GB free | $0 - $2 |
| Key Vault | Per-operation | $0.10 |
| **Total** | | **$5 - $20/month** |

Actual costs depend on:
- Number of webhook events (workflow runs)
- Query frequency
- Data retention period
- Storage size

## Troubleshooting

### Webhook Returns 401 Unauthorized

**Cause**: Signature validation failed

**Solutions**:
1. Verify the webhook secret matches:
   ```bash
   # Get secret from Key Vault
   az keyvault secret show \
     --vault-name <KEY_VAULT_NAME> \
     --name github-webhook-secret \
     --query "value" -o tsv
   
   # Compare with GitHub webhook configuration
   ```

2. Check Key Vault RBAC permissions:
   ```bash
   az role assignment list \
     --assignee <FUNCTION_APP_PRINCIPAL_ID> \
     --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RG>/providers/Microsoft.KeyVault/vaults/<KV_NAME>
   ```

### Events Not Storing in Cosmos DB

**Cause**: Cosmos DB access or configuration issue

**Solutions**:
1. Verify Cosmos DB RBAC:
   ```bash
   az role assignment list \
     --assignee <FUNCTION_APP_PRINCIPAL_ID> \
     --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RG>/providers/Microsoft.DocumentDB/databaseAccounts/<COSMOS_DB>
   ```

2. Check Function App configuration:
   ```bash
   az functionapp config appsettings list \
     --name <INSIGHTS_FUNCTION_APP_NAME> \
     --resource-group <RESOURCE_GROUP_NAME>
   ```

   Verify these settings exist:
   - `COSMOS_DB_ENDPOINT`
   - `COSMOS_DB_DATABASE`
   - `COSMOS_DB_CONTAINER`

### No Data Appearing

**Cause**: Webhooks not triggered or event type mismatch

**Solutions**:
1. Check webhook delivery status in GitHub:
   - Go to Settings → Webhooks → Click webhook → Recent Deliveries

2. Verify webhook is configured for `workflow_run` events

3. Trigger a test workflow run in a monitored repository

4. Check function logs:
   ```bash
   az functionapp log tail \
     --name <INSIGHTS_FUNCTION_APP_NAME> \
     --resource-group <RESOURCE_GROUP_NAME>
   ```

### Function App Not Responding

**Cause**: Cold start or configuration issue

**Solutions**:
1. Check function app status:
   ```bash
   az functionapp show \
     --name <INSIGHTS_FUNCTION_APP_NAME> \
     --resource-group <RESOURCE_GROUP_NAME> \
     --query state
   ```

2. Restart the function app:
   ```bash
   az functionapp restart \
     --name <INSIGHTS_FUNCTION_APP_NAME> \
     --resource-group <RESOURCE_GROUP_NAME>
   ```

3. Wait 10-15 seconds for cold start, then retry

## Security Best Practices

1. **Webhook Secret**: Use a strong random secret (minimum 32 characters)
2. **CORS Configuration**: Restrict to your specific domain if needed
3. **API Authentication**: Consider adding authentication to `get-insights-data` endpoint for production
4. **Data Retention**: Implement data cleanup policy for old events
5. **Monitoring**: Set up alerts for failed webhook deliveries
6. **Access Control**: Use Azure RBAC to control who can access Cosmos DB data

## Next Steps

Now that Insights is deployed:

1. **Build a Reporting Dashboard**: Query the data to create custom reports
2. **Set Up Alerts**: Configure alerts for workflow failures or performance issues
3. **Data Analysis**: Use the raw payload data for custom analytics
4. **Integration**: Integrate with your existing monitoring tools

## Related Documentation

- [Insights Function App README](function-app-insights/README.md) - Detailed API documentation
- [Infrastructure README](infrastructure/README.md) - Infrastructure details
- [Main Setup Guide](AZURE_SETUP.md) - Dashboard setup guide
- [Cosmos DB Documentation](https://docs.microsoft.com/en-us/azure/cosmos-db/)

## Support

For issues:
1. Check the [Troubleshooting](#troubleshooting) section above
2. Review function logs in Application Insights
3. Consult the [function-app-insights README](function-app-insights/README.md)
4. File an issue in the repository

## License

MIT
