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

### 1. Set Up Authentication

The dashboard requires a GitHub token to access workflow information. You have two options:

**Option A: Personal Access Token (Simpler)**
1. Create a fine-grained Personal Access Token with `actions:read` permission
2. Add it as a repository secret named `DASHBOARD_TOKEN`

**Option B: GitHub App (Recommended for Organizations)**
1. Create a GitHub App with `actions:read` permission
2. Install the app on your repositories
3. Generate an installation access token
4. Add it as a repository secret named `DASHBOARD_TOKEN`

👉 See [SETUP.md](SETUP.md) for detailed step-by-step instructions.

### 2. Configure Your Workflows

Edit `config.js` to specify which workflows to monitor:

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

### 3. Deploy

The dashboard automatically deploys to GitHub Pages when you push to the main branch. The `deploy-dashboard.yml` workflow:
1. Injects your token into the configuration
2. Deploys the site to GitHub Pages

### 4. View Your Dashboard

Once deployed, visit: `https://{your-username}.github.io/pages-actions-dashboard/`

## Configuration

### Workflow Configuration

Edit `config.js` to add or remove workflows:

```javascript
const DASHBOARD_CONFIG = {
    github: {
        token: '__GITHUB_TOKEN__', // Replaced at build time
        apiBaseUrl: 'https://api.github.com'
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

By default, the dashboard refreshes workflow statuses every 5 minutes. To change this, edit `dashboard.js`:

```javascript
// Set up auto-refresh every 10 minutes instead
dashboard.setupAutoRefresh(10);
```

## Architecture

The dashboard consists of:

1. **index.html**: Main HTML page with styling
2. **config.js**: Configuration for workflows and GitHub API
3. **api.js**: GitHub API client for fetching workflow statuses
4. **dashboard.js**: Dashboard loader that renders workflow cards
5. **.github/workflows/deploy-dashboard.yml**: Deployment workflow that injects the token

## Security Considerations

⚠️ **Important**: The GitHub token is embedded in the deployed site's JavaScript. While this enables client-side API calls for private repos:

- The token is visible in the browser's source code
- Anyone with access to the GitHub Pages site can see it
- Use tokens with minimal permissions (read-only access to Actions)
- Consider the sensitivity of your workflow data

For higher security requirements, consider:
- Implementing a backend proxy service
- Using OAuth flow for user authentication
- Restricting GitHub Pages access (Enterprise feature)

## Troubleshooting

### Dashboard shows "Configuration Required"
- Ensure `DASHBOARD_TOKEN` secret is set in repository settings
- Check that the deployment workflow completed successfully
- Verify the token was injected correctly in the deployed `config.js`

### Authentication errors
- Verify your token is valid and hasn't expired
- Check token permissions include `actions:read`
- For private repos, ensure the token has access to those repositories

### Workflow not found errors
- Verify repository owner, name, and workflow file in `config.js`
- Ensure workflow files exist in the specified repositories
- Check that the token has access to those repositories

See [SETUP.md](SETUP.md) for more troubleshooting tips.

## Migrating from Badge-Based Dashboard

If you're upgrading from the old badge-based dashboard:

1. Your existing workflow links will continue to work
2. Update `config.js` with your workflow definitions
3. Set up authentication (see SETUP.md)
4. The new dashboard will fetch live statuses instead of using static badge images
5. Private and internal repositories will now work correctly

## License

MIT