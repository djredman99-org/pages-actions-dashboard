# GitHub Pages Setup Guide

This guide explains how to configure GitHub Pages for the GitHub Actions Dashboard, including why we use Pages and how to set it up correctly.

## Why GitHub Pages?

We use GitHub Pages as our hosting platform for several important reasons:

### 🔐 Free Authentication with GitHub

The most significant benefit of using GitHub Pages is **built-in authentication**:

- **Public repositories**: Anyone can access the dashboard at `https://{owner}.github.io/{repo}/`
- **Private repositories**: Users **must authenticate with GitHub** to access the dashboard
- **Internal repositories**: Users **must authenticate with GitHub** to access the dashboard

### 🔒 Access Control

For private and internal repositories, GitHub Pages provides automatic access control:

- Users must be **signed in to GitHub** to view the dashboard
- Users must have **read access or higher** to the repository hosting the Pages site
- No additional authentication layer needed - it's handled by GitHub automatically
- Access is controlled through standard GitHub repository permissions

This means:
- ✅ Team members with repository access can view the dashboard
- ✅ You can manage access through GitHub's permission system
- ✅ No need to implement custom authentication
- ❌ Users without repository access cannot view the dashboard, even if they know the URL

### 💰 Cost-Effective

- GitHub Pages is free for public repositories
- GitHub Pages is included with all GitHub plans for private/internal repositories
- No additional hosting costs beyond your existing GitHub subscription

## Prerequisites

Before configuring Pages, ensure you have:

1. ✅ Completed the Azure Function backend setup (see [AZURE_SETUP.md](AZURE_SETUP.md))
2. ✅ Added `AZURE_FUNCTION_URL` secret to your repository
3. ✅ The `.github/workflows/deploy-dashboard.yml` workflow file in your repository

## Step-by-Step Setup

### Step 1: Enable GitHub Pages

1. Navigate to your repository on GitHub
2. Click **Settings** (in the repository, not your account)
3. In the left sidebar, scroll down and click **Pages** (under "Code and automation")

### Step 2: Configure the Source

This is the **critical step** - you must select the correct deployment source:

1. Under **"Build and deployment"**, find the **"Source"** dropdown
2. Select **"GitHub Actions"** from the dropdown

   ⚠️ **Important**: Do NOT select "Deploy from a branch"
   
   **Why?** We control the build process with our custom workflow (`.github/workflows/deploy-dashboard.yml`). This workflow:
   - Injects the Azure Function URL from repository secrets
   - Builds the Pages site with the correct configuration
   - Deploys to GitHub Pages automatically

3. You should see a message: **"Use GitHub Actions workflows to build and deploy"**

