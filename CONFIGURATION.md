# Configuration Management

This repository uses a unified configuration approach for Azure deployments.

## Centralized Parameters

All Azure resources (dashboard and insights) share core configuration from `infrastructure/parameters.json`:
- azureRegion: eastus
- resourcePrefix: ghactionsdash  
- deploymentStage: dev/staging/prod

## How It Works

**Main Dashboard Deployment:**
Reads `parameters.json` directly for all values.

**Insights Deployment:**
The `deploy-insights.sh` script:
1. Reads shared values from `parameters.json`
2. Calculates dependent values (e.g., Key Vault name = {resourcePrefix}-kv-{deploymentStage})
3. Passes all parameters inline to the Bicep template

This eliminates the need for `insights.parameters.json` and ensures consistency.

## Deployment Workflows

### Infrastructure
`.github/workflows/deploy-azure-infrastructure.yml` includes an `include_insights` toggle to optionally deploy insights infrastructure alongside main infrastructure.

### Function Apps
`.github/workflows/deploy-azure-function.yml` supports deploying:
- Dashboard functions only (default)
- Insights functions only
- Both function apps

Selection via `deploy_target` input or auto-detection based on changed file paths.

## Required Secrets

For dashboard: `FUNCTION_APP_NAME`
For insights: `INSIGHTS_FUNCTION_APP_NAME`

Both use the same `AZURE_CREDENTIALS` for authentication.
