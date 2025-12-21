# Azure Function Backend Implementation Summary

This document provides a comprehensive overview of the Azure Function backend implementation for the GitHub Actions Dashboard.

## Overview

The dashboard has been enhanced with a secure Azure Function backend that moves API authentication and workflow management from the client-side to a secure serverless environment. This eliminates the need to expose GitHub credentials in the browser and provides centralized workflow configuration management.

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              GitHub Pages Dashboard                       │  │
│  │  (pages/index.html, api.js, dashboard.js)               │  │
│  └──────────────────────┬───────────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────────┘
                          │ HTTPS Request
                          │ GET /api/get-workflow-statuses
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Azure Function App                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           get-workflow-statuses Function                  │  │
│  │  • Retrieves GitHub App credentials from Key Vault       │  │
│  │  • Retrieves workflow config from Storage                │  │
│  │  • Authenticates with GitHub as App                      │  │
│  │  • Fetches workflow statuses                             │  │
│  │  • Returns JSON response                                 │  │
│  └────┬─────────────────┬──────────────────┬─────────────────┘  │
│       │                 │                  │                     │
└───────┼─────────────────┼──────────────────┼─────────────────────┘
        │                 │                  │
        │ Managed         │ Managed          │ GitHub API
        │ Identity        │ Identity         │ (with App auth)
        ▼                 ▼                  ▼
┌───────────────┐  ┌──────────────┐  ┌──────────────────┐
│  Azure Key    │  │   Azure      │  │   GitHub API     │
│    Vault      │  │   Storage    │  │   (Actions)      │
│               │  │              │  │                  │
│ • App ID      │  │ • workflows  │  │ • Workflow runs  │
│ • Private Key │  │   .json      │  │ • Status data    │
└───────────────┘  └──────────────┘  └──────────────────┘
```

### Components

#### 1. Azure Resources

**Function App**
- **Type**: Consumption Plan (serverless)
- **Runtime**: Node.js 18
- **Authentication**: System-assigned Managed Identity
- **Monitoring**: Application Insights

**Key Vault**
- **Purpose**: Store GitHub App credentials securely
- **Secrets**:
  - `github-app-id`: GitHub App ID (numeric)
  - `github-app-private-key`: GitHub App private key (PEM format)
- **Access**: Restricted to Function App via RBAC

**Storage Account**
- **Type**: Standard LRS
- **Container**: `workflow-configs`
- **Blob**: `workflows.json` (workflow configurations)
- **Access**: Restricted to Function App via RBAC

**Application Insights**
- **Purpose**: Function monitoring and logging
- **Features**: Request tracking, error logging, performance metrics

#### 2. Function App Code

**Main Function**: `get-workflow-statuses.js`
- HTTP-triggered (GET/POST)
- Anonymous auth level (can be restricted with function keys)
- Returns JSON array of workflows with statuses

**Helper Modules**:
- `github-auth.js`: GitHub App authentication using Octokit
- `keyvault-client.js`: Key Vault client using DefaultAzureCredential
- `storage-client.js`: Blob Storage client using DefaultAzureCredential

#### 3. Frontend Updates

**config.js**
- Changed from GitHub token to Azure Function URL
- Placeholder: `__AZURE_FUNCTION_URL__` (injected at build time)

**api.js**
- Replaced direct GitHub API calls with Azure Function calls
- Implements client-side caching (60-second TTL)
- Simplified API surface (single endpoint for all workflows)

**dashboard.js**
- Updated to consume new API format
- Workflows now come from Azure Storage (via Function)
- Improved error handling for backend failures

## Security Features

### 1. Credential Protection

**Problem Solved**: In the legacy architecture, the GitHub token was embedded in JavaScript and visible in browser source.

**Solution**:
- GitHub App credentials stored in Azure Key Vault
- Function App accesses Key Vault using Managed Identity
- No credentials in code, configuration, or environment variables
- Credentials never transmitted to client

### 2. Managed Identity

**What it is**: Azure's way of providing identities to resources without managing credentials.

**How it's used**:
- Function App has a system-assigned identity
- Identity granted RBAC roles:
  - "Key Vault Secrets User" for Key Vault
  - "Storage Blob Data Contributor" for Storage
- No connection strings or keys needed in function code

### 3. RBAC-Based Access Control

**Key Vault Access**:
```
Function App (Managed Identity)
└─ Role: Key Vault Secrets User
   └─ Permissions: Read secrets only (not list, delete, or modify)
```

**Storage Access**:
```
Function App (Managed Identity)
└─ Role: Storage Blob Data Contributor
   └─ Permissions: Read/write blobs (full container access)
```

### 4. GitHub App Authentication

**Advantages over Personal Access Tokens**:
- ✅ Installation-scoped (can't access repos not installed to)
- ✅ Higher rate limits (15,000 vs 5,000 requests/hour)
- ✅ Organization-controlled (admins can revoke app)
- ✅ Audit logs (track app activity)
- ✅ No user account required

**Authentication Flow**:
1. Function retrieves App ID and private key from Key Vault
2. Creates JWT signed with private key
3. Exchanges JWT for installation token
4. Uses installation token for GitHub API calls

## Data Flow

### Request Flow

1. **User loads dashboard** → Browser requests page from GitHub Pages
2. **Page loads** → JavaScript fetches `/api/get-workflow-statuses` from Azure Function
3. **Function receives request** → Validates request, logs to Application Insights
4. **Retrieve credentials** → Function uses Managed Identity to get secrets from Key Vault
5. **Retrieve config** → Function uses Managed Identity to get `workflows.json` from Storage
6. **Authenticate with GitHub** → Function creates GitHub App client with credentials
7. **Fetch statuses** → Function queries GitHub API for each workflow (in parallel)
8. **Return response** → Function returns JSON array with all workflow statuses
9. **Render dashboard** → JavaScript creates workflow cards with status badges

### Caching Strategy

**Client-side (Browser)**:
- 60-second cache in memory
- Reduces function invocations for rapid page refreshes
- Configurable via `api.js` (`cacheTTL` property)

**Server-side (Function)**:
- No caching (stateless design)
- Each request fetches fresh data from GitHub
- Could add Azure Cache for Redis for future optimization

## Workflow Configuration Management

### Storage Format

**Location**: Azure Blob Storage → `workflow-configs` container → `workflows.json`

**Format**:
```json
[
  {
    "owner": "organization-name",
    "repo": "repository-name",
    "workflow": "workflow-file.yml",
    "label": "Display Label"
  }
]
```

### Updating Workflows

**Option 1: Azure CLI**
```bash
az storage blob upload \
  --account-name <STORAGE_ACCOUNT> \
  --container-name workflow-configs \
  --name workflows.json \
  --file workflows.json \
  --auth-mode login \
  --overwrite
```

**Option 2: Azure Portal**
1. Navigate to Storage Account → Containers → workflow-configs
2. Upload new `workflows.json` file
3. Confirm overwrite

**Option 3: Azure Storage Explorer**
1. Connect to Storage Account
2. Navigate to `workflow-configs` container
3. Upload/edit `workflows.json`

**Changes take effect immediately** (no redeployment needed).

## Deployment Process

### Infrastructure Deployment

**Method**: Bicep (Infrastructure as Code)

**Command**:
```bash
cd infrastructure
./deploy.sh
```

**What it does**:
1. Creates resource group (if doesn't exist)
2. Deploys Bicep template
3. Creates all Azure resources
4. Configures RBAC permissions
5. Stores GitHub App credentials in Key Vault
6. Outputs deployment details

**Idempotent**: Safe to run multiple times, only updates changed resources.

### Function Code Deployment

**Method**: Azure Functions Core Tools

**Command**:
```bash
cd function-app
npm install
func azure functionapp publish <FUNCTION_APP_NAME>
```

**What it does**:
1. Packages function code
2. Uploads to Function App
3. Installs npm dependencies on Azure
4. Restarts function app
5. Validates deployment

### Pages Site Deployment

**Method**: GitHub Actions workflow

**Trigger**: Push to main branch

**Steps**:
1. Checkout code
2. Inject `AZURE_FUNCTION_URL` from repository secret
3. Upload pages artifact
4. Deploy to GitHub Pages

**Secret Required**: `AZURE_FUNCTION_URL` (Function App URL from infrastructure deployment)

📖 **Setup Guide**: See [PAGES_SETUP.md](PAGES_SETUP.md) for complete Pages configuration instructions, including authentication benefits and source selection.

## Monitoring and Observability

### Application Insights

**Automatic Tracking**:
- HTTP requests (with duration and status code)
- Dependencies (Key Vault, Storage, GitHub API calls)
- Exceptions and errors
- Custom logging from function code

**Useful Queries**:

**Request volume**:
```kusto
requests
| where operation_Name == "get-workflow-statuses"
| summarize count() by bin(timestamp, 5m)
| render timechart
```

**Error rate**:
```kusto
requests
| where operation_Name == "get-workflow-statuses"
| summarize total=count(), errors=countif(resultCode >= 400) by bin(timestamp, 5m)
| extend errorRate = errors * 100.0 / total
| render timechart
```

**Performance**:
```kusto
requests
| where operation_Name == "get-workflow-statuses"
| summarize avg(duration), percentile(duration, 95) by bin(timestamp, 5m)
| render timechart
```

### Live Monitoring

**Azure Portal**:
- Function App → Monitor → Live Metrics
- Real-time requests, dependencies, and failures

**CLI**:
```bash
az functionapp log tail \
  --name <FUNCTION_APP_NAME> \
  --resource-group <RESOURCE_GROUP_NAME>
```

## Cost Analysis

### Estimated Monthly Costs (US East region)

| Resource | Tier | Usage | Est. Cost |
|----------|------|-------|-----------|
| Function App | Consumption | 10K executions, 1GB-s | $1-2 |
| Storage Account | Standard LRS | 1GB data, minimal ops | <$1 |
| Key Vault | Standard | 2 secrets, 10K ops | $1 |
| Application Insights | Pay-as-you-go | 100MB logs | $0-1 |
| **Total** | | | **$3-5/month** |

**Cost Optimization Tips**:
- Use client-side caching to reduce function invocations
- Consider Premium plan for high-traffic scenarios (eliminates cold starts)
- Set up cost alerts in Azure Cost Management

## Performance Characteristics

### Latency

**First request (cold start)**:
- Function startup: 2-5 seconds
- GitHub API calls: 1-3 seconds per workflow
- **Total**: 3-8 seconds

**Subsequent requests (warm)**:
- Function execution: <100ms
- GitHub API calls: 1-3 seconds per workflow
- **Total**: 1-3 seconds

### Scalability

**Function App (Consumption Plan)**:
- Auto-scales based on demand
- Up to 200 instances
- Maximum 10 minutes execution time

**Bottlenecks**:
- GitHub API rate limits (5,000 req/hr per installation)
- Number of workflows (sequential per installation)

**Optimization**:
- Parallel processing by installation
- Could add Redis cache for frequently accessed data

## Error Handling

### Function-Level Errors

**Scenarios**:
1. Key Vault access denied
2. Storage blob not found
3. GitHub App authentication failed
4. GitHub API errors

**Handling**:
- Graceful error responses with status codes
- Detailed error messages in Application Insights
- User-friendly error messages to client

### Client-Level Errors

**Scenarios**:
1. Function URL not configured
2. Network timeout
3. Invalid JSON response

**Handling**:
- Error messages displayed on dashboard
- Browser console logging for debugging
- Fallback to error status badges

## Testing Strategy

### Unit Testing (Not Yet Implemented)

**Recommended**:
- Test GitHub auth module with mocked Octokit
- Test Key Vault client with mocked SecretClient
- Test Storage client with mocked BlobServiceClient
- Test function handler with mocked dependencies

### Integration Testing

**Manual Testing**:
1. Deploy to test environment
2. Call function endpoint directly
3. Verify JSON response structure
4. Check Application Insights logs

**Automated Testing**:
- Could add GitHub Actions workflow to test function after deployment

### End-to-End Testing

**Manual Process**:
1. Deploy infrastructure
2. Deploy function code
3. Upload workflow config
4. Deploy pages site
5. Load dashboard in browser
6. Verify workflow statuses

## Troubleshooting Guide

### Common Issues

**Dashboard shows "Configuration Required"**
- Cause: `AZURE_FUNCTION_URL` not set or not injected
- Fix: Verify repository secret exists and deployment succeeded

**Function returns 500 error**
- Cause: Missing environment variables or permissions
- Fix: Check Application Insights logs, verify RBAC assignments

**"No workflows configured" message**
- Cause: `workflows.json` not uploaded to storage
- Fix: Upload workflow configuration file

**Workflows show "error" status**
- Cause: GitHub App not installed or lacks permissions
- Fix: Verify app installation and permissions

**Slow response times**
- Cause: Cold start or many workflows
- Fix: Consider Premium plan or reduce workflow count

## Future Enhancements

### Potential Improvements

1. **Caching Layer**
   - Add Azure Cache for Redis
   - Cache workflow statuses for 1-5 minutes
   - Reduce GitHub API calls

2. **Webhooks**
   - Receive GitHub workflow completion webhooks
   - Invalidate cache when workflows complete
   - Real-time updates without polling

3. **Authentication**
   - Add function key authentication
   - Restrict access to known origins
   - Add rate limiting

4. **UI for Workflow Management**
   - Add web interface for editing workflows
   - No need to use Azure CLI/Portal
   - Update Storage directly from browser

5. **Multi-tenancy**
   - Support multiple GitHub organizations
   - Separate workflow configs per tenant
   - Per-tenant authentication

6. **Analytics**
   - Track workflow success rates
   - Monitor failure patterns
   - Historical trends

## Conclusion

The Azure Function backend provides a production-ready, secure, and scalable solution for the GitHub Actions Dashboard. It eliminates credential exposure, centralizes configuration management, and provides enterprise-grade monitoring and security features.

### Key Achievements

✅ **Security**: GitHub credentials never exposed to browser  
✅ **Scalability**: Serverless auto-scaling based on demand  
✅ **Maintainability**: Centralized workflow configuration  
✅ **Observability**: Full monitoring with Application Insights  
✅ **Cost-Effective**: ~$5/month for typical usage  
✅ **Reliability**: Managed infrastructure with SLA guarantees

### Documentation

- [AZURE_SETUP.md](AZURE_SETUP.md) - Complete setup guide
- [function-app/README.md](function-app/README.md) - Function development guide
- [infrastructure/README.md](infrastructure/README.md) - Infrastructure details
- [README.md](README.md) - Main project documentation

### Support

For questions, issues, or contributions, please refer to the repository's issue tracker and documentation.
