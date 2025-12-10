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

### 2. Configure Your Dashboard

Edit `config.js`:

1. Replace `YOUR_TOKEN_HERE` with your Personal Access Token:
```javascript
token: 'github_pat_your_actual_token_here',
```

2. Configure your workflows:
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

### 3. Deploy to GitHub Pages

1. Push your changes to the repository
2. Go to repository Settings → Pages
3. Under "Source", select your branch (usually `main`)
4. Click "Save"
5. Your dashboard will be available at `https://{your-username}.github.io/pages-actions-dashboard/`

GitHub Pages will automatically build and deploy your site whenever you push changes.

## Configuration

### Workflow Configuration

Edit `config.js` to add or remove workflows:

```javascript
const DASHBOARD_CONFIG = {
    github: {
        token: 'YOUR_TOKEN_HERE',  // Replace with your PAT
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
2. **config.js**: Configuration for workflows and GitHub API (includes your PAT)
3. **api.js**: GitHub API client for fetching workflow statuses
4. **dashboard.js**: Dashboard loader that renders workflow cards

The dashboard is a static site that runs entirely in the browser. GitHub Pages automatically builds and deploys it from your repository.

## Security Considerations

⚠️ **Important**: The GitHub token is embedded in the `config.js` file and deployed with the site. This means:

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
- Check that you replaced `YOUR_TOKEN_HERE` in `config.js` with your actual token
- Verify the changes were pushed to your repository
- Clear your browser cache and reload the page

### Authentication errors
- Verify your token is valid and hasn't expired
- Check token permissions include `actions:read`
- For private repos, ensure the token has access to those repositories
- Make sure the token is correctly pasted in `config.js` (no extra spaces or quotes)

### Workflow not found errors
- Verify repository owner, name, and workflow file in `config.js`
- Ensure workflow files exist in the specified repositories
- Check that the token has access to those repositories

### Changes not appearing
- GitHub Pages may take a few minutes to rebuild after pushing changes
- Check the Actions tab for any build errors
- Clear your browser cache and do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Migrating from Badge-Based Dashboard

If you're upgrading from the old badge-based dashboard:

1. Your existing workflow links will continue to work
2. Update `config.js` with your workflow definitions
3. Set up authentication (see SETUP.md)
4. The new dashboard will fetch live statuses instead of using static badge images
5. Private and internal repositories will now work correctly

## License

MIT