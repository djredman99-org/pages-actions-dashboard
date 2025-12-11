# GitHub Actions Dashboard

A GitHub Pages site that serves as a centralized dashboard for monitoring GitHub Actions workflow statuses across multiple repositories, **including private and internal repositories**.

## Features

- **5-Column Grid Layout**: Displays workflow statuses in a clean, organized grid (5 across, responsive)
- **Multi-Repository Support**: Monitor workflows from any GitHub repository (public, private, or internal)
- **Dynamic Status Indicators**: Real-time workflow status with color-coded badges (green for passing, red for failing, yellow for running)
- **GitHub API Integration**: Fetches live workflow statuses using authenticated GitHub API calls
- **Customizable Configuration**: Easy JSON-based configuration for adding/removing workflows
- **Responsive Design**: Adapts to different screen sizes (desktop, tablet, mobile)
- **Auto-Refresh**: Automatically refreshes workflow statuses every 5 minutes
- **Professional Styling**: Modern, clean interface with hover effects
- **Fully Clickable Workflow Cards**: Click anywhere on a workflow card to navigate to its workflow runs page
- **Accessible Keyboard Navigation**: Navigate and activate workflow cards using Tab and Enter keys with visible focus indicators

## New: Private Repository Support

Unlike static badge images, this dashboard uses the GitHub API to fetch workflow statuses, enabling it to work with:
- ✅ Public repositories
- ✅ Private repositories
- ✅ Internal repositories (GitHub Enterprise)

See [SETUP.md](SETUP.md) for detailed configuration instructions.

## Quick Start

### 1. Create a Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Configure the token:
   - **Token name**: `Actions Dashboard`
   - **Expiration**: Choose your preferred duration
   - **Repository access**: Select the repositories you want to monitor
   - **Permissions** → Repository permissions:
     - **Actions**: Read-only
     - **Metadata**: Read-only (automatically granted)
4. Click "Generate token" and copy it

### 2. Store Token as Repository Secret

1. Go to your repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `DASHBOARD_TOKEN`
4. Value: Paste your Personal Access Token
5. Click "Add secret"

### 3. Configure Your Workflows

Edit `pages/config.js` to specify which workflows to monitor:

```javascript
workflows: [
    {
        owner: 'your-org',
        repo: 'your-repo',
        workflow: 'ci.yml',
        label: 'CI Build'
    },
    // Add more workflows...
]
```

### 4. Deploy to GitHub Pages

The dashboard automatically deploys when you push to the main branch:

1. The `deploy-dashboard.yml` workflow runs automatically
2. It injects your `DASHBOARD_TOKEN` into the configuration
3. Deploys the site to GitHub Pages

Your dashboard will be available at `https://{your-username}.github.io/pages-actions-dashboard/`

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

## Architecture

The dashboard consists of:

1. **pages/index.html**: Main HTML page with styling
2. **pages/config.js**: Configuration for workflows and GitHub API
3. **pages/api.js**: GitHub API client for fetching workflow statuses
4. **pages/dashboard.js**: Dashboard loader that renders workflow cards
5. **.github/workflows/deploy-dashboard.yml**: Deployment workflow that injects the token

### How It Works

1. You store your PAT as a repository secret (`DASHBOARD_TOKEN`)
2. When you push to main, the deploy workflow runs
3. The workflow injects your token into `pages/config.js` at build time
4. The modified site is deployed to GitHub Pages
5. The dashboard uses the injected token to fetch workflow statuses

## Security Considerations

⚠️ **Important**: The GitHub token is embedded in the deployed site's JavaScript. This means:

- **The token is visible** in the browser's source code to anyone who can access your GitHub Pages site
- **Use tokens with minimal permissions**: Only grant `actions:read` permission
- **Limit repository access**: Use fine-grained tokens and only grant access to the specific repositories you want to monitor
- **Set expiration dates**: Configure tokens to expire and rotate them regularly
- **Monitor token usage**: Check GitHub's token usage logs regularly

### When to Use This Approach

✅ **Good for:**
- Internal dashboards where the Pages site has the same access restrictions as the repositories
- Monitoring non-sensitive workflow statuses
- Testing and development environments

⚠️ **Consider alternatives for:**
- Public Pages sites monitoring private repositories with sensitive data
- Production environments with strict security requirements

### Higher Security Alternatives

For higher security requirements, consider:
- Implementing a backend proxy service to keep tokens server-side
- Using OAuth flow for user authentication
- Restricting GitHub Pages access (Enterprise feature)
- See [SETUP.md](SETUP.md) for more details

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