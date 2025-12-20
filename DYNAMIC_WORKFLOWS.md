# Dynamic Workflow Management Architecture (DEPRECATED)

**NOTE** The content in this document is no longer relevant at this time.  We are preserving it for guidance on a new implementation of this coming soon.

## Overview

The dashboard now supports dynamic workflow management, allowing workflows to be added and removed at runtime without editing the `config.js` file and redeploying. This document explains the architecture and how to use it.

## Architecture

### Components

1. **WorkflowManager** (`pages/workflow-manager.js`)
   - Manages workflow configurations from multiple sources
   - Merges workflows from `config.js` (permanent) with local storage (user-added)
   - Provides APIs to add, remove, and list workflows
   - Handles local storage persistence

2. **DashboardLoader** (`pages/dashboard.js`)
   - Updated to use WorkflowManager instead of directly accessing config
   - Renders workflows from all sources (config + custom)
   - Exposed globally as `dashboardInstance` for console access

3. **Local Storage**
   - Key: `dashboard_custom_workflows`
   - Stores user-added workflows in JSON format
   - Persists across page reloads (within same browser/domain)

### Workflow Sources

Each workflow has a `source` property:
- **`config`**: Workflows defined in `config.js` (permanent, cannot be removed)
- **`user`**: Workflows added by the user (stored in local storage, can be removed)

## Usage

### Console API

Since UI controls are not yet implemented, you can manage workflows via the browser console:

#### View Current Workflows

```javascript
// Get all workflows
dashboardInstance.workflowManager.getAllWorkflows();

// Get count of custom workflows
dashboardInstance.workflowManager.getCustomWorkflowCount();
```

#### Add a Workflow

```javascript
// Add a new workflow
dashboardInstance.workflowManager.addWorkflow({
  owner: 'microsoft',          // GitHub org or user
  repo: 'vscode',              // Repository name
  workflow: 'ci.yml',          // Workflow file name
  label: 'VS Code CI'          // Display label
});

// Refresh the dashboard to show the new workflow
await dashboardInstance.loadWorkflows();
```

#### Remove a Workflow

```javascript
// Remove by properties (recommended)
dashboardInstance.workflowManager.removeWorkflowByProps(
  'microsoft',  // owner
  'vscode',     // repo
  'ci.yml'      // workflow file
);

// Or remove by index (use with caution)
// Note: Only user-added workflows can be removed
dashboardInstance.workflowManager.removeWorkflow(index);

// Refresh the dashboard
await dashboardInstance.loadWorkflows();
```

#### Clear All Custom Workflows

```javascript
// Remove all user-added workflows
dashboardInstance.workflowManager.clearCustomWorkflows();

// Refresh the dashboard
await dashboardInstance.loadWorkflows();
```

### Example Workflow

```javascript
// 1. Check current state
console.log('Current workflows:', dashboardInstance.workflowManager.getAllWorkflows().length);

// 2. Add a custom workflow
dashboardInstance.workflowManager.addWorkflow({
  owner: 'facebook',
  repo: 'react',
  workflow: 'runtime_build_and_test.yml',
  label: 'React CI'
});

// 3. Refresh to display
await dashboardInstance.loadWorkflows();

// 4. Later, remove it
dashboardInstance.workflowManager.removeWorkflowByProps('facebook', 'react', 'runtime_build_and_test.yml');
await dashboardInstance.loadWorkflows();
```

## Error Handling

### Validation Errors

The WorkflowManager validates all operations:

```javascript
// Missing required fields
dashboardInstance.workflowManager.addWorkflow({
  owner: 'test'
  // Missing repo, workflow, label
});
// Error: Invalid workflow: missing required fields

// Duplicate workflow
dashboardInstance.workflowManager.addWorkflow({
  owner: 'djredman99-org',
  repo: 'pages-actions-dashboard',
  workflow: 'ci-build.yml',
  label: 'Duplicate CI'
});
// Error: Workflow already exists in the dashboard

// Attempting to remove config workflow
dashboardInstance.workflowManager.removeWorkflow(0);
// Error: Cannot remove workflows from config.js
```

## Local Storage Persistence

### Storage Format

Custom workflows are stored in local storage as JSON:

```json
[
  {
    "owner": "microsoft",
    "repo": "vscode",
    "workflow": "ci.yml",
    "label": "VS Code CI",
    "source": "user",
    "addedAt": "2025-12-11T19:30:00.000Z"
  }
]
```

### Storage Key

- Key: `dashboard_custom_workflows`
- Scope: Per-domain (different browsers or private/incognito windows have separate storage)

### Storage Limitations

⚠️ **Important Considerations:**

1. **Browser-Specific**: Custom workflows are stored in your browser's local storage
   - Different browsers have separate storage
   - Private/incognito mode has temporary storage
   - Clearing browser data removes custom workflows

