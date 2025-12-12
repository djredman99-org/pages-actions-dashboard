# Migration Guide: Moving to Azure Function Backend

This guide helps you migrate from the legacy Personal Access Token (PAT) architecture to the new Azure Function backend.

## Why Migrate?

### Security Benefits

**Legacy Architecture Issues:**
- ❌ GitHub token embedded in deployed JavaScript (visible in browser)
- ❌ Token exposed to anyone who can view page source
- ❌ Requires build-time token injection
- ❌ Limited to Personal Access Tokens

**New Architecture Benefits:**
- ✅ GitHub credentials never exposed to browser
- ✅ Server-side authentication using GitHub Apps
- ✅ Managed Identity for Azure resource access
- ✅ No credentials in code or configuration
- ✅ Centralized workflow management in Azure Storage
- ✅ Enterprise-grade security

## Migration Steps

### Phase 1: Deploy Azure Infrastructure

1. **Create GitHub App** (see [AZURE_SETUP.md](AZURE_SETUP.md) for details):
   - Go to GitHub organization settings → Developer settings → GitHub Apps
   - Create new app with Actions: Read-only permission
   - Generate and download private key
   - Install app on your repositories
   - Save App ID

2. **Deploy Azure Resources**:
   ```bash
   cd infrastructure
   cp parameters.example.json parameters.json
   # Edit parameters.json with your GitHub App credentials
   ./deploy.sh
   ```

3. **Deploy Function App Code**:
   ```bash
   cd ../function-app
   npm install
   func azure functionapp publish <FUNCTION_APP_NAME>
   ```

4. **Upload Workflow Configuration**:
   ```bash
   # Create workflows.json from your existing config.js
   az storage blob upload \
     --account-name <STORAGE_ACCOUNT_NAME> \
     --container-name workflow-configs \
     --name workflows.json \
     --file workflows.json \
     --auth-mode login
   ```

### Phase 2: Update Repository Configuration

1. **Add New Secret**:
   - Go to repository Settings → Secrets and variables → Actions
   - Add new secret: `AZURE_FUNCTION_URL`
   - Value: `https://<FUNCTION_APP_NAME>.azurewebsites.net` (from deployment outputs)

2. **Keep Old Secret** (temporarily):
   - Keep `DASHBOARD_TOKEN` secret for now (for rollback if needed)

### Phase 3: Deploy Updated Pages Site

1. **Merge the PR** with Azure Function changes
2. **Deployment workflow** will automatically:
   - Inject `AZURE_FUNCTION_URL` instead of `DASHBOARD_TOKEN`
   - Deploy updated pages site
3. **Verify** the dashboard loads correctly

### Phase 4: Cleanup (After Verification)

Once you've verified the new system works:

1. **Remove old secret** (optional):
   - Delete `DASHBOARD_TOKEN` repository secret
   - This token is no longer needed

2. **Revoke old token** (recommended):
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Revoke the old dashboard token

## Converting config.js to workflows.json

### Old Format (config.js)

```javascript
const DASHBOARD_CONFIG = {
    github: {
        token: '__GITHUB_TOKEN__',
        apiBaseUrl: 'https://api.github.com',
        debug: false
    },
    workflows: [
        {
            owner: 'your-org',
            repo: 'your-repo',
            workflow: 'ci.yml',
            label: 'CI Build'
        },
        {
            owner: 'your-org',
            repo: 'your-repo',
            workflow: 'tests.yml',
            label: 'Tests'
        }
    ]
};
```

### New Format (workflows.json)

```json
[
  {
    "owner": "your-org",
    "repo": "your-repo",
    "workflow": "ci.yml",
    "label": "CI Build"
  },
  {
    "owner": "your-org",
    "repo": "your-repo",
    "workflow": "tests.yml",
    "label": "Tests"
  }
]
```

**Conversion Script:**

```javascript
// Run this in browser console on your current dashboard
const workflows = DASHBOARD_CONFIG.workflows.map(w => ({
    owner: w.owner,
    repo: w.repo,
    workflow: w.workflow,
    label: w.label
}));
console.log(JSON.stringify(workflows, null, 2));
```

Copy the output and save it as `workflows.json`.

## Rollback Plan

If you need to rollback to the old system:

### Option 1: Revert the PR

1. Revert the pull request that introduced Azure Function changes
2. Redeploy using the old workflow

### Option 2: Use Previous Deployment

1. Go to Actions tab in GitHub
2. Find the last successful deployment before migration
3. Click "Re-run jobs"

### Option 3: Manual Rollback

1. Checkout previous commit:
   ```bash
   git checkout <PREVIOUS_COMMIT_HASH>
   ```

