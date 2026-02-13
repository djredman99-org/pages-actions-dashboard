# Setup Guide

This guide will help you set up the GitHub Actions Dashboard in your repository. The setup process has been streamlined to just 4 essential steps.

## Overview

The GitHub Actions Dashboard is a GitHub Pages site that monitors GitHub Actions workflow statuses across multiple repositories using an Azure Function backend for secure API access.

**Key Benefits:**
- ✅ Monitor private and internal repositories securely
- ✅ Centralized dashboard for multiple workflows
- ✅ Automated deployment via GitHub Actions
- ✅ No exposed credentials in the browser

## Prerequisites

Before you begin, ensure you have:
- An Azure subscription with permissions to create resources
- A GitHub repository where you want to deploy the dashboard
- Administrative access to your GitHub organization (for creating GitHub Apps)

## Setup Steps

### Step 1: Create a GitHub App

The GitHub App provides secure authentication to the GitHub API without exposing tokens.

1. Go to your GitHub organization settings → **Developer settings** → **GitHub Apps**
2. Click **"New GitHub App"**
3. Configure the app:
   - **Name**: `GitHub Actions Dashboard` (or your preferred name)
   - **Homepage URL**: Your dashboard URL (e.g., `https://your-org.github.io/pages-actions-dashboard/`)
   - **Webhook**: Uncheck "Active" (not needed)
   - **Permissions** → Repository permissions:
     - **Actions**: Read-only (required)
     - **Metadata**: Read-only (automatically granted)
4. Click **"Create GitHub App"**
5. **Save the App ID** - you'll need this for GitHub Secrets
6. **Generate a private key**:
   - Scroll to "Private keys" section
   - Click "Generate a private key"
   - Save the downloaded `.pem` file securely
7. **Install the app**:
   - Go to "Install App" in the left sidebar
   - Click "Install" next to your organization
   - Select repositories to monitor (or "All repositories")

### Step 2: Create Azure Service Principal

The Service Principal allows GitHub Actions to deploy Azure infrastructure and function code.

1. Login to Azure CLI:
   ```bash
   az login
   ```

2. Set your subscription (if you have multiple):
   ```bash
   az account set --subscription "YOUR_SUBSCRIPTION_NAME_OR_ID"
   ```

3. Create a Service Principal with the required permissions:
   ```bash
   az ad sp create-for-rbac \
     --name "github-actions-dashboard-sp" \
     --role Contributor \
     --scopes /subscriptions/YOUR_SUBSCRIPTION_ID \
     --sdk-auth
   ```

4. **Save the JSON output** - you'll need this entire JSON object for GitHub Secrets

   **Important:** The Service Principal needs two roles:
   - **Contributor** - to create/manage Azure resources
   - **User Access Administrator** - to assign managed identity permissions

   If you encounter permission errors during deployment, add the User Access Administrator role:
   ```bash
   az role assignment create \
     --assignee YOUR_SERVICE_PRINCIPAL_APP_ID \
     --role "User Access Administrator" \
     --scope /subscriptions/YOUR_SUBSCRIPTION_ID
   ```

### Step 3: Configure GitHub Secrets

Add the following secrets to your repository (Settings → Secrets and variables → Actions):

| Secret Name | Description | How to Get It |
|-------------|-------------|---------------|
| `AZURE_CREDENTIALS` | Service Principal credentials in JSON format | From Step 2 (entire JSON output) |
| `GH_APP_ID` | GitHub App ID | From Step 1 (displayed on GitHub App page) |
| `GH_APP_PRIVATE_KEY` | GitHub App private key | From Step 1 (contents of the `.pem` file) |

**Note:** Additional secrets (`FUNCTION_APP_NAME` and `AZURE_FUNCTION_URL`) will be automatically set after infrastructure deployment, or you can add them manually after running the deployment workflow.

### Step 4: Configure GitHub Pages

Enable GitHub Pages to host your dashboard:

1. Go to your repository → **Settings** → **Pages**
2. Under **"Build and deployment"** → **"Source"**, select **"GitHub Actions"**
   
   ⚠️ **Important:** Do NOT select "Deploy from a branch" - we use a custom workflow that injects configuration during build

