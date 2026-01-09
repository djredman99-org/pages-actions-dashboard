# Dynamic Workflow and Dashboard Management API

This document describes how to use the Azure Functions API to dynamically manage workflows and dashboards in the GitHub Actions Dashboard.

> **Note**: The dashboard includes a built-in UI for managing both workflows and dashboards. You can use the dashboard selector, "Manage" button, "Add Workflow" button, and remove buttons directly in the dashboard interface. This API documentation is for programmatic access or integration with other tools.

## Overview

The dashboard supports runtime management through Azure Functions:

### Workflow Management
- `add-workflow`: Adds a new workflow to the active dashboard
- `remove-workflow`: Removes an existing workflow from the active dashboard
- `reorder-workflows`: Reorders workflows within the active dashboard

### Dashboard Management
- `get-workflow-statuses`: Gets workflows from the active dashboard along with all dashboard metadata
- `set-active-dashboard`: Switches the active dashboard
- `create-dashboard`: Creates a new dashboard
- `rename-dashboard`: Renames an existing dashboard
- `delete-dashboard`: Deletes a dashboard

These functions modify the `workflows.json` file stored in Azure Blob Storage, allowing you to manage dashboard workflows without manual file editing or redeployment.

## Usage Options

You can manage workflows and dashboards in multiple ways:
1. **Dashboard UI** (Easiest): Use the built-in dashboard selector, "Manage" button, "Add Workflow" button, "Edit Mode" button for reordering, and remove buttons
2. **API** (This document): Direct API calls for programmatic management
3. **Manual**: Upload `workflows.json` to Azure Storage

📖 **Multiple Dashboards Guide**: See [MULTIPLE_DASHBOARDS.md](MULTIPLE_DASHBOARDS.md) for detailed information about the multiple dashboards feature.

## Prerequisites

- Azure Function App deployed and running
- CORS configured to allow requests from your origin (if calling from browser)
- Access to the Function App URL

## API Endpoints

### Base URL

Your Function App URL will be in the format:
```
https://<function-app-name>.azurewebsites.net/api
```

Example:
```
https://ghactionsdash-func-dev.azurewebsites.net/api
```

## Adding a Workflow

### Endpoint

```
POST /api/add-workflow
```

### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "repo": "owner/repo",
  "workflow": "workflow-file.yml",
  "label": "Display Label"
}
```

**Field Descriptions:**
- `repo` (required): GitHub repository in `owner/repo` format (e.g., `microsoft/vscode`)
- `workflow` (required): Workflow filename with `.yml` or `.yaml` extension (e.g., `ci.yml`)
- `label` (required): Friendly name to display on the dashboard (e.g., `CI Build`)

### Response

**Success (201 Created):**
```json
{
  "success": true,
  "message": "Workflow added successfully",
  "dashboardId": "550e8400-e29b-41d4-a716-446655440000",
  "workflow": {
    "owner": "microsoft",
    "repo": "vscode",
    "workflow": "ci.yml",
    "label": "VS Code CI"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Validation error",
  "message": "repo must be in the format \"owner/repo\""
}
```

**Error (409 Conflict):**
```json
{
  "error": "Conflict",
  "message": "Workflow already exists in the dashboard"
}
```

### Examples

**Using curl:**
```bash
curl -X POST https://your-function-app.azurewebsites.net/api/add-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "facebook/react",
    "workflow": "runtime_build_and_test.yml",
    "label": "React CI"
  }'
```

**Using JavaScript (fetch):**
```javascript
const response = await fetch('https://your-function-app.azurewebsites.net/api/add-workflow', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    repo: 'facebook/react',
    workflow: 'runtime_build_and_test.yml',
    label: 'React CI'
  })
});

const result = await response.json();
console.log(result);
```

**Using PowerShell:**
```powershell
$body = @{
    repo = "facebook/react"
    workflow = "runtime_build_and_test.yml"
    label = "React CI"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://your-function-app.azurewebsites.net/api/add-workflow" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

## Removing a Workflow

### Endpoint

```
POST /api/remove-workflow
DELETE /api/remove-workflow
```

Both POST and DELETE methods are supported for flexibility.

### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "repo": "owner/repo",
  "workflow": "workflow-file.yml"
}
```

**Field Descriptions:**
- `repo` (required): GitHub repository in `owner/repo` format
- `workflow` (required): Workflow filename to remove

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "message": "Workflow removed successfully",
  "dashboardId": "550e8400-e29b-41d4-a716-446655440000",
  "workflow": {
    "owner": "microsoft",
    "repo": "vscode",
    "workflow": "ci.yml",
    "label": "VS Code CI"
  }
}
```

**Error (404 Not Found):**
```json
{
  "error": "Not found",
  "message": "Workflow not found in the dashboard"
}
```

### Examples

**Using curl:**
```bash
curl -X POST https://your-function-app.azurewebsites.net/api/remove-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "facebook/react",
    "workflow": "runtime_build_and_test.yml"
  }'
```

**Using JavaScript (fetch):**
```javascript
const response = await fetch('https://your-function-app.azurewebsites.net/api/remove-workflow', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    repo: 'facebook/react',
    workflow: 'runtime_build_and_test.yml'
  })
});

const result = await response.json();
console.log(result);
```

**Using DELETE method:**
```javascript
const response = await fetch('https://your-function-app.azurewebsites.net/api/remove-workflow', {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    repo: 'facebook/react',
    workflow: 'runtime_build_and_test.yml'
  })
});
```

## Reordering Workflows

### Endpoint

```
POST /api/reorder-workflows
```

### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "workflows": [
    {
      "owner": "owner",
      "repo": "repo",
      "workflow": "first-workflow.yml"
    },
    {
      "owner": "owner",
      "repo": "repo",
      "workflow": "second-workflow.yml"
    }
  ]
}
```

**Field Descriptions:**
- `workflows` (required): Array of workflow objects in the desired order
- Each workflow must include `owner`, `repo`, and `workflow` fields
- The array must contain all existing workflows in the active dashboard (no additions or removals)

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "message": "Reordered 5 workflows",
  "dashboardId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Invalid reorder",
  "message": "Workflow count mismatch. Reorder should include all existing workflows."
}
```

**Error (404 Not Found):**
```json
{
  "error": "Dashboard not found",
  "message": "No active dashboard found"
}
```

### Examples

**Using curl:**
```bash
curl -X POST https://your-function-app.azurewebsites.net/api/reorder-workflows \
  -H "Content-Type: application/json" \
  -d '{
    "workflows": [
      {"owner": "facebook", "repo": "react", "workflow": "runtime_build_and_test.yml"},
      {"owner": "facebook", "repo": "react", "workflow": "commit_artifacts.yml"}
    ]
  }'
```

**Using JavaScript (fetch):**
```javascript
const response = await fetch('https://your-function-app.azurewebsites.net/api/reorder-workflows', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    workflows: [
      { owner: 'facebook', repo: 'react', workflow: 'runtime_build_and_test.yml' },
      { owner: 'facebook', repo: 'react', workflow: 'commit_artifacts.yml' }
    ]
  })
});

const result = await response.json();
console.log(result);
```

**Using PowerShell:**
```powershell
$body = @{
    workflows = @(
        @{
            owner = "facebook"
            repo = "react"
            workflow = "runtime_build_and_test.yml"
        },
        @{
            owner = "facebook"
            repo = "react"
            workflow = "commit_artifacts.yml"
        }
    )
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "https://your-function-app.azurewebsites.net/api/reorder-workflows" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### Notes

- The reorder operation replaces the entire workflow order for the active dashboard
- All existing workflows must be included in the request
- The backend preserves all workflow properties (labels, etc.) and only updates the order
- Workflows are grouped by repository in the UI, so reordering typically happens within each repository group

## Dashboard GUID

The dashboard configuration includes a unique GUID (Globally Unique Identifier) that identifies the dashboard itself. This ID:

- Is automatically generated using `crypto.randomUUID()`
- Follows the standard UUID v4 format (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- Stored at the top level of the `workflows.json` file as `dashboardId`
- Prepares the system for future multi-dashboard support
- Is automatically added on first run if missing

### Configuration Format

The `workflows.json` file in Azure Storage uses this structure:

```json
{
  "dashboardId": "550e8400-e29b-41d4-a716-446655440000",
  "workflows": [
    {
      "owner": "microsoft",
      "repo": "vscode",
      "workflow": "ci.yml",
      "label": "VS Code CI"
    }
  ]
}
```

### Migration from Legacy Format

If you have an existing `workflows.json` file in the legacy array format:

```json
[
  {
    "owner": "microsoft",
    "repo": "vscode",
    "workflow": "ci.yml",
    "label": "VS Code CI"
  }
]
```

The system automatically migrates it to the new format with a `dashboardId` when any function runs:

1. Detects the legacy array format
2. Wraps it in an object with a new `dashboardId`
3. Saves the migrated configuration back to Azure Storage

This migration happens seamlessly without any manual intervention.

## Error Handling

### Common Errors

**Invalid JSON:**
```json
{
  "error": "Invalid request",
  "message": "Request body must be valid JSON"
}
```

**Missing Required Fields:**
```json
{
  "error": "Validation error",
  "message": "workflow field is required and must be a string"
}
```

**Invalid Workflow Extension:**
```json
{
  "error": "Validation error",
  "message": "workflow must be a .yml or .yaml file"
}
```

**Server Configuration Error:**
```json
{
  "error": "Server configuration error",
  "message": "Required environment variables are not set"
}
```

## Security Considerations

### CORS Configuration

The functions use `authLevel: 'anonymous'` for easy access from GitHub Pages. Security is provided by:
- CORS restrictions limiting allowed origins
- Azure Storage access controlled by Managed Identity
- No credentials exposed to clients

### Rate Limiting

For production environments, consider:
- Implementing Azure API Management for rate limiting
- Adding function key authentication (`authLevel: 'function'`)
- Restricting CORS to specific domains only

### Managed Identity

The functions use Azure Managed Identity to:
- Access Azure Storage without connection strings
- Ensure secure, credential-free access to resources
- Leverage Azure RBAC for permission management

## Integration Example

Here's a complete example of a workflow management UI:

```javascript
class WorkflowManager {
  constructor(functionAppUrl) {
    this.baseUrl = functionAppUrl;
  }

  async addWorkflow(repo, workflow, label) {
    try {
      const response = await fetch(`${this.baseUrl}/add-workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, workflow, label })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to add workflow:', error);
      throw error;
    }
  }

  async removeWorkflow(repo, workflow) {
    try {
      const response = await fetch(`${this.baseUrl}/remove-workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, workflow })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to remove workflow:', error);
      throw error;
    }
  }
}

// Usage
const manager = new WorkflowManager('https://your-function-app.azurewebsites.net/api');

// Add a workflow
await manager.addWorkflow('microsoft/vscode', 'ci.yml', 'VS Code CI');

// Remove a workflow
await manager.removeWorkflow('microsoft/vscode', 'ci.yml');
```

## Testing

### Manual Testing with curl

1. **Add a test workflow:**
```bash
curl -X POST https://your-function-app.azurewebsites.net/api/add-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "octocat/Hello-World",
    "workflow": "test.yml",
    "label": "Test Workflow"
  }'
```

2. **Verify it appears on the dashboard** by refreshing the page

3. **Remove the test workflow:**
```bash
curl -X POST https://your-function-app.azurewebsites.net/api/remove-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "octocat/Hello-World",
    "workflow": "test.yml"
  }'
```

4. **Verify it's removed** by refreshing the dashboard

### Automated Testing

Create a test script to validate the API:

```bash
#!/bin/bash

FUNCTION_URL="https://your-function-app.azurewebsites.net/api"
REPO="test-org/test-repo"
WORKFLOW="test.yml"
LABEL="Test Workflow"

echo "Adding workflow..."
ADD_RESULT=$(curl -s -X POST "$FUNCTION_URL/add-workflow" \
  -H "Content-Type: application/json" \
  -d "{\"repo\":\"$REPO\",\"workflow\":\"$WORKFLOW\",\"label\":\"$LABEL\"}")

echo "$ADD_RESULT" | jq .

echo "Removing workflow..."
REMOVE_RESULT=$(curl -s -X POST "$FUNCTION_URL/remove-workflow" \
  -H "Content-Type: application/json" \
  -d "{\"repo\":\"$REPO\",\"workflow\":\"$WORKFLOW\"}")

echo "$REMOVE_RESULT" | jq .
```

## Monitoring

### Application Insights

Monitor API usage in Azure Application Insights:

**Query to view add-workflow calls:**
```kusto
requests
| where operation_Name == "add-workflow"
| project timestamp, resultCode, duration, customDimensions
| order by timestamp desc
```

**Query to track errors:**
```kusto
requests
| where operation_Name in ("add-workflow", "remove-workflow")
| where resultCode >= 400
| project timestamp, operation_Name, resultCode, customDimensions
| order by timestamp desc
```

### Logs

View function logs:
```bash
az functionapp log tail \
  --name <FUNCTION_APP_NAME> \
  --resource-group <RESOURCE_GROUP_NAME>
```

## Troubleshooting

### "Server configuration error"

**Cause:** Missing environment variables in Function App
**Solution:** Verify these settings exist:
- `STORAGE_ACCOUNT_URL`
- `WORKFLOW_CONFIG_CONTAINER`

```bash
az functionapp config appsettings list \
  --name <FUNCTION_APP_NAME> \
  --resource-group <RESOURCE_GROUP_NAME>
```

### "Storage access failed"

**Cause:** Function App doesn't have permission to write to Storage
**Solution:** Verify the Managed Identity has "Storage Blob Data Contributor" role

```bash
az role assignment list \
  --assignee <FUNCTION_APP_PRINCIPAL_ID> \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RG>/providers/Microsoft.Storage/storageAccounts/<STORAGE_NAME>
```

### "Workflow already exists"

**Cause:** Attempting to add a duplicate workflow
**Solution:** Either:
1. Remove the existing workflow first, then re-add with updated label
2. Check if the workflow is already in the dashboard

### CORS Errors

**Cause:** Origin not allowed in CORS configuration
**Solution:** Add your origin to the Function App CORS settings

```bash
az functionapp cors add \
  --name <FUNCTION_APP_NAME> \
  --resource-group <RESOURCE_GROUP_NAME> \
  --allowed-origins "https://your-origin.github.io"
```

## Future Enhancements

Planned improvements:
1. **Bulk operations**: Add/remove multiple workflows in one request
2. **List workflows API**: GET endpoint to retrieve current configuration
3. **Update workflow**: Modify existing workflow properties (label, etc.)
4. **Validation**: Check if GitHub repository and workflow file exist
5. **Authentication**: Add user authentication for write operations
6. **Audit logging**: Track who added/removed workflows and when

## Dashboard Management Endpoints

The following endpoints allow you to manage multiple dashboards. For complete details on the multiple dashboards feature, see [MULTIPLE_DASHBOARDS.md](MULTIPLE_DASHBOARDS.md).

### Get Workflow Statuses (with Dashboard Metadata)

**Endpoint:** `GET /api/get-workflow-statuses`

Returns workflows from the active dashboard along with all dashboard metadata.

**Response:**
```json
{
  "dashboards": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Production Workflows"
    },
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "name": "Development Workflows"
    }
  ],
  "activeDashboardId": "550e8400-e29b-41d4-a716-446655440000",
  "workflows": [
    {
      "owner": "microsoft",
      "repo": "vscode",
      "workflow": "ci.yml",
      "label": "VS Code CI",
      "conclusion": "success",
      "status": "completed",
      "url": "https://github.com/microsoft/vscode/actions/runs/12345",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:35:00Z",
  "count": 1
}
```

### Set Active Dashboard

**Endpoint:** `POST /api/set-active-dashboard`

Switches the active dashboard. After calling this, subsequent calls to get workflow statuses will return workflows from the newly active dashboard.

**Request:**
```json
{
  "dashboardId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Active dashboard updated successfully",
  "activeDashboardId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "dashboardName": "Development Workflows"
}
```

**Error Responses:**
- `404 Not Found`: Dashboard with the specified ID does not exist

### Create Dashboard

**Endpoint:** `POST /api/create-dashboard`

Creates a new dashboard.

**Request:**
```json
{
  "name": "Staging Workflows",
  "setAsActive": false
}
```

**Field Descriptions:**
- `name` (required): Name for the new dashboard
- `setAsActive` (optional): Whether to set this as the active dashboard (default: false)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Dashboard created successfully",
  "dashboard": {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "name": "Staging Workflows"
  },
  "isActive": false
}
```

**Error Responses:**
- `409 Conflict`: A dashboard with this name already exists

### Rename Dashboard

**Endpoint:** `POST /api/rename-dashboard`

Renames an existing dashboard.

**Request:**
```json
{
  "dashboardId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Production (Updated)"
}
```

**Field Descriptions:**
- `dashboardId` (required): ID of the dashboard to rename
- `name` (required): New name for the dashboard

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Dashboard renamed successfully",
  "dashboard": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Production (Updated)"
  }
}
```

**Error Responses:**
- `404 Not Found`: Dashboard with the specified ID does not exist
- `409 Conflict`: A dashboard with the new name already exists

### Delete Dashboard

**Endpoint:** `POST /api/delete-dashboard`

Deletes a dashboard. Cannot delete the last dashboard.

**Request:**
```json
{
  "dashboardId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Dashboard deleted successfully",
  "deletedDashboard": {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "name": "Development Workflows"
  },
  "newActiveDashboardId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses:**
- `404 Not Found`: Dashboard with the specified ID does not exist
- `400 Bad Request`: Cannot delete the last dashboard

**Note:** If the deleted dashboard was the active dashboard, the first remaining dashboard will automatically become active.

## Related Documentation

- [Multiple Dashboards Guide](./MULTIPLE_DASHBOARDS.md) - Complete guide to using multiple dashboards
- [Function App README](./README.md) - Function development and deployment
- [Infrastructure README](../infrastructure/README.md) - Infrastructure setup
- [Azure Implementation](../AZURE_IMPLEMENTATION.md) - Architecture overview

## Support

For issues or questions:
1. Check Application Insights logs for errors
2. Review Azure Function logs
3. Verify environment configuration
4. Check GitHub repository issue tracker
