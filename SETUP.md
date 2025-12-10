# GitHub App Setup Guide

This guide explains how to set up authentication for the GitHub Actions Dashboard to work with private and internal repositories.

## Overview

The dashboard uses the GitHub API to fetch workflow statuses. To access workflows in private and internal repositories, you need to authenticate using either:

1. **GitHub App** (Recommended for organizations)
2. **Personal Access Token (PAT)** (Simpler for personal use)

## Option 1: GitHub App (Recommended)

### Step 1: Create a GitHub App

1. Go to your organization settings: `https://github.com/organizations/{YOUR_ORG}/settings/apps`
2. Click "New GitHub App"
3. Fill in the following details:
   - **GitHub App name**: `Actions Dashboard` (or your preferred name)
   - **Homepage URL**: Your GitHub Pages URL
   - **Webhook**: Uncheck "Active" (not needed)
   - **Permissions**:
     - Repository permissions:
       - Actions: Read-only
       - Metadata: Read-only (automatically granted)
   - **Where can this GitHub App be installed?**: Only on this account

4. Click "Create GitHub App"

### Step 2: Generate a Private Key

1. After creating the app, scroll down to "Private keys"
2. Click "Generate a private key"
3. Save the downloaded `.pem` file securely

### Step 3: Install the App

1. Go to the app settings
2. Click "Install App" in the left sidebar
3. Select the organization/account to install it on
4. Choose which repositories the app can access:
   - All repositories, or
   - Select specific repositories you want to monitor

### Step 4: Generate an Installation Access Token

You'll need to create a GitHub Action or script to generate installation access tokens. Here's a simplified approach:

**Using a GitHub Action to generate the token:**

Create a workflow that:
1. Uses the GitHub App's private key and installation ID
2. Generates an installation access token
3. Stores it as a secret

Alternatively, use a pre-generated token approach (see Option 2 below).

### Step 5: Store the Token as a Secret

1. Go to your repository settings
2. Navigate to "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Name: `DASHBOARD_TOKEN`
5. Value: Your GitHub App installation access token
6. Click "Add secret"

## Option 2: Personal Access Token (Simpler)

### Step 1: Create a Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Fill in the details:
   - **Token name**: `Actions Dashboard`
   - **Expiration**: Choose an appropriate expiration (90 days recommended)
   - **Repository access**: Select the repositories you want to monitor
   - **Permissions**:
     - Repository permissions:
       - Actions: Read-only
       - Metadata: Read-only

4. Click "Generate token"
5. Copy the token (you won't be able to see it again!)

### Step 2: Store the Token as a Secret

1. Go to your repository settings (the dashboard repository)
2. Navigate to "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Name: `DASHBOARD_TOKEN`
5. Value: Paste your Personal Access Token
6. Click "Add secret"

## Deployment

Once you've configured the token:

1. The `deploy-dashboard.yml` workflow will automatically inject the token when deploying to GitHub Pages
2. The token is replaced in the `config.js` file at build time
3. The dashboard will use this token to authenticate API requests

## Security Considerations

⚠️ **Important Security Notes:**

1. **Token Exposure**: The token will be embedded in the deployed GitHub Pages site's JavaScript files. While this enables client-side API calls, it means:
   - Anyone with access to the Pages site can see the token in the source code
   - The token should have minimal permissions (read-only access to Actions)
   - Consider the sensitivity of your workflow data

2. **Alternatives for Higher Security**:
   - Use a backend proxy service to handle API calls
   - Implement OAuth flow for user authentication
   - Use GitHub Pages with authentication enabled (enterprise feature)

3. **Best Practices**:
   - Use fine-grained tokens with minimal scope
   - Set short expiration periods and rotate tokens regularly
   - Monitor token usage in GitHub's security settings
   - Only grant access to repositories you want to monitor

## Testing

After configuration:

1. Push your changes to the main branch
2. The `deploy-dashboard.yml` workflow will run
3. Once deployed, visit your GitHub Pages URL
4. The dashboard should load and display workflow statuses
5. Check browser console for any errors

## Troubleshooting

### "Configuration Required" message appears

- Check that the `DASHBOARD_TOKEN` secret is set correctly
- Verify the deployment workflow ran successfully
- Check that the token replacement in config.js worked

### "Authentication failed" errors

- Verify the token is valid and hasn't expired
- Check that the token has the correct permissions
- For GitHub App: ensure the app is installed on the correct repositories

### "Workflow not found" errors

- Verify the repository owner, name, and workflow file names in `config.js`
- Check that the token has access to those repositories
- Ensure the workflow files exist in the repositories

### Rate Limiting

- GitHub API has rate limits (5,000 requests/hour for authenticated requests)
- The dashboard auto-refreshes every 5 minutes by default
- For many workflows, consider increasing the refresh interval in `dashboard.js`

## Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify your token permissions in GitHub settings
3. Review the GitHub Actions logs for the deployment workflow
4. Consult the [GitHub API documentation](https://docs.github.com/en/rest/actions)