![Pages Source Configuration](https://docs.github.com/assets/cb-47267/mw-1440/images/help/pages/github-actions-source.webp)

### Step 3: Save and Wait

1. The configuration is saved automatically when you select "GitHub Actions"
2. GitHub Pages is now enabled for your repository

### Step 4: Trigger Deployment

The Pages site deploys automatically when:
- You push to the `main` branch
- You manually trigger the `deploy-dashboard.yml` workflow

To trigger your first deployment:

**Option A: Push to main**
```bash
git push origin main
```

**Option B: Manual workflow dispatch**
1. Go to **Actions** tab in your repository
2. Click **"Deploy Dashboard to GitHub Pages"** workflow
3. Click **"Run workflow"** → Select `main` branch → **"Run workflow"**

### Step 5: Monitor Deployment

1. Go to the **Actions** tab in your repository
2. Click on the running **"Deploy Dashboard to GitHub Pages"** workflow
3. Monitor the progress:
   - ✅ **Build** job: Injects configuration and prepares the site
   - ✅ **Deploy** job: Publishes to GitHub Pages

### Step 6: Access Your Dashboard

Once deployment completes (usually 1-2 minutes):

1. Your dashboard will be available at:
   ```
   https://{owner}.github.io/{repo-name}/
   ```
   
   For example: `https://djredman99-org.github.io/pages-actions-dashboard/`

2. **For private/internal repos**: You'll be prompted to sign in to GitHub if not already authenticated

3. The dashboard should load and display your configured workflows

## Verifying Your Setup

### Check Pages Settings

1. Go to **Settings** → **Pages**
2. You should see:
   - Source: **GitHub Actions** ✅
   - A link to your live site
   - Deployment status

### Check Workflow Runs

1. Go to **Actions** tab
2. Find recent runs of **"Deploy Dashboard to GitHub Pages"**
3. Ensure the latest run succeeded with green checkmarks ✅

### Test Authentication (Private/Internal Repos Only)

1. Open an incognito/private browser window
2. Navigate to your Pages URL
3. You should be prompted to sign in to GitHub
4. After signing in with an account that has repository access, the dashboard should load
5. Try with an account that does NOT have access - you should see a 404 error

## Troubleshooting

### Issue: "404 - Not Found" when accessing Pages URL

**Possible Causes**:
1. Deployment hasn't completed yet
2. Pages source not set to "GitHub Actions"
3. Workflow hasn't run successfully

**Solution**:
```bash
# Check workflow status
gh run list --workflow=deploy-dashboard.yml --limit 5

# Manually trigger deployment
gh workflow run deploy-dashboard.yml
```

Or via GitHub UI:
1. Go to **Actions** tab
2. Check if the deployment workflow succeeded
3. If no runs exist, click **"Deploy Dashboard to GitHub Pages"** → **"Run workflow"**

### Issue: Pages shows old content

**Cause**: Browser cache or deployment not completed

**Solution**:
1. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Check Actions tab to ensure latest deployment completed
3. Wait 1-2 minutes for CDN propagation

### Issue: "Source should be GitHub Actions, not Deploy from a branch"

**Cause**: Incorrect Pages source configuration

**Solution**:
1. Go to **Settings** → **Pages**
2. Change **Source** from "Deploy from a branch" to **"GitHub Actions"**
3. Re-trigger the workflow:
   ```bash
   git commit --allow-empty -m "Trigger Pages deployment"
   git push
   ```

### Issue: Workflow fails with "AZURE_FUNCTION_URL secret not found"

**Cause**: Repository secret not configured

**Solution**:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add secret:
   - Name: `AZURE_FUNCTION_URL`
   - Value: `https://<your-function-app>.azurewebsites.net`
3. Re-run the failed workflow

### Issue: Dashboard loads but shows "Configuration Required"

**Cause**: Azure Function URL not properly injected during deployment

**Solution**:
1. Verify the `AZURE_FUNCTION_URL` secret is set correctly (base URL only, no path)
2. Check the workflow logs for "Azure Function URL injection completed"
3. Re-run the deployment workflow

### Issue: Authentication loop (keeps redirecting to sign-in)

**Cause**: User doesn't have repository access (private/internal repos)

**Solution**:
1. Verify the user has at least **read** access to the repository
2. Go to **Settings** → **Collaborators and teams**
3. Add user or adjust team permissions
4. User should sign out of GitHub and sign back in

### Issue: "gh-pages branch required" error

**Cause**: You might have old Pages configuration expecting a branch

**Solution**:
1. Go to **Settings** → **Pages**
2. Ensure Source is set to **"GitHub Actions"**, NOT "Deploy from a branch"
3. You do NOT need a `gh-pages` branch when using GitHub Actions deployment

## Advanced Configuration

### Custom Domain

To use a custom domain with your Pages site:

1. Go to **Settings** → **Pages**
2. Under **"Custom domain"**, enter your domain (e.g., `dashboard.example.com`)
3. Follow GitHub's DNS configuration instructions
4. Enable **"Enforce HTTPS"** after DNS propagates

📖 See [GitHub's custom domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site) for details.

### Update CORS Settings

If using a custom domain, update your Azure Function CORS settings:

```bash
az functionapp cors add \
  --name <FUNCTION_APP_NAME> \
  --resource-group <RESOURCE_GROUP_NAME> \
  --allowed-origins "https://dashboard.example.com"
```

### Environment-Specific Pages

To maintain separate Pages sites for different environments:

1. Create separate repositories (e.g., `dashboard-dev`, `dashboard-prod`)
2. Configure each with its own `AZURE_FUNCTION_URL` secret
3. Each will have its own Pages URL

## Security Considerations

### Access Control Best Practices

✅ **Do**:
- Use private repositories for sensitive dashboards
- Regularly audit repository access (Settings → Collaborators)
- Use team-based permissions for easier management
- Enable branch protection rules for `main` branch

❌ **Don't**:
- Share the Pages URL publicly if your repository is private
- Grant repository access to untrusted users just for dashboard access
- Disable GitHub authentication requirements

### Understanding Visibility

- **Public repository** → Public Pages site (anyone can access)
- **Private repository** → Private Pages site (authentication required)
- **Internal repository** → Internal Pages site (organization members only)

⚠️ **Note**: Changing repository visibility affects Pages accessibility:
- Making a repo public will make the Pages site public
- Making a repo private will require authentication for the Pages site

## Next Steps

After setting up Pages:

1. ✅ Configure workflow monitoring in `workflows.json` - see [AZURE_SETUP.md](AZURE_SETUP.md#step-6-upload-workflow-configuration)
2. ✅ Customize themes - see [pages/THEMES.md](pages/THEMES.md)
3. ✅ Monitor Azure Function costs - see [DEPLOYMENT_NOTES.md](DEPLOYMENT_NOTES.md#monitoring)
4. ✅ Set up Application Insights alerts - see [DEPLOYMENT_NOTES.md](DEPLOYMENT_NOTES.md#alerts-to-configure)

## Related Documentation

- **[AZURE_SETUP.md](AZURE_SETUP.md)** - Azure Function backend setup
- **[DEPLOYMENT_NOTES.md](DEPLOYMENT_NOTES.md)** - Deployment checklist and monitoring
- **[README.md](README.md)** - General overview and features

## Support

For issues related to GitHub Pages setup:
- Check [GitHub Pages documentation](https://docs.github.com/en/pages)
- Review [GitHub Actions documentation](https://docs.github.com/en/actions)
- Open an issue in this repository with the `documentation` label
