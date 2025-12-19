# GitHub Actions Dashboard

A GitHub Pages site that serves as a centralized dashboard for monitoring GitHub Actions workflow statuses across multiple repositories, **including private and internal repositories**.

## Features

- **5-Column Grid Layout**: Displays workflow statuses in a clean, organized grid (5 across, responsive)
- **Multi-Repository Support**: Monitor workflows from any GitHub repository (public, private, or internal)
- **Azure Function Backend**: Secure serverless backend handles GitHub API calls
- **Centralized Configuration**: Workflow configurations stored in Azure Storage, not hardcoded
- **Dynamic Status Indicators**: Real-time workflow status with color-coded badges (green for passing, red for failing, yellow for running)
- **GitHub App Authentication**: Secure authentication using GitHub Apps (no exposed tokens)
- **Responsive Design**: Adapts to different screen sizes (desktop, tablet, mobile)
- **Auto-Refresh**: Automatically refreshes workflow statuses every 5 minutes
- **Professional Styling**: Modern, clean interface with hover effects
- **Fully Clickable Workflow Cards**: Click anywhere on a workflow card to navigate to its workflow runs page
- **Accessible Keyboard Navigation**: Navigate and activate workflow cards using Tab and Enter keys with visible focus indicators

## Architecture

The dashboard uses a secure Azure Function backend that:
- ✅ Stores GitHub App credentials securely in Azure Key Vault
- ✅ Uses Managed Identity for secure access (no credentials in code)
- ✅ Stores workflow configurations in Azure Storage (cross-device sync)
- ✅ Eliminates token exposure in the browser
- ✅ Works with public, private, and internal repositories

**Setup Guide**: See [AZURE_SETUP.md](AZURE_SETUP.md) for complete deployment instructions.

## Quick Start

### 1. Prerequisites

- Azure subscription with permissions to create resources
- Azure CLI installed and configured
- Node.js 18+ and Azure Functions Core Tools
- GitHub App created and installed on your repositories

### 2. Deploy Azure Infrastructure

```bash
cd infrastructure
cp parameters.example.json parameters.json
# Edit parameters.json with your GitHub App credentials
./deploy.sh
```

This creates:
- Azure Function App (serverless backend)
- Azure Key Vault (stores GitHub App credentials)
- Azure Storage (stores workflow configurations)
- Managed Identity (secure access without storing credentials)

### 3. Deploy Function App Code

```bash
cd function-app
npm install
func azure functionapp publish <FUNCTION_APP_NAME>
```

### 4. Upload Workflow Configuration

```bash
# Edit workflows.json with your workflows
az storage blob upload \
  --account-name <STORAGE_ACCOUNT_NAME> \
  --container-name workflow-configs \
  --name workflows.json \
  --file workflows.json \
  --auth-mode login
```

### 5. Configure GitHub Pages

1. Add `AZURE_FUNCTION_URL` as a repository secret
2. Push to deploy: Changes auto-deploy to GitHub Pages

Your dashboard will be available at `https://{your-username}.github.io/pages-actions-dashboard/`

**📖 Detailed Setup Guide**: See [AZURE_SETUP.md](AZURE_SETUP.md) for complete instructions.

## Configuration

### Workflow Configuration

Workflows are stored in Azure Storage (`workflows.json`). To add or update workflows:

```json
[
  {
    "owner": "your-org",
    "repo": "your-repo",
    "workflow": "ci.yml",
    "label": "CI Build"
  }
]
```

Upload to Azure Storage:

```bash
az storage blob upload \
  --account-name <STORAGE_ACCOUNT_NAME> \
  --container-name workflow-configs \
  --name workflows.json \
  --file workflows.json \
  --auth-mode login \
  --overwrite
```

Changes take effect immediately (no redeployment needed).

### Status Indicators

The dashboard displays color-coded status indicators:

- 🟢 **Green (passing)**: Workflow completed successfully
- 🔴 **Red (failing)**: Workflow failed or timed out
- 🟡 **Yellow (running)**: Workflow is currently in progress
- ⚪ **Gray**: Workflow was cancelled, skipped, or status unknown

### Auto-Refresh

