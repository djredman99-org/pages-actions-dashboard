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

The Pages site is deployed with the `deploy-dashboard.yml`.

## Pre-Deployment Checklist

Before deploying this solution, ensure you have:

- [ ] Azure subscription with appropriate permissions
- [ ] Azure CLI installed and configured (`az login`)
- [ ] Azure Functions Core Tools installed
- [ ] GitHub App created with:
  - [ ] App ID saved
  - [ ] Private key downloaded (.pem file)
  - [ ] App installed on target organization/repositories
  - [ ] "Actions: Read-only" permission granted
- [ ] Repository secret `AZURE_FUNCTION_URL` ready to be added

## Deployment Order

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

5. **Configure Pages on the Repository**
   - Ensure you set to use GitHub Actions for deployment

6. **Deploy Pages Site** (merge PR or push to main)
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

## Security Considerations

### Secrets Management

**Never commit**:
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

**Last Updated**: 2025-12-20  
**Version**: 1.0.1
