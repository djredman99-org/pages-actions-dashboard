# Deployment Notes

> **Note:** For the complete setup guide, see [SETUP.md](SETUP.md).

This document contains important information about deployment, monitoring, and maintenance.

## Automated Deployment

All deployments are automated via GitHub Actions workflows. No manual Azure CLI commands are required for standard deployments.

### Deployment Workflows

1. **Deploy Azure Infrastructure** (`.github/workflows/deploy-azure-infrastructure.yml`)
   - Creates all Azure resources (Function App, Key Vault, Storage)
   - Uploads GitHub App credentials to Key Vault
   - Outputs configuration details
   - **Trigger:** Manual via workflow_dispatch

2. **Deploy Azure Function** (`.github/workflows/deploy-azure-function.yml`)
   - Deploys function app code to Azure
   - Automatically triggers on changes to `function-app/**`
   - Can be manually triggered via workflow_dispatch

3. **Deploy Dashboard to GitHub Pages** (`.github/workflows/deploy-dashboard.yml`)
   - Builds and deploys the dashboard frontend
   - Injects Azure Function URL from secrets
   - Automatically triggers on push to `main` branch

### Deployment Order

For initial setup, run workflows in this order:

1. **Deploy Azure Infrastructure** → Creates Azure resources
2. **Add FUNCTION_APP_NAME secret** → Use output from step 1
3. **Deploy Azure Function** → Deploys function code
4. **Add AZURE_FUNCTION_URL secret** → Use output from step 3
5. **Deploy Dashboard** → Deploys frontend to GitHub Pages

## Post-Deployment Verification

After deployment, verify everything is working:

### 1. Check Azure Resources

```bash
az resource list --resource-group ghactionsdash-rg --output table
```

### 2. Test Function App

```bash
curl https://YOUR_FUNCTION_APP_NAME.azurewebsites.net/api/get-workflow-statuses
```

Should return JSON with workflow statuses (or empty array if not configured).

### 3. Verify Dashboard

1. Visit: `https://{your-org}.github.io/{repo-name}/`
2. Workflow cards should display with current statuses
3. Check browser console for errors

### 4. Check Application Insights

- Azure Portal → Function App → Application Insights
- Verify requests are being logged
- Check for any error messages

## Common Issues

See [SETUP.md](SETUP.md#troubleshooting) for comprehensive troubleshooting guide.

## Monitoring

### Key Metrics

**Function App:**
- Execution count (increases with dashboard usage)
- Average duration (should be 1-5 seconds)
- Error rate (should be near 0%)

**Application Insights Queries:**

**Request Success Rate:**
```kusto
requests
| where operation_Name == "get-workflow-statuses"
| summarize total=count(), success=countif(resultCode < 400) by bin(timestamp, 1h)
| extend successRate = success * 100.0 / total
```

**Average Duration:**
```kusto
requests
| where operation_Name == "get-workflow-statuses"
| summarize avg(duration) by bin(timestamp, 1h)
```

### Recommended Alerts

Configure these Azure Monitor alerts:

1. **Function Errors**
   - Condition: Failed requests > 5 in 5 minutes
   - Action: Email/Teams notification

2. **Function Duration**
   - Condition: Average duration > 10 seconds
   - Action: Email notification

3. **Azure Costs**
   - Condition: Daily cost > $1
   - Action: Email notification

## Security Best Practices

### Secrets Management

**Never commit:**
- `infrastructure/parameters.json` with real secrets (use placeholder values)
- GitHub App private key files (`.pem`)
- Any file with credentials

**Best Practices:**
- GitHub App private key should be uploaded to Key Vault via `az keyvault secret set --file`
- Rotate GitHub App private key every 3-6 months
- Review Key Vault access logs monthly
- Use GitHub Secrets for all sensitive configuration

### CORS Configuration

Default configuration allows `https://*.github.io`. For production:

1. Update `infrastructure/main.bicep`:
   ```bicep
   allowedOrigins: [
     'https://your-specific-org.github.io'
   ]
   ```

2. Redeploy infrastructure (run Deploy Azure Infrastructure workflow)

## Maintenance

### Dependency Updates

Check for npm package updates regularly:

```bash
cd function-app
npm outdated
npm update
npm audit fix  # Apply security fixes
```

### GitHub App Key Rotation

Every 3-6 months:

1. Generate new private key in GitHub App settings
2. Upload to Key Vault:
   ```bash
   az keyvault secret set \
     --vault-name YOUR_KEY_VAULT_NAME \
     --name github-app-private-key \
     --file /path/to/new-private-key.pem
   ```
3. Update `GH_APP_PRIVATE_KEY` repository secret
4. Restart Function App:
   ```bash
   az functionapp restart --name YOUR_FUNCTION_APP_NAME --resource-group ghactionsdash-rg
   ```

### Cost Optimization

Monitor costs in Azure Portal:
- Set up cost alerts (recommended: $1/day threshold)
- Review Application Insights data retention settings
- Consider using consumption plan (default) for low-traffic dashboards

## Support Resources

- **[SETUP.md](SETUP.md)** - Complete setup guide
- **[AZURE_IMPLEMENTATION.md](AZURE_IMPLEMENTATION.md)** - Architecture details
- **[Azure Functions Documentation](https://docs.microsoft.com/azure/azure-functions/)**
- **[GitHub Apps Documentation](https://docs.github.com/apps)**

## Related Documentation

- **[SETUP.md](SETUP.md)** - Complete setup and troubleshooting
- **[AZURE_SETUP.md](AZURE_SETUP.md)** - Manual deployment guide
- **[MULTIPLE_DASHBOARDS.md](MULTIPLE_DASHBOARDS.md)** - Multiple dashboards feature