2. **Not Permanent**: For permanent workflows, add them to `config.js`

3. **No Synchronization**: Custom workflows don't sync across devices or browsers

4. **Future Enhancement**: Long-term solution will use Azure Storage or similar (see issue #7)

## Future Enhancements

### Planned for Future Issues

1. **UI Controls** (Separate Issue)
   - Add workflow button with modal form
   - Remove buttons on user-added workflow cards
   - Visual distinction between config and custom workflows

2. **Azure Storage Integration** (Issue #7)
   - Replace local storage with Azure Storage
   - Enable cross-device synchronization
   - Server-side persistence
   - Optional user authentication

3. **Export/Import**
   - Export custom workflows to JSON file
   - Import workflows from JSON file
   - Share workflow configurations

4. **Workflow Groups**
   - Organize workflows into categories
   - Collapsible sections
   - Custom ordering

## Technical Details

### WorkflowManager API

#### Constructor
```javascript
new WorkflowManager(configWorkflows)
```
- `configWorkflows`: Array of workflows from config.js

#### Methods

**`getAllWorkflows()`**
- Returns: `Array<Workflow>` - All workflows (config + custom)
- Each workflow includes `source: 'config' | 'user'`

**`addWorkflow(workflow)`**
- Parameters: `{ owner, repo, workflow, label }`
- Returns: `boolean` - Success status
- Throws: Error if validation fails or duplicate exists

**`removeWorkflow(index)`**
- Parameters: `index` - Index in combined workflow array
- Returns: `boolean` - Success status
- Throws: Error if workflow is from config or not found

**`removeWorkflowByProps(owner, repo, workflow)`**
- Parameters: Repository owner, name, and workflow file
- Returns: `boolean` - Success status
- Throws: Error if workflow not found or is from config

**`clearCustomWorkflows()`**
- Returns: `boolean` - Success status
- Removes all custom workflows from local storage

**`getCustomWorkflowCount()`**
- Returns: `number` - Count of custom workflows

### Dashboard Integration

The dashboard automatically:
1. Initializes WorkflowManager with config workflows on page load
2. Loads custom workflows from local storage
3. Renders all workflows (config + custom) in the grid
4. Exposes API via `dashboardInstance` for console access

### Storage Events

Local storage changes trigger the `storage` event in other tabs/windows. You can listen for this:

```javascript
window.addEventListener('storage', (e) => {
  if (e.key === 'dashboard_custom_workflows') {
    console.log('Custom workflows changed in another tab');
    // Optionally reload workflows
    dashboardInstance.loadWorkflows();
  }
});
```

## Migration Path

### From Static Config to Dynamic

1. **Current State**: All workflows in `config.js`, requires rebuild/redeploy to change
2. **Now**: Base workflows in `config.js` + runtime additions via browser console
3. **Next**: UI controls for adding/removing workflows (separate issue)
4. **Future**: Azure Storage backend for permanent, cross-device persistence (issue #7)

### Backward Compatibility

✅ **Fully backward compatible**
- Existing `config.js` workflows continue to work unchanged
- No changes required to existing deployments
- Custom workflows are additive, not replacements

## Troubleshooting

### Custom Workflows Not Persisting

1. Check browser console for errors
2. Verify local storage is enabled (not in private mode)
3. Check storage quota: `localStorage.length`
4. Try clearing and re-adding: `dashboardInstance.workflowManager.clearCustomWorkflows()`

### Workflows Not Appearing

1. Check console: `dashboardInstance.workflowManager.getAllWorkflows()`
2. Verify token has access to the repository
3. Check workflow file name is correct (case-sensitive)
4. Manually refresh: `await dashboardInstance.loadWorkflows()`

### Cannot Remove Workflow

- Only `user`-sourced workflows can be removed
- Check workflow source: `dashboardInstance.workflowManager.getAllWorkflows()[index].source`
- Config workflows are protected from removal

## Security Considerations

### Local Storage Security

- ⚠️ Custom workflows are stored in plain text in local storage
- 🔒 No sensitive data (tokens, credentials) is stored
- ✅ Only workflow metadata (owner, repo, workflow file, label)

### XSS Protection

- All workflow properties are sanitized when rendered
- Uses `textContent` instead of `innerHTML` for user input
- No script injection risk from custom workflow data

## Contributing

When adding features related to dynamic workflow management:

1. Maintain backward compatibility with config.js
2. Keep WorkflowManager source-agnostic (easy to swap storage backends)
3. Validate all user input
4. Preserve the distinction between config and user workflows
5. Update this documentation

## Related Issues

- Current Issue: Convert grid to JavaScript
- Future: Add UI controls for workflow management
- Issue #7: Azure Storage integration for persistent storage
