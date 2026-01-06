# Multiple Dashboards - UI Screenshots

This document shows the new UI elements added for the multiple dashboards feature.

## Dashboard Selector

The dashboard selector appears at the top of the page, allowing users to quickly switch between different dashboards. The dropdown shows all available dashboard names, and the "Manage" button opens the dashboard management modal.

![Dashboard Selector](https://github.com/user-attachments/assets/7fc4c103-e9c7-4a36-a496-fed934c8ee28)

**Features shown:**
- **Dashboard dropdown**: Select from available dashboards (Production, Staging, Development)
- **Manage button**: Opens the dashboard management modal
- **Refresh status**: Shows last update time
- **Add Workflow button**: Add workflows to the current active dashboard
- **Workflow cards**: Display workflow statuses for the active dashboard

## Manage Dashboards Modal

The Manage Dashboards modal provides a complete interface for creating, renaming, and deleting dashboards. The active dashboard is highlighted with a purple badge.

![Manage Dashboards Modal](https://github.com/user-attachments/assets/b0af15b2-7087-4d58-9612-f36e9680fe8b)

**Features shown:**
- **Create New Dashboard**: Input field and button to create a new dashboard
- **Dashboard list**: Shows all existing dashboards
- **Active badge**: Indicates which dashboard is currently active (Production Workflows)
- **Rename action**: Pencil icon to rename each dashboard
- **Delete action**: Trash icon to delete dashboards (cannot delete the last one)
- **Visual feedback**: Active dashboard has a purple highlight background

## User Experience

### Switching Dashboards
1. Click the dropdown in the dashboard selector
2. Select a different dashboard
3. The screen clears and reloads with workflows from the selected dashboard
4. No backend call is needed - dashboard names are already loaded

### Managing Dashboards
1. Click the "Manage" button
2. The modal opens showing all dashboards
3. Create new dashboards by entering a name and clicking "Create"
4. Rename dashboards by clicking the pencil icon
5. Delete dashboards by clicking the trash icon (except the last one)

### Key Benefits
- **Fast switching**: Dashboard names are preloaded, so switching is instant
- **Clear organization**: Separate dashboards for different environments, teams, or workflow types
- **Intuitive UI**: Visual indicators show the active dashboard
- **Easy management**: All dashboard operations in one modal

## Storage Format

Dashboards are stored in a single `workflows.json` file in Azure Storage:

```json
{
  "dashboards": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Production Workflows",
      "workflows": [...]
    },
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "name": "Staging Workflows",
      "workflows": [...]
    }
  ],
  "activeDashboardId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Automatic Migration

Existing configurations automatically migrate to the new format:
- Old single-dashboard configurations preserve their dashboard ID
- Raw array configurations get wrapped in a "Main Dashboard"
- No manual intervention required