By default, the dashboard refreshes workflow statuses every 5 minutes. To change this, edit `pages/dashboard.js`:

```javascript
// Set up auto-refresh every 10 minutes instead
dashboard.setupAutoRefresh(10);
```

## Dynamic Workflow Management (DEACTIVATED - IGNORE as of 12/18/2025)

### Runtime Workflow Management

You can add and remove workflows at runtime using the browser console! 

**Via Browser Console:**
```javascript
// Add a workflow
dashboardInstance.workflowManager.addWorkflow({
  owner: 'microsoft',
  repo: 'vscode',
  workflow: 'ci.yml',
  label: 'VS Code CI'
});
await dashboardInstance.loadWorkflows();

// Remove a workflow
dashboardInstance.workflowManager.removeWorkflowByProps('microsoft', 'vscode', 'ci.yml');
await dashboardInstance.loadWorkflows();
```

Custom workflows are stored in browser local storage and persist across page reloads.

📖 **Full Documentation**: See [DYNAMIC_WORKFLOWS.md](DYNAMIC_WORKFLOWS.md) for complete API reference and usage examples.

**Note**: Runtime workflow changes are stored locally in the browser. For permanent, cross-device workflow configuration, update the `workflows.json` file in Azure Storage.

## Architecture

The dashboard consists of:

**Frontend (GitHub Pages):**
1. **pages/index.html**: Main HTML page with styling
2. **pages/config.js**: Configuration for Azure Function URL
3. **pages/api.js**: API client that calls Azure Function
4. **pages/dashboard.js**: Dashboard loader that renders workflow cards
5. **pages/workflow-manager.js**: Manages workflow data

**Backend (Azure):**
1. **function-app/**: Azure Function App code (Node.js)
   - `get-workflow-statuses`: HTTP-triggered function that returns workflow statuses
   - `github-auth.js`: GitHub App authentication module
   - `keyvault-client.js`: Azure Key Vault client for retrieving secrets
   - `storage-client.js`: Azure Storage client for workflow configurations
2. **infrastructure/**: Bicep templates for Azure resources
   - `main.bicep`: Main infrastructure template
   - `deploy.sh`: Deployment script

### How It Works

1. Azure infrastructure is deployed (Function App, Key Vault, Storage)
2. GitHub App credentials stored in Key Vault
3. Workflow configurations uploaded to Azure Storage
4. Function App uses Managed Identity to access Key Vault and Storage
5. GitHub Pages site calls Azure Function to get workflow statuses
6. Function authenticates with GitHub using App credentials
7. Function returns workflow statuses as JSON
8. Dashboard displays the results

**Security**: GitHub credentials never exposed to the browser, stored securely in Azure Key Vault.

## Security

✅ **Secure by design**:
- **No exposed credentials**: GitHub App credentials stored in Azure Key Vault
- **Managed Identity**: Function App accesses Azure services without storing credentials
- **Server-side authentication**: All GitHub API calls happen server-side
- **CORS protection**: Configure allowed origins to restrict access
- **Audit logging**: Application Insights tracks all function invocations

✅ **Best for**:
- Production environments with strict security requirements
- Public GitHub Pages sites monitoring private repositories
- Organizations with compliance requirements
- Any scenario requiring credential security

## Troubleshooting

### Dashboard shows "Configuration Required"
- Ensure `AZURE_FUNCTION_URL` secret is set in repository settings
- Check that the deployment workflow completed successfully
- Verify the URL was injected correctly in the deployed `pages/config.js`

### Authentication errors
- Verify GitHub App is properly installed on your repositories
- Check that the App has "Actions: Read" permission
- Verify App credentials are correctly stored in Azure Key Vault
- Check Function App logs in Application Insights for detailed errors

### Workflow not found errors
- Verify repository owner, name, and workflow file in `workflows.json` in Azure Storage
- Ensure workflow files exist in the specified repositories
- Check that the GitHub App has access to those repositories

### Changes not appearing
- Check the Actions tab for deployment workflow status
- Deployment workflow must complete successfully for changes to appear
- Check the Actions tab for any build errors
- Clear your browser cache and do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## License

MIT