2. Update config.js to use old format
3. Push to trigger deployment

## Testing Checklist

Before considering migration complete, verify:

- [ ] Dashboard loads without errors
- [ ] All configured workflows appear on dashboard
- [ ] Workflow statuses are accurate
- [ ] Status badges show correct colors
- [ ] Clicking workflow cards navigates to correct GitHub pages
- [ ] Auto-refresh works (wait 5 minutes)
- [ ] Browser console shows no errors
- [ ] Multiple page reloads work correctly

## Troubleshooting

### Dashboard shows "Configuration Required"

**Problem**: Azure Function URL not configured

**Solution**:
1. Verify `AZURE_FUNCTION_URL` secret exists in repository
2. Check deployment workflow succeeded
3. View deployed `config.js` to verify URL was injected

### Dashboard shows "No Workflows Configured"

**Problem**: workflows.json not uploaded to Azure Storage

**Solution**:
```bash
az storage blob upload \
  --account-name <STORAGE_ACCOUNT_NAME> \
  --container-name workflow-configs \
  --name workflows.json \
  --file workflows.json \
  --auth-mode login
```

### Azure Function returns 500 error

**Problem**: Function configuration or permissions issue

**Solution**:
1. Check Function App logs:
   ```bash
   az functionapp log tail \
     --name <FUNCTION_APP_NAME> \
     --resource-group <RESOURCE_GROUP_NAME>
   ```

2. Verify secrets exist in Key Vault:
   ```bash
   az keyvault secret list --vault-name <KEY_VAULT_NAME>
   ```

3. Verify RBAC permissions are assigned

### Workflows show "error" status

**Problem**: GitHub App not installed or lacks permissions

**Solution**:
1. Verify GitHub App is installed on the organization
2. Check App has "Actions: Read" permission
3. Verify App installation includes all needed repositories

### "No installation found" in logs

**Problem**: GitHub App not installed on organization/repositories

**Solution**:
1. Go to GitHub App settings
2. Click "Install App"
3. Install on organization containing the repositories

## Comparing Architectures

### Data Flow Comparison

**Legacy Architecture:**
```
Browser → (with embedded token) → GitHub API → Response → Browser
```

**New Architecture:**
```
Browser → Azure Function → (Key Vault for creds) → GitHub API → Response → Browser
```

### Cost Comparison

**Legacy:** Free (using GitHub Pages only)

**New:** ~$5-10/month
- Azure Function: ~$1-2/month (Consumption plan)
- Storage: <$1/month
- Key Vault: ~$1/month
- Application Insights: Included

**Note**: The security benefits typically outweigh the minimal cost.

## Best Practices Post-Migration

1. **Monitor Function Usage**:
   - Set up Azure Monitor alerts for failures
   - Review Application Insights regularly

2. **Update Workflows**:
   - Use Azure CLI or Storage Explorer to update workflows.json
   - No redeployment needed for workflow changes

3. **Rotate GitHub App Key**:
   - Generate new private key periodically
   - Update Key Vault secret:
     ```bash
     az keyvault secret set \
       --vault-name <KEY_VAULT_NAME> \
       --name github-app-private-key \
       --file new-key.pem
     ```

4. **Monitor Costs**:
   - Set up Azure cost alerts
   - Review monthly spending in Azure Portal

5. **Keep Documentation Updated**:
   - Document your specific configuration
   - Note any custom modifications

## Getting Help

If you encounter issues during migration:

1. Check the [AZURE_SETUP.md](AZURE_SETUP.md) for detailed setup instructions
2. Review [function-app/README.md](function-app/README.md) for function-specific issues
3. Check [infrastructure/README.md](infrastructure/README.md) for infrastructure issues
4. Open an issue in the GitHub repository with:
   - Description of the problem
   - Steps you've already tried
   - Relevant error messages or logs
   - Your environment (Azure region, resource names, etc.)

## Success Indicators

You'll know migration is successful when:

- ✅ Dashboard loads and displays workflow statuses
- ✅ No errors in browser console
- ✅ Azure Function logs show successful requests
- ✅ Application Insights shows function executions
- ✅ No GitHub token visible in page source
- ✅ Workflow updates (in Azure Storage) reflect on dashboard without redeployment

## Timeline

Typical migration timeline:

- **Phase 1 (Azure Setup)**: 30-60 minutes
- **Phase 2 (Configuration)**: 15-30 minutes
- **Phase 3 (Deployment)**: 5-10 minutes
- **Phase 4 (Verification)**: 15-30 minutes

**Total**: 1-2 hours for complete migration

## Support

For questions or issues:
- Review documentation in this repository
- Check Azure documentation for Azure-specific issues
- Open GitHub issues for dashboard-specific problems
