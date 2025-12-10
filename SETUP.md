# Setup Guide

This guide explains how to set up authentication for the GitHub Actions Dashboard to work with private and internal repositories.

## Overview

The dashboard uses the GitHub API to fetch workflow statuses. To access workflows in private and internal repositories, you need to authenticate using a **Personal Access Token (PAT)**.

The token is directly embedded in the `config.js` file that gets deployed with your GitHub Pages site.

## Creating a Personal Access Token

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

### Step 2: Add Token to Configuration

1. Open `config.js` in your repository
2. Find the line: `token: 'YOUR_TOKEN_HERE',`
3. Replace `YOUR_TOKEN_HERE` with your actual token:
   ```javascript
   token: 'github_pat_11AAAAAA...',
   ```
4. Save the file

### Step 3: Configure Your Workflows

Edit the `workflows` array in `config.js` to specify which workflows you want to monitor:

```javascript
workflows: [
    {
        owner: 'your-org',
        repo: 'your-repo',
        workflow: 'ci.yml',
        label: 'CI Build'
    },
    {
        owner: 'your-org',
        repo: 'another-repo',
        workflow: 'tests.yml',
        label: 'Tests'
    }
]
```

## Deployment

Once you've configured the token and workflows:

1. Commit and push your changes to the repository
2. GitHub Pages will automatically build and deploy your site
3. The dashboard will use the token to authenticate API requests

## Security Considerations

⚠️ **Important Security Notes:**

1. **Token Exposure**: The token is embedded directly in the `config.js` file that gets deployed to GitHub Pages:
   - Anyone with access to your Pages site can view the token in the browser's source code
   - Anyone with the token can access workflow information from the repositories you've granted access to
   - The token should have minimal permissions (read-only access to Actions only)

2. **Best Practices**:
   - **Use fine-grained tokens**: Only grant access to specific repositories you want to monitor
   - **Minimal permissions**: Only enable `actions:read` permission
   - **Set expiration dates**: Configure tokens to expire after a reasonable period (e.g., 90 days)
   - **Rotate regularly**: Generate new tokens and update your config periodically
   - **Monitor usage**: Check GitHub's token usage logs in Settings → Developer settings
   - **Consider your Pages visibility**: 
     - If your Pages site is public, anyone on the internet can see your token
     - If your Pages site is from a private repo, only users with repo access can see it

3. **When This Approach Works Well**:
   - ✅ Internal dashboards where Pages site has same access as repos
   - ✅ Monitoring non-sensitive workflow information
   - ✅ Development and testing environments
   - ✅ Private Pages site (from private repo) with restricted access

4. **Alternatives for Higher Security**:
   - Implement a backend proxy service to keep tokens server-side
   - Use OAuth flow for per-user authentication
   - Deploy to a platform with server-side rendering
   - Use GitHub Enterprise with Pages authentication

## Testing

After configuration:

1. Commit and push your changes to your repository
2. Go to Settings → Pages and ensure GitHub Pages is enabled
3. Wait a few minutes for GitHub Pages to build and deploy
4. Visit your GitHub Pages URL (shown in Settings → Pages)
5. The dashboard should load and display workflow statuses with color-coded badges
6. Check the browser console (F12) for any errors

### Verifying It Works

- ✅ You should see workflow cards with colored status badges (green, red, yellow, or gray)
- ✅ Clicking a card should take you to that workflow's runs page
- ✅ The "Last updated" time should show the current time
- ❌ If you see "Configuration Required", double-check your token in `config.js`

## Troubleshooting

### "Configuration Required" message appears

- Verify you replaced `YOUR_TOKEN_HERE` with your actual token in `config.js`
- Make sure there are no extra spaces or quotes around the token
- Check that you committed and pushed the changes
- Wait a few minutes for GitHub Pages to rebuild, then hard refresh your browser (Ctrl+Shift+R)

### "Authentication failed" errors

- Verify the token is valid and hasn't expired (check GitHub Settings → Developer settings)
- Confirm the token has `actions:read` permission
- For private repos, ensure the token has access to those specific repositories
- Try regenerating the token if issues persist

### "Workflow not found" errors

- Verify the repository owner, name, and workflow file names in `config.js` match exactly
- Check that workflow files exist in `.github/workflows/` in those repositories
- Ensure the token has access to those repositories (check token's repository access settings)
- Verify the workflow file name includes the `.yml` or `.yaml` extension

### Changes not showing up

- GitHub Pages can take 1-5 minutes to rebuild after pushing changes
- Check the Actions tab in your repository for build status
- Do a hard refresh in your browser (Ctrl+Shift+R or Cmd+Shift+R)
- Clear your browser cache if issues persist

### Rate Limiting

- GitHub API has rate limits (5,000 requests/hour for authenticated requests)
- The dashboard auto-refreshes every 5 minutes by default
- Each page load makes one API call per workflow
- For many workflows (20+), consider increasing the refresh interval in `dashboard.js`:
  ```javascript
  dashboard.setupAutoRefresh(10); // Change to 10 minutes
  ```

## Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify your token permissions in GitHub settings
3. Review the GitHub Actions logs for the deployment workflow
4. Consult the [GitHub API documentation](https://docs.github.com/en/rest/actions)
