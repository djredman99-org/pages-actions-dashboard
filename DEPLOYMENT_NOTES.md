# Deployment Notes

## Important Information

### Dependabot Checker Timeout

**Note**: The Dependabot checker may timeout during CI/CD due to the npm dependencies in the function-app. This is expected and not a blocking issue. The timeout occurs because:

1. Function app has several Azure and GitHub-related npm packages
2. Dependabot needs time to analyze all dependencies
3. The analysis is optional and doesn't affect functionality

**Action**: You can safely ignore Dependabot timeout warnings. The dependencies are:
- `@azure/functions` (v4.0.0)
- `@azure/identity` (v4.0.0)
- `@azure/keyvault-secrets` (v4.7.0)
- `@azure/storage-blob` (v12.17.0)
- `@octokit/auth-app` (v6.0.0)
- `@octokit/rest` (v20.0.0)

All dependencies are using stable, recent versions and can be updated independently after deployment.

### Dependency Management

To check for updates after deployment:

```bash
cd function-app
npm outdated
npm update
```

To audit for security vulnerabilities:

```bash
cd function-app
npm audit
npm audit fix  # Apply automatic fixes if available
```

### GitHub Actions Workflows

The implementation does not modify existing GitHub Actions workflows except for `deploy-dashboard.yml` which now injects `AZURE_FUNCTION_URL` instead of `DASHBOARD_TOKEN`.

Other workflows in the repository remain unchanged and should continue to function normally.

## Pre-Deployment Checklist

Before deploying this solution, ensure you have:

- [ ] Azure subscription with appropriate permissions
- [ ] Azure CLI installed and configured (`az login`)
- [ ] Node.js 18+ installed
- [ ] Azure Functions Core Tools installed
- [ ] GitHub App created with:
  - [ ] App ID saved
  - [ ] Private key downloaded (.pem file)
  - [ ] App installed on target organization/repositories
  - [ ] "Actions: Read-only" permission granted
- [ ] Repository secret `AZURE_FUNCTION_URL` ready to be added

## Deployment Order

**Critical**: Follow this exact order:

1. **Deploy Azure Infrastructure** (infrastructure/deploy.sh)
   - Creates all Azure resources
   - Stores GitHub App credentials in Key Vault
   - Outputs Function App URL

2. **Deploy Function App Code** (func azure functionapp publish)
   - Deploys Node.js code to Function App
   - Installs npm dependencies on Azure

3. **Upload Workflow Configuration** (az storage blob upload)
   - Uploads workflows.json to Azure Storage
   - Defines which workflows to monitor

4. **Configure Repository Secret** (GitHub Settings)
   - Add `AZURE_FUNCTION_URL` with Function App URL

5. **Deploy Pages Site** (merge PR or push to main)
   - Automatically deploys with updated configuration

## Post-Deployment Verification

After deployment, verify:

1. **Azure Resources**:
   ```bash
   az resource list --resource-group <RESOURCE_GROUP_NAME> --output table
   ```

2. **Function Health**:
   ```bash
   curl https://<FUNCTION_APP_NAME>.azurewebsites.net/api/get-workflow-statuses
   ```
   Should return JSON with workflow statuses (or empty array if no workflows configured).

3. **Dashboard Access**:
   - Visit: `https://<your-org>.github.io/pages-actions-dashboard/`
   - Should load workflow cards
   - Check browser console for errors

4. **Application Insights**:
   - Azure Portal → Function App → Application Insights
   - Verify requests are being logged

## Rollback Procedure

If issues occur after deployment:

### Option 1: Revert PR
```bash
# Revert the merged PR commit
git revert <PR_MERGE_COMMIT_SHA>
git push
```

### Option 2: Quick Fix - Use Old Architecture
1. Restore old `DASHBOARD_TOKEN` secret
2. Revert changes to:
   - pages/config.js
   - pages/api.js
   - pages/dashboard.js
   - .github/workflows/deploy-dashboard.yml
3. Push to trigger redeployment

### Option 3: Azure Function Hotfix
If only the function has issues:
1. Fix function code
2. Redeploy: `func azure functionapp publish <FUNCTION_APP_NAME>`
3. Pages site doesn't need redeployment

## Common Issues

### Issue: Dashboard shows "Configuration Required"

**Cause**: Azure Function URL not configured

**Fix**:
1. Verify secret exists: GitHub Settings → Secrets → `AZURE_FUNCTION_URL`
2. Check deployment succeeded: Actions tab
3. View deployed config.js to verify URL was injected

### Issue: Function returns 500 error

**Cause**: Missing environment variables or RBAC permissions

**Fix**:
1. Check function logs:
   ```bash
   az functionapp log tail --name <FUNCTION_APP_NAME> --resource-group <RG>
   ```
2. Verify RBAC assignments:
   ```bash
   az role assignment list --assignee <FUNCTION_APP_PRINCIPAL_ID>
   ```

### Issue: "GitHub App authentication failed"

**Cause**: Invalid credentials in Key Vault or app not installed

**Fix**:
1. Verify secrets in Key Vault:
   ```bash
   az keyvault secret show --vault-name <VAULT> --name github-app-id
   ```
2. Verify GitHub App is installed on organization
3. Check App has "Actions: Read" permission

## Monitoring

### Key Metrics to Watch

**Function App**:
- Execution count (should increase with dashboard usage)
- Average duration (should be 1-5 seconds)
- Error rate (should be near 0%)

**Application Insights Queries**:

**Request Success Rate**:
```kusto
requests
| where operation_Name == "get-workflow-statuses"
| summarize total=count(), success=countif(resultCode < 400) by bin(timestamp, 1h)
| extend successRate = success * 100.0 / total
```

**Average Duration**:
```kusto
requests
| where operation_Name == "get-workflow-statuses"
| summarize avg(duration) by bin(timestamp, 1h)
```

### Alerts to Configure

Recommended Azure Monitor alerts:

1. **Function Errors**:
   - Condition: Failed requests > 5 in 5 minutes
   - Action: Email/Teams notification

2. **Function Duration**:
   - Condition: Average duration > 10 seconds
   - Action: Email notification

3. **Azure Costs**:
   - Condition: Daily cost > $1
   - Action: Email notification

## Cost Management

### Expected Monthly Costs

For typical usage (10-20 workflows, auto-refresh every 5 minutes):

- Function executions: ~8,640/month (every 5 min)
- Storage operations: ~500/month (read workflows.json)
- Key Vault operations: ~8,640/month (retrieve secrets)

**Total**: $3-5/month

### Cost Optimization Tips

1. **Increase client-side cache TTL**:
   - Edit `pages/api.js`: Change `cacheTTL` from 60000 to 120000 (2 minutes)
   - Reduces function invocations

2. **Reduce auto-refresh frequency**:
   - Edit `pages/dashboard.js`: Change `setupAutoRefresh(5)` to `setupAutoRefresh(10)`
   - Reduces page load impact on function calls

3. **Use Azure Cost Management**:
   - Set up budgets and alerts
   - Monitor actual vs. expected costs

## Security Considerations

### Secrets Management

**Never commit**:
- parameters.json (contains GitHub App ID)
- local.settings.json (contains Azure resource URLs)
- Any file with actual credentials
- GitHub App private key files (.pem)

**Best Practices**:
- GitHub App private key should be uploaded directly to Key Vault using `az keyvault secret set --file`
- Never include the private key in deployment parameters to prevent exposure in Azure deployment logs
- Rotate GitHub App private key regularly (every 3-6 months)
- Review Key Vault access logs monthly

### CORS Configuration

Default configuration allows `https://*.github.io`. For production:

1. Update `infrastructure/main.bicep`:
   ```bicep
   allowedOrigins: [
     'https://your-specific-org.github.io'
   ]
   ```

2. Redeploy infrastructure:
   ```bash
   ./infrastructure/deploy.sh
   ```

### Function Authentication

Current: `authLevel: 'anonymous'` (easy for GitHub Pages)

For higher security:
1. Change to `authLevel: 'function'`
2. Generate function key
3. Pass key in dashboard API calls: `?code=<KEY>`

## Support Resources

- **Azure Documentation**: https://docs.microsoft.com/azure/azure-functions/
- **Bicep Documentation**: https://docs.microsoft.com/azure/azure-resource-manager/bicep/
- **GitHub Apps**: https://docs.github.com/apps
- **Repository Documentation**:
  - Setup: [AZURE_SETUP.md](AZURE_SETUP.md)
  - Migration: [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
  - Architecture: [AZURE_IMPLEMENTATION.md](AZURE_IMPLEMENTATION.md)

## Contact

For issues specific to this implementation:
- Open GitHub issue in this repository
- Include: error messages, screenshots, resource names
- Tag with: `azure-function` label

---

**Last Updated**: 2025-12-12  
**Version**: 1.0.0
