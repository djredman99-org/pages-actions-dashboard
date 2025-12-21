# GitHub Actions Dashboard

A GitHub Pages site that serves as a centralized dashboard for monitoring GitHub Actions workflow statuses across multiple repositories, **including private and internal repositories**.

## Features

- **Multi-Repository Support**: Monitor workflows from any GitHub repository (public, private, or internal)
- **Azure Function Backend**: Secure serverless backend handles GitHub API calls
- **Centralized Configuration**: Workflow configurations stored in Azure Storage
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

**Prerequisites**:
- Azure subscription with permissions to create resources
- Azure CLI installed and configured
- Azure Functions Core Tools
- Node.js 18+
- GitHub App created and installed on your repositories

**Deployment Steps**:
1. Deploy Azure infrastructure (Function App, Key Vault, Storage)
2. Upload GitHub App private key to Key Vault
3. Deploy function app code
4. Upload workflow configuration to Azure Storage
5. Configure GitHub Pages with `AZURE_FUNCTION_URL` secret
6. Push to deploy

Your dashboard will be available at `https://{your-username}.github.io/pages-actions-dashboard/`

📖 **Complete Setup Guide**: See [AZURE_SETUP.md](AZURE_SETUP.md) for detailed step-by-step instructions.

## Configuration

### Managing Workflows

Workflows are stored in Azure Storage (`workflows.json`). Each workflow specifies owner, repo, workflow file, and display label.

📖 **Configuration Guide**: See [AZURE_SETUP.md](AZURE_SETUP.md#step-6-upload-workflow-configuration) for workflow configuration format and upload instructions.

### Themes

The dashboard supports three themes: Default (purple gradient), Light (GitHub Primer), and Dark (GitHub Primer). Use the settings button (⚙️) to switch themes.

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
- **[AZURE_SETUP.md](AZURE_SETUP.md)** - Complete deployment guide with step-by-step instructions
- **[DEPLOYMENT_NOTES.md](DEPLOYMENT_NOTES.md)** - Deployment checklist, troubleshooting, and monitoring

### Technical Details
- **[AZURE_IMPLEMENTATION.md](AZURE_IMPLEMENTATION.md)** - Detailed architecture and technical implementation
- **[function-app/README.md](function-app/README.md)** - Function App development and deployment guide
- **[infrastructure/README.md](infrastructure/README.md)** - Infrastructure as Code details

### Customization
- **[COLOR_SCHEMES.md](COLOR_SCHEMES.md)** - Theme color palettes and usage
- **[pages/THEMES.md](pages/THEMES.md)** - Theme system documentation and customization

### Legacy Documentation
- **[DYNAMIC_WORKFLOWS.md](DYNAMIC_WORKFLOWS.md)** - (Deprecated) Dynamic workflow management reference

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

📖 **Detailed Troubleshooting**: See [AZURE_SETUP.md](AZURE_SETUP.md#troubleshooting) and [DEPLOYMENT_NOTES.md](DEPLOYMENT_NOTES.md#common-issues) for comprehensive troubleshooting guides.

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
