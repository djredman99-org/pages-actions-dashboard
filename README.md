# GitHub Actions Dashboard

A GitHub Pages site that serves as a centralized dashboard for monitoring GitHub Actions workflow statuses across multiple repositories, **including private and internal repositories**.

## Features

- **Multiple Dashboards**: Organize workflows into separate dashboards and switch between them
- **Multi-Repository Support**: Monitor workflows from any GitHub repository (public, private, or internal)
- **Dynamic Workflow Management**: Add and remove workflows via dashboard UI or API without redeployment
- **Workflow Reordering**: Drag-and-drop to reorder workflows within each repository in edit mode
- **Azure Function Backend**: Secure serverless backend handles GitHub API calls
- **Centralized Configuration**: Workflow configurations stored in Azure Storage with dashboard-level GUID identifiers
- **Dynamic Status Indicators**: Real-time workflow status with color-coded badges
- **GitHub App Authentication**: Secure authentication using GitHub Apps (no exposed tokens)
- **Responsive Design**: Adapts to different screen sizes with multiple themes
- **Auto-Refresh**: Automatically refreshes workflow statuses every 5 minutes
- **Accessible**: Fully clickable workflow cards with keyboard navigation support

## Architecture Overview

The dashboard uses a secure Azure Function backend:
- GitHub App credentials stored securely in Azure Key Vault
- Managed Identity for secure access (no credentials in code)
- Workflow configurations in Azure Storage (cross-device sync)
- No token exposure in the browser

📖 **Detailed Architecture**: See [AZURE_IMPLEMENTATION.md](AZURE_IMPLEMENTATION.md) for complete technical details.

## Quick Start

Get your dashboard up and running in 4 simple steps:

1. **Create a GitHub App** - Secure authentication to GitHub API
2. **Create Azure Service Principal** - Allows automated deployments
3. **Configure GitHub Secrets** - Store credentials securely
4. **Configure GitHub Pages** - Enable the dashboard hosting

All deployments are automated via GitHub Actions workflows. No manual Azure CLI commands required!

📖 **Complete Setup Guide**: See [SETUP.md](SETUP.md) for detailed step-by-step instructions.

Your dashboard will be available at `https://{your-org}.github.io/{repo-name}/`

## Configuration

### Multiple Dashboards

The dashboard now supports multiple dashboards, allowing you to organize workflows into separate views (e.g., Production, Staging, Development, or by team/project).

- **Switch Dashboards**: Use the dropdown selector at the top of the page
- **Manage Dashboards**: Click the "Manage" button to create, rename, or delete dashboards
- **Active Dashboard**: Only one dashboard is active at a time, showing only its workflows
- **Automatic Migration**: Existing single-dashboard configurations are automatically migrated

📖 **Multiple Dashboards Guide**: See [MULTIPLE_DASHBOARDS.md](MULTIPLE_DASHBOARDS.md) for complete documentation on using and managing multiple dashboards.

### Managing Workflows

Workflows are stored in Azure Storage (`workflows.json`). Each dashboard has its own set of workflows with owner, repo, workflow file, and display label.

You can manage workflows in multiple ways:
1. **Dashboard UI**: 
   - Click the "Add Workflow" button to add workflows
   - Click the X button on workflow cards to remove them
   - Click the "Edit Mode" button to reorder workflows via drag-and-drop
2. **Manually**: Upload `workflows.json` to Azure Storage
3. **API**: Use the workflow management Azure Functions for dynamic management
4. **Automated**: Integrate workflow management into your own tools

📖 **Manual Configuration**: See [SETUP.md](SETUP.md#configure-workflows-to-monitor) for workflow configuration format and upload instructions.

📖 **API Usage**: See [WORKFLOW_MANAGEMENT_API.md](WORKFLOW_MANAGEMENT_API.md) for complete API documentation with examples.

### Themes

The dashboard supports three themes: Default (GitHub Dark Dimmed), Light (GitHub Primer), and Dark (GitHub Primer). Use the settings button (⚙️) to switch themes.

📖 **Theme Details**: See [COLOR_SCHEMES.md](COLOR_SCHEMES.md) for color palettes and [pages/THEMES.md](pages/THEMES.md) for customization.

### Auto-Refresh

Dashboard refreshes every 5 minutes by default. To change the interval, edit `pages/dashboard.js`.

### Status Indicators

- 🟢 **Green**: Workflow completed successfully
- 🔴 **Red**: Workflow failed or timed out
- 🟡 **Yellow**: Workflow is in progress
- ⚪ **Gray**: Workflow was cancelled, skipped, or status unknown

## Documentation

### Getting Started
- **[SETUP.md](SETUP.md)** - Complete setup guide with automated deployment via GitHub Actions

### Features & Usage
- **[MULTIPLE_DASHBOARDS.md](MULTIPLE_DASHBOARDS.md)** - Organize workflows into multiple dashboards
- **[WORKFLOW_MANAGEMENT_API.md](WORKFLOW_MANAGEMENT_API.md)** - API documentation for programmatic workflow management

### Technical Details
- **[AZURE_IMPLEMENTATION.md](AZURE_IMPLEMENTATION.md)** - Architecture and technical implementation details
- **[function-app/README.md](function-app/README.md)** - Function App development guide
- **[infrastructure/README.md](infrastructure/README.md)** - Infrastructure as Code details

### Customization
- **[COLOR_SCHEMES.md](COLOR_SCHEMES.md)** - Theme color palettes
- **[pages/THEMES.md](pages/THEMES.md)** - Theme customization guide

## Troubleshooting

### Common Issues

**Dashboard shows "Configuration Required"**
- Verify `AZURE_FUNCTION_URL` secret is set in repository settings
- Check GitHub Actions deployment workflow completed successfully

**Function returns errors**
- Check Application Insights logs for detailed error messages
- Verify GitHub App credentials are correctly stored in Key Vault
- Ensure GitHub App has "Actions: Read" permission

**Workflow not found errors**
- Verify repository owner, name, and workflow file in `workflows.json`
- Check GitHub App is installed on target repositories

**Changes not appearing**
- Check Actions tab for deployment workflow status
- Clear browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

📖 **Detailed Troubleshooting**: See [SETUP.md](SETUP.md#troubleshooting) for comprehensive troubleshooting guide.

## Security

✅ **Secure by design**:
- GitHub App credentials stored in Azure Key Vault
- Managed Identity for credential-free Azure service access
- Server-side authentication for all GitHub API calls
- CORS protection with configurable allowed origins

✅ **Best for**:
- Production environments with strict security requirements
- Public GitHub Pages sites monitoring private repositories
- Organizations with compliance requirements

📖 **Security Details**: See [AZURE_IMPLEMENTATION.md](AZURE_IMPLEMENTATION.md#security-features) for comprehensive security documentation.

## License

MIT