3. The configuration is saved automatically

## Deployment

### Initial Deployment

With the prerequisites complete, deploy your dashboard:

1. **Prepare Configuration File**:
   ```bash
   cd infrastructure
   cp parameters.example.json parameters.json
   ```

2. **Edit `parameters.json`** with your values:
   ```json
   {
     "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
     "contentVersion": "1.0.0.0",
     "parameters": {
       "location": {
         "value": "eastus"
       },
       "baseName": {
         "value": "ghactionsdash"
       },
       "environment": {
         "value": "dev"
       },
       "githubAppId": {
         "value": "PLACEHOLDER"
       }
     }
   }
   ```
   
   **Important Notes:**
   - Set `githubAppId` to `"PLACEHOLDER"` - it will be automatically replaced by the workflow
   - The `baseName` must be unique across Azure and will be used to name your resources
   - ⚠️ **Commit this file** to your repository (it contains no secrets)

3. **Commit and push your changes**:
   ```bash
   git add infrastructure/parameters.json
   git commit -m "Add infrastructure parameters"
   git push
   ```

4. **Deploy Azure Infrastructure**:
   - Go to **Actions** tab in your repository
   - Click **"Deploy Azure Infrastructure"** workflow
   - Click **"Run workflow"** → Select `main` branch → **"Run workflow"**
   - Wait for the workflow to complete (3-5 minutes)
   - The workflow will automatically:
     - Deploy all Azure resources (Function App, Key Vault, Storage)
     - Upload GitHub App credentials to Key Vault
     - Output configuration details in the workflow summary

5. **Add Function App Secret** (after infrastructure deployment):
   - In the workflow summary, find the **Function App Name** (e.g., `ghactionsdash-func-dev`)
   - Go to Settings → Secrets and variables → Actions
   - Add secret:
     - Name: `FUNCTION_APP_NAME`
     - Value: The function app name from the workflow output

6. **Deploy Function App Code**:
   - Go to **Actions** tab
   - Click **"Deploy Azure Function"** workflow
   - Click **"Run workflow"** → Select `main` branch → **"Run workflow"**
   - Wait for the workflow to complete (2-3 minutes)

7. **Add Azure Function URL Secret** (after function deployment):
   - In the workflow summary, find the **Function App URL** (e.g., `https://ghactionsdash-func-dev.azurewebsites.net`)
   - Go to Settings → Secrets and variables → Actions
   - Add secret:
     - Name: `AZURE_FUNCTION_URL`
     - Value: The function URL from the workflow output (base URL only, no path)

8. **Deploy Dashboard to GitHub Pages**:
   - Push any change to the `main` branch (or manually trigger the workflow)
   - Go to **Actions** tab
   - The **"Deploy Dashboard to GitHub Pages"** workflow will run automatically
   - Wait for the workflow to complete (1-2 minutes)

9. **Access Your Dashboard**:
   - Your dashboard will be available at: `https://your-org.github.io/your-repo-name/`
   - For private/internal repositories, you'll need to sign in to GitHub first

### Configure Workflows to Monitor

You have two options to configure which workflows to monitor:

**Option 1: Via Dashboard UI (Recommended)**
1. Navigate to your dashboard
2. Click the **"Add Workflow"** button
3. Enter workflow details and click "Add Workflow"

**Option 2: Manual Upload**
1. Create a `workflows.json` file:
   ```json
   [
     {
       "dashboardId": "00000000-0000-0000-0000-000000000000",
       "owner": "your-org",
       "repo": "your-repo",
       "workflow": "ci.yml",
       "label": "CI Build"
     }
   ]
   ```
   Note: The `dashboardId` value shown creates a "Main Dashboard". Keep this value for the default dashboard.

2. Upload to Azure Storage:
   ```bash
   az storage blob upload \
     --account-name YOUR_STORAGE_ACCOUNT_NAME \
     --container-name workflow-configs \
     --name workflows.json \
     --file workflows.json \
     --auth-mode login
   ```

## Verification

After deployment, verify everything is working:

1. **Check Azure Resources**:
   ```bash
   az resource list --resource-group ghactionsdash-rg --output table
   ```

2. **Test Function App**:
   ```bash
   curl https://YOUR_FUNCTION_APP_NAME.azurewebsites.net/api/get-workflow-statuses
   ```
   Should return JSON with workflow statuses

3. **Access Dashboard**:
   - Visit your dashboard URL
   - Workflow cards should display with current statuses
   - Check browser console for any errors

## Troubleshooting

### Infrastructure Deployment Fails

**Resource provider not registered:**
```bash
az provider register --namespace microsoft.operationalinsights
az provider register --namespace microsoft.web
az provider register --namespace microsoft.storage
az provider register --namespace microsoft.keyvault
```

Wait 2-5 minutes for registration to complete, then retry the deployment.

**Insufficient permissions:**
Ensure your Service Principal has both:
- Contributor role
- User Access Administrator role

### Function Deployment Fails

**Function App name not found:**
- Verify `FUNCTION_APP_NAME` secret is set correctly
- Check the infrastructure deployment completed successfully

### Dashboard Shows "Configuration Required"

**Azure Function URL not configured:**
- Verify `AZURE_FUNCTION_URL` secret is set
- Check the Pages deployment workflow completed successfully
- Hard refresh the page: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

### Workflows Not Loading

**GitHub App not installed or insufficient permissions:**
- Verify the GitHub App is installed on the target repositories
- Check the App has "Actions: Read-only" permission
- Verify the App ID and private key are correct in Key Vault

**Function App errors:**
```bash
# View function logs
az functionapp log tail --name YOUR_FUNCTION_APP_NAME --resource-group ghactionsdash-rg
```

## Next Steps

After successful deployment:

1. **Configure Multiple Dashboards**: See [MULTIPLE_DASHBOARDS.md](MULTIPLE_DASHBOARDS.md) to organize workflows into separate dashboards

2. **Customize Themes**: See [pages/THEMES.md](pages/THEMES.md) for theme customization

3. **Monitor Costs**: See [Cost Considerations](#cost-considerations) below

4. **Set Up Alerts**: Configure Azure Monitor alerts for function errors and costs

## Cost Considerations

Estimated monthly cost: **$5-10 USD** for typical usage

Resources used:
- **Function App** (Consumption Plan): Pay-per-execution (~$0.20-0.40/month)
- **Storage Account** (Standard LRS): Minimal cost for storing configurations (~$0.05/month)
- **Key Vault** (Standard): Very low cost for storing secrets (~$0.03/month)
- **Application Insights**: Included for monitoring (~$5/month for typical log volume)

To minimize costs:
- Use Consumption plan (default) instead of dedicated App Service Plan
- Monitor Application Insights data ingestion
- Consider shared Function App for multiple environments

## Security Best Practices

✅ **Follow these security guidelines:**

1. **Restrict CORS**: Update Function App CORS settings to only allow your Pages domain:
   ```bash
   az functionapp cors add \
     --name YOUR_FUNCTION_APP_NAME \
     --resource-group ghactionsdash-rg \
     --allowed-origins "https://your-org.github.io"
   ```

2. **Rotate GitHub App Keys**: Rotate private keys every 3-6 months

3. **Monitor Access**: Use Application Insights to monitor Function App usage and detect anomalies

4. **Review Permissions**: Regularly audit GitHub App installation and repository access

5. **Use Private Repositories**: For sensitive dashboards, keep the repository private to require GitHub authentication

## Support

For issues or questions:
- Review the [Troubleshooting](#troubleshooting) section above
- Check [GitHub Issues](https://github.com/djredman99-org/pages-actions-dashboard/issues)
- Consult [Azure Functions documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)

## Additional Documentation

- **[MULTIPLE_DASHBOARDS.md](MULTIPLE_DASHBOARDS.md)** - Organize workflows into multiple dashboards
- **[WORKFLOW_MANAGEMENT_API.md](WORKFLOW_MANAGEMENT_API.md)** - API documentation for workflow management
- **[AZURE_IMPLEMENTATION.md](AZURE_IMPLEMENTATION.md)** - Detailed architecture and technical implementation
- **[pages/THEMES.md](pages/THEMES.md)** - Theme customization guide
