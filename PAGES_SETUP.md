# GitHub Pages Configuration

> **Note:** This guide is part of the overall setup process. See [SETUP.md](SETUP.md) for the complete setup guide.

This guide explains how to configure GitHub Pages for the GitHub Actions Dashboard.

## Why GitHub Pages?

GitHub Pages provides several important benefits:

### 🔐 Built-in Authentication

- **Public repositories**: Anyone can access the dashboard
- **Private/Internal repositories**: Users must authenticate with GitHub to access the dashboard
- **Access Control**: Managed through GitHub repository permissions

### 💰 Cost-Effective

- Free for public repositories
- Included with GitHub plans for private/internal repositories
- No additional hosting costs

## Configuration Steps

### 1. Enable GitHub Pages

1. Go to your repository → **Settings** → **Pages**
2. Under **"Build and deployment"** → **"Source"**, select **"GitHub Actions"**
3. Configuration is saved automatically

⚠️ **Important:** Do NOT select "Deploy from a branch" - we use a custom workflow that injects configuration during build.

### 2. Trigger Deployment

The dashboard deploys automatically when:
- You push to the `main` branch
- You manually trigger the deploy workflow

**Manual trigger:**
1. Go to **Actions** tab
2. Click **"Deploy Dashboard to GitHub Pages"**
3. Click **"Run workflow"** → Select `main` branch → **"Run workflow"**

### 3. Access Your Dashboard

Once deployment completes (1-2 minutes):
- Dashboard URL: `https://{owner}.github.io/{repo-name}/`
- For private/internal repos: Sign in to GitHub when prompted

## Troubleshooting

### Dashboard Shows 404

**Causes:**
- Deployment hasn't completed yet
- Pages source not set to "GitHub Actions"
- Workflow hasn't run successfully

**Solution:**
1. Check Actions tab for workflow status
2. Verify Settings → Pages → Source is "GitHub Actions"
3. Manually trigger the deployment workflow if needed

### Dashboard Shows "Configuration Required"

**Cause:** Azure Function URL not configured

**Solution:**
1. Verify `AZURE_FUNCTION_URL` secret is set in repository settings
2. Check the Pages deployment workflow completed successfully
3. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

### Workflow Fails with Secret Not Found

**Cause:** `AZURE_FUNCTION_URL` secret not configured

**Solution:**
1. Go to Settings → Secrets and variables → Actions
2. Add secret:
   - Name: `AZURE_FUNCTION_URL`
   - Value: `https://your-function-app.azurewebsites.net` (base URL only)
3. Re-run the workflow

### Authentication Loop (Private/Internal Repos)

**Cause:** User doesn't have repository access

**Solution:**
1. Verify user has at least **read** access to the repository
2. Go to Settings → Collaborators and teams
3. Add user or adjust permissions
4. User should sign out and back into GitHub

## Advanced Configuration

### Custom Domain

To use a custom domain:

1. Go to Settings → Pages
2. Under "Custom domain", enter your domain (e.g., `dashboard.example.com`)
3. Follow GitHub's DNS configuration instructions
4. Enable "Enforce HTTPS" after DNS propagates

**Update Function App CORS:**
```bash
az functionapp cors add \
  --name FUNCTION_APP_NAME \
  --resource-group RESOURCE_GROUP_NAME \
  --allowed-origins "https://dashboard.example.com"
```

### Environment-Specific Deployments

For separate environments:

1. Create separate repositories (e.g., `dashboard-dev`, `dashboard-prod`)
2. Configure each with its own `AZURE_FUNCTION_URL` secret
3. Each will have its own Pages URL

## Security Considerations

### Access Control Best Practices

✅ **Do:**
- Use private repositories for sensitive dashboards
- Regularly audit repository access
- Use team-based permissions
- Enable branch protection for `main` branch

❌ **Don't:**
- Share the Pages URL publicly for private repositories
- Grant unnecessary repository access

### Repository Visibility Impact

- **Public repository** → Public Pages site (anyone can access)
- **Private repository** → Private Pages site (authentication required)
- **Internal repository** → Internal Pages site (organization members only)

⚠️ **Note:** Changing repository visibility affects Pages accessibility

## Related Documentation

- **[SETUP.md](SETUP.md)** - Complete setup guide
- **[AZURE_IMPLEMENTATION.md](AZURE_IMPLEMENTATION.md)** - Architecture details

## Support

For Pages-specific issues:
- Check [GitHub Pages documentation](https://docs.github.com/en/pages)
- Review [GitHub Actions documentation](https://docs.github.com/en/actions)
- See [SETUP.md](SETUP.md#troubleshooting) for general troubleshooting
