# Multiple Dashboards Feature

## Overview

The GitHub Actions Dashboard now supports multiple dashboards, allowing you to organize workflows into separate views. Each dashboard has its own name and set of workflows, and you can easily switch between them.

## Key Features

- **Multiple Dashboards**: Create and manage multiple dashboards with different names
- **Dashboard Switcher**: Dropdown selector to quickly switch between dashboards
- **Active Dashboard**: Only one dashboard is active at a time, and only its workflows are loaded
- **Dashboard Management**: Create, rename, and delete dashboards through the UI
- **Automatic Migration**: Existing single-dashboard configurations are automatically migrated to the new format

## Data Structure

### New Format (v2)

The `workflows.json` file now uses a multi-dashboard structure:

```json
{
  "dashboards": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Production Workflows",
      "workflows": [
        {
          "owner": "myorg",
          "repo": "myrepo",
          "workflow": "deploy-prod.yml",
          "label": "Production Deploy"
        }
      ]
    },
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "name": "Development Workflows",
      "workflows": [
        {
          "owner": "myorg",
          "repo": "myrepo",
          "workflow": "ci.yml",
          "label": "CI Build"
        }
      ]
    }
  ],
  "activeDashboardId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Old Format (v1) - Still Supported

The old single-dashboard format is automatically migrated:

```json
{
  "dashboardId": "550e8400-e29b-41d4-a716-446655440000",
  "workflows": [
    {
      "owner": "myorg",
      "repo": "myrepo",
      "workflow": "ci.yml",
      "label": "CI Build"
    }
  ]
}
```

Or even simpler (raw array):

```json
[
  {
    "owner": "myorg",
    "repo": "myrepo",
    "workflow": "ci.yml",
    "label": "CI Build"
  }
]
```

Both old formats will be automatically converted to the new format with a default dashboard named "Main Dashboard".

## Using the Dashboard UI

### Switching Dashboards

1. Look for the dashboard selector at the top of the page (below the title)
2. Click the dropdown to see all available dashboards
3. Select a dashboard to switch to it
4. The page will clear and reload with the workflows from the selected dashboard

**Note**: When switching dashboards, the previous dashboard's workflows are cleared from view, and only the new dashboard's workflows are loaded.

### Managing Dashboards

Click the **"Manage"** button next to the dashboard selector to open the Dashboard Management modal.

#### Creating a Dashboard

1. In the Dashboard Management modal, enter a name in the "Create New Dashboard" field
2. Click the **"Create"** button
3. The new dashboard will appear in the list (but won't be set as active)
4. Close the modal and use the dropdown to switch to the new dashboard

#### Renaming a Dashboard

1. Open the Dashboard Management modal
2. Find the dashboard you want to rename
3. Click the **edit** (pencil) icon next to the dashboard name
4. Enter the new name in the prompt
5. The dashboard will be renamed immediately

#### Deleting a Dashboard

1. Open the Dashboard Management modal
2. Find the dashboard you want to delete
3. Click the **delete** (trash) icon next to the dashboard name
4. Confirm the deletion
5. If this was the active dashboard, the first remaining dashboard will become active

**Note**: You cannot delete the last dashboard. At least one dashboard must exist.

### Reordering Workflows

The dashboard includes an Edit Mode feature that allows you to reorder workflows within each repository using drag-and-drop.

#### Entering Edit Mode

1. Click the **"Edit Mode"** button in the dashboard header
2. The dashboard will enter edit mode with a banner displayed at the top
3. All workflow cards become draggable

#### Reordering Workflows

1. In edit mode, click and hold a workflow card
2. Drag the card to the desired position **within the same repository group**
3. Release to drop the card in the new position
4. The new order is shown visually but not yet saved

**Important**: Workflows can only be reordered within their own repository. Cross-repository dragging is prevented to maintain logical grouping.

#### Saving or Canceling Changes

- **Save**: Click the **"Save"** button to persist the new order to Azure Storage
- **Cancel**: Click the **"Cancel"** button to discard changes and restore the original order

Once saved, the new workflow order will be preserved across browser sessions and devices.

## API Endpoints

### Get Workflow Statuses

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
      "owner": "myorg",
      "repo": "myrepo",
      "workflow": "deploy-prod.yml",
      "label": "Production Deploy",
      "conclusion": "success",
      "status": "completed",
      "url": "https://github.com/myorg/myrepo/actions/runs/12345",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:35:00Z",
  "count": 1
}
```

### Set Active Dashboard

**Endpoint:** `POST /api/set-active-dashboard`

Switches the active dashboard.

**Request:**
```json
{
  "dashboardId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Active dashboard updated successfully",
  "activeDashboardId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "dashboardName": "Development Workflows"
}
```

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

**Response:**
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

**Response:**
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

### Delete Dashboard

**Endpoint:** `POST /api/delete-dashboard`

Deletes a dashboard. Cannot delete the last dashboard.

**Request:**
```json
{
  "dashboardId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

**Response:**
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

### Add Workflow

**Endpoint:** `POST /api/add-workflow`

Adds a workflow to the **active dashboard**.

**Request:**
```json
{
  "repo": "myorg/myrepo",
  "workflow": "ci.yml",
  "label": "CI Build"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Workflow added successfully",
  "dashboardId": "550e8400-e29b-41d4-a716-446655440000",
  "dashboardName": "Production Workflows",
  "workflow": {
    "owner": "myorg",
    "repo": "myrepo",
    "workflow": "ci.yml",
    "label": "CI Build"
  }
}
```

### Remove Workflow

**Endpoint:** `POST /api/remove-workflow`

Removes a workflow from the **active dashboard**.

**Request:**
```json
{
  "repo": "myorg/myrepo",
  "workflow": "ci.yml"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Workflow removed successfully",
  "dashboardId": "550e8400-e29b-41d4-a716-446655440000",
  "dashboardName": "Production Workflows",
  "workflow": {
    "owner": "myorg",
    "repo": "myrepo",
    "workflow": "ci.yml",
    "label": "CI Build"
  }
}
```

### Reorder Workflows

**Endpoint:** `POST /api/reorder-workflows`

Reorders workflows within the **active dashboard**.

**Request:**
```json
{
  "workflows": [
    {
      "owner": "myorg",
      "repo": "myrepo",
      "workflow": "deploy.yml"
    },
    {
      "owner": "myorg",
      "repo": "myrepo",
      "workflow": "ci.yml"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reordered 2 workflows",
  "dashboardId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Note**: The workflows array must contain all existing workflows in the active dashboard in the desired order. The backend validates that all workflows are present and updates their order accordingly.

## Migration Process

When the backend functions load the `workflows.json` file, they automatically detect the format and migrate if needed:

1. **Raw array format** → Converted to single dashboard with generated ID
2. **Old single-dashboard format** → Converted to multi-dashboard format, preserving the original dashboard ID
3. **New multi-dashboard format** → Used as-is (no migration needed)
4. **Missing file or invalid format** → Creates default configuration with one empty "Main Dashboard"

The migration is performed in-memory during read operations and saved back to storage when needed. Your original file is preserved until the first write operation.

## Performance Considerations

### Why Single File Storage?

We chose a single combined file approach for storing multiple dashboards because:

1. **Faster Initial Load**: Single file fetch gets all dashboard metadata at once
2. **Atomic Updates**: Ensures consistency when switching dashboards or making changes
3. **Simpler Backend**: No need to manage multiple blob files or complex storage structures
4. **Lower Cost**: Fewer storage transactions reduce Azure costs
5. **Easier Migration**: Existing structure already had a dashboard concept

### Performance Characteristics

- **Dashboard Switch**: Clears current view and loads new dashboard workflows (fast, no backend call for dashboard list)
- **Workflow Status Fetch**: Only fetches statuses for workflows in the active dashboard
- **Dashboard List**: Loaded once on page load and cached in memory
- **Auto-refresh**: Continues to work as before, refreshing only the active dashboard's workflows

## Best Practices

1. **Organize by Environment**: Create separate dashboards for Production, Staging, and Development
2. **Organize by Team**: Create dashboards for different teams or projects
3. **Organize by Type**: Create dashboards for CI/CD, Tests, Deployments, etc.
4. **Use Clear Names**: Give dashboards descriptive names that make their purpose obvious
5. **Keep Dashboards Focused**: Don't overload a single dashboard with too many workflows
6. **Regular Cleanup**: Delete unused dashboards to keep the list manageable

## Troubleshooting

### Dashboard selector not showing

- Check that the Azure Function is deployed and accessible
- Verify that `workflows.json` exists in Azure Storage
- Check browser console for errors
- Ensure the Function App URL is configured correctly

### Cannot switch dashboards

- Verify you have network connectivity to the Azure Function
- Check that the dashboard ID exists in the `workflows.json` file
- Look for CORS errors in the browser console

### Workflows not loading after switch

- Ensure the selected dashboard has workflows configured
- Check that the workflows exist in the GitHub repositories
- Verify the GitHub App is installed on the repositories
- Check Azure Function logs for errors

### Migration not working

- Check Azure Function logs for migration messages
- Verify the `workflows.json` file format is valid JSON
- Ensure the Azure Function has write permissions to the storage container

## Example Use Cases

### Multiple Environments

```json
{
  "dashboards": [
    {
      "id": "...",
      "name": "Production",
      "workflows": [ /* production workflows */ ]
    },
    {
      "id": "...",
      "name": "Staging",
      "workflows": [ /* staging workflows */ ]
    },
    {
      "id": "...",
      "name": "Development",
      "workflows": [ /* dev workflows */ ]
    }
  ],
  "activeDashboardId": "..."
}
```

### Multiple Teams

```json
{
  "dashboards": [
    {
      "id": "...",
      "name": "Frontend Team",
      "workflows": [ /* frontend workflows */ ]
    },
    {
      "id": "...",
      "name": "Backend Team",
      "workflows": [ /* backend workflows */ ]
    },
    {
      "id": "...",
      "name": "Infrastructure Team",
      "workflows": [ /* infrastructure workflows */ ]
    }
  ],
  "activeDashboardId": "..."
}
```

### Workflow Types

```json
{
  "dashboards": [
    {
      "id": "...",
      "name": "CI/CD Pipelines",
      "workflows": [ /* CI/CD workflows */ ]
    },
    {
      "id": "...",
      "name": "Test Suites",
      "workflows": [ /* test workflows */ ]
    },
    {
      "id": "...",
      "name": "Security Scans",
      "workflows": [ /* security workflows */ ]
    }
  ],
  "activeDashboardId": "..."
}
```
