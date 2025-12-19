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

### New: Azure Function Backend (Recommended)

The dashboard now uses a secure Azure Function backend that:
- ✅ Stores GitHub App credentials securely in Azure Key Vault
- ✅ Uses Managed Identity for secure access (no credentials in code)
- ✅ Stores workflow configurations in Azure Storage (cross-device sync)
- ✅ Eliminates token exposure in the browser
- ✅ Works with public, private, and internal repositories

**Setup Guide**: See [AZURE_SETUP.md](AZURE_SETUP.md) for complete deployment instructions.

### Legacy: Direct GitHub API (Deprecated)

The original architecture using Personal Access Tokens is still supported but deprecated. See [SETUP.md](SETUP.md) for legacy setup instructions.

## Quick Start (Azure Function Backend)

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

Edit `pages/config.js` to add or remove workflows:

```javascript
const DASHBOARD_CONFIG = {
    github: {
        token: '__GITHUB_TOKEN__',  // Injected at build time
        apiBaseUrl: 'https://api.github.com',
        debug: false  // Set to true to enable debug logging
    },
    workflows: [
        {
            owner: 'your-org',       // Repository owner
            repo: 'your-repo',       // Repository name
            workflow: 'ci.yml',      // Workflow file name
            label: 'CI Build'        // Display label
        }
        // Add more workflows...
    ]
};
```

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

## Dynamic Workflow Management

### NEW: Runtime Workflow Management

You can now add and remove workflows at runtime without editing `config.js`! 

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

**Future**: UI controls for adding/removing workflows will be added in a separate enhancement. Long-term solution will use Azure Storage for permanent, cross-device persistence (issue #7).

## Architecture

### Azure Function Backend Architecture

The dashboard consists of:

**Frontend (GitHub Pages):**
1. **pages/index.html**: Main HTML page with styling
2. **pages/config.js**: Configuration for Azure Function URL
3. **pages/api.js**: API client that calls Azure Function
4. **pages/dashboard.js**: Dashboard loader that renders workflow cards
5. **pages/workflow-manager.js**: Manages workflow data (kept for backward compatibility)

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

### Azure Function Backend (Recommended)

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

### Legacy Architecture (Deprecated)

⚠️ **Security limitations**:
- GitHub token embedded in deployed JavaScript (visible in browser)
- Suitable only for internal dashboards with same access restrictions
- Requires regular token rotation and monitoring

**Migration recommended**: Migrate to Azure Function backend for better security.

## Troubleshooting

### Dashboard shows "Configuration Required"
- Ensure `DASHBOARD_TOKEN` secret is set in repository settings
- Check that the deployment workflow completed successfully
- Verify the token was injected correctly in the deployed `pages/config.js`

### Authentication errors (401 Unauthorized)
- Verify your token is valid and hasn't expired
- Check token permissions include `actions:read`
- For private repos, ensure the token has access to those specific repositories
- Regenerate the token if needed and update the `DASHBOARD_TOKEN` secret

### Workflow not found errors
- Verify repository owner, name, and workflow file in `pages/config.js`
- Ensure workflow files exist in the specified repositories
- Check that the token has access to those repositories

### Changes not appearing
- Check the Actions tab for deployment workflow status
- Deployment workflow must complete successfully for changes to appear
- Check the Actions tab for any build errors
- Clear your browser cache and do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Migrating from Badge-Based Dashboard

If you're upgrading from the old badge-based dashboard:

1. Your existing workflow links will continue to work
2. Update `pages/config.js` with your workflow definitions
3. Set up authentication (see SETUP.md)
4. The new dashboard will fetch live statuses instead of using static badge images
5. Private and internal repositories will now work correctly

## License

MIT