# Insights Deployment Fix Summary

## Problem
The Insights functionality was not being deployed to Azure automatically. Users would create the function app code but wouldn't see it in their Azure subscription.

## Root Causes Identified

1. **Infrastructure Workflow Issues**:
   - The `include_insights` option existed but defaulted to `false`
   - The insights function app name was being incorrectly derived using `sed` instead of querying the deployment outputs
   - No proper output capture or environment variable export for the insights function app

2. **Function Deployment Workflow Issues**:
   - Auto-detection logic for push events always set `insights=false`
   - The workflow didn't check for changes in the `function-app-insights/` directory
   - The `INSIGHTS_FUNCTION_APP_NAME` secret was required but never populated

## Changes Made

### 1. Fixed Infrastructure Workflow (`deploy-azure-infrastructure.yml`)

**Before**:
```yaml
- name: Deploy Insights Infrastructure
  if: inputs.include_insights == true
  run: |
    cd infrastructure
    ./deploy-insights.sh
    INSIGHTS_FUNC_NAME="${{ env.KEY_VAULT_NAME }}" | sed 's/-kv-/-func-insights-/'
    echo "INSIGHTS_FUNCTION_APP_NAME=$INSIGHTS_FUNC_NAME" >> $GITHUB_ENV
```

**After**:
```yaml
- name: Deploy Insights Infrastructure
  if: inputs.include_insights == true
  run: |
    cd infrastructure
    ./deploy-insights.sh
    
    # Get the latest deployment name for insights
    LATEST_DEPLOYMENT=$(az deployment group list \
      --resource-group "$RESOURCE_GROUP_NAME" \
      --query "[?contains(name, 'insights-deployment')].name | sort(@) | [-1]" \
      -o tsv)
    
    # Extract the insights function app name from deployment outputs
    INSIGHTS_FUNC_NAME=$(az deployment group show \
      --name "$LATEST_DEPLOYMENT" \
      --resource-group "$RESOURCE_GROUP_NAME" \
      --query 'properties.outputs.functionAppInsightsName.value' \
      -o tsv)
    
    INSIGHTS_FUNC_URL=$(az deployment group show \
      --name "$LATEST_DEPLOYMENT" \
      --resource-group "$RESOURCE_GROUP_NAME" \
      --query 'properties.outputs.functionAppInsightsUrl.value' \
      -o tsv)
    
    echo "INSIGHTS_FUNCTION_APP_NAME=$INSIGHTS_FUNC_NAME" >> $GITHUB_ENV
    echo "INSIGHTS_FUNCTION_APP_URL=$INSIGHTS_FUNC_URL" >> $GITHUB_ENV
    
    # Display instructions for adding the secret
    echo "**⚠️ Important:** Add the following secret to your repository:" >> $GITHUB_STEP_SUMMARY
    echo "- Secret name: \`INSIGHTS_FUNCTION_APP_NAME\`" >> $GITHUB_STEP_SUMMARY
    echo "- Secret value: \`$INSIGHTS_FUNC_NAME\`" >> $GITHUB_STEP_SUMMARY
```

### 2. Fixed Function Deployment Workflow (`deploy-azure-function.yml`)

**Before**:
```yaml
determine-target:
  runs-on: ubuntu-latest
  outputs:
    deploy_dashboard: ${{ steps.decide.outputs.dashboard }}
    deploy_insights: ${{ steps.decide.outputs.insights }}
  steps:
    - id: decide
      run: |
        if [ "${{ github.event_name }}" == "push" ]; then
          # Auto-detect based on changed files
          echo "dashboard=true" >> $GITHUB_OUTPUT
          echo "insights=false" >> $GITHUB_OUTPUT
```

**After**:
```yaml
determine-target:
  runs-on: ubuntu-latest
  outputs:
    deploy_dashboard: ${{ steps.decide.outputs.dashboard }}
    deploy_insights: ${{ steps.decide.outputs.insights }}
  steps:
    - name: Checkout code
      if: github.event_name == 'push'
      uses: actions/checkout@v4
      with:
        fetch-depth: 2
    
    - id: decide
      run: |
        if [ "${{ github.event_name }}" == "push" ]; then
          # Auto-detect based on changed files
          DASHBOARD_CHANGED=false
          INSIGHTS_CHANGED=false
          
          # Get list of changed files in the push
          CHANGED_FILES=$(git diff --name-only HEAD^ HEAD)
          
          # Check if dashboard files changed
          if echo "$CHANGED_FILES" | grep -q "^function-app/"; then
            DASHBOARD_CHANGED=true
          fi
          
          # Check if insights files changed
          if echo "$CHANGED_FILES" | grep -q "^function-app-insights/"; then
            INSIGHTS_CHANGED=true
          fi
          
          echo "dashboard=$DASHBOARD_CHANGED" >> $GITHUB_OUTPUT
          echo "insights=$INSIGHTS_CHANGED" >> $GITHUB_OUTPUT
```

### 3. Enhanced Secret Validation

**Original Implementation** (conditional - deprecated):
```yaml
# Check insights secret only if deploying insights
if [ "${{ needs.determine-target.outputs.deploy_insights }}" == "true" ]; then
  if [ -z "${{ secrets.INSIGHTS_FUNCTION_APP_NAME }}" ]; then
    MISSING_SECRETS+=("INSIGHTS_FUNCTION_APP_NAME (required when deploying insights)")
  fi
fi
```

**Updated Implementation** (always required - matches dashboard pattern):
```yaml
# Always check, just like dashboard function app
if [ -z "${{ secrets.INSIGHTS_FUNCTION_APP_NAME }}" ] && [ -z "${{ inputs.insights_function_app_name }}" ]; then
  MISSING_SECRETS+=("INSIGHTS_FUNCTION_APP_NAME (or provide as workflow input)")
fi
```

This change makes the insights secret required all the time, matching the dashboard behavior.

## How to Deploy Insights Now

### Option 1: Automated Deployment (Recommended)

1. **Deploy Infrastructure with Insights**:
   - Go to Actions → "Deploy Azure Infrastructure"
   - Run workflow
   - Check "Also deploy Insights infrastructure"
   - Wait for completion

2. **Save the Secret**:
   - Check the workflow output for the Insights Function App name
   - Go to Settings → Secrets and variables → Actions
   - Add secret: `INSIGHTS_FUNCTION_APP_NAME` with the function app name

3. **Deploy Function Code**:
   - Go to Actions → "Deploy Azure Function"
   - Run workflow
   - Select "insights" or "both"
   - The code will deploy automatically

### Option 2: Automatic on Push

After infrastructure is deployed and the secret is set:
- Any push to `function-app-insights/**` files will automatically deploy the insights function
- Any push to `function-app/**` files will automatically deploy the dashboard function

## Testing the Fix

To verify the fix works:

1. Deploy infrastructure with `include_insights=true`
2. Verify the workflow outputs the correct function app name
3. Add the `INSIGHTS_FUNCTION_APP_NAME` secret
4. Make a small change to a file in `function-app-insights/`
5. Push the change
6. Verify the "Deploy Azure Function" workflow runs and deploys insights

## Key Improvements

1. ✅ Proper output capture from Bicep deployment
2. ✅ Automatic detection of insights code changes
3. ✅ Clear instructions for users in workflow summaries
4. ✅ Required secrets validation (matching dashboard pattern)
5. ✅ Better error messages and troubleshooting info
6. ✅ Deployment summaries include insights information

## Latest Update: Required Secret Configuration

**Change Date**: 2026-02-13

The `INSIGHTS_FUNCTION_APP_NAME` secret is now **always required** (not conditionally), matching the dashboard function app pattern:

- Added `insights_function_app_name` workflow input option
- Validation now checks: `secrets.INSIGHTS_FUNCTION_APP_NAME` OR `inputs.insights_function_app_name`
- All insights deployment steps use: `${{ inputs.insights_function_app_name || secrets.INSIGHTS_FUNCTION_APP_NAME }}`
- This matches the exact pattern used for `FUNCTION_APP_NAME` / `function_app_name`

**Benefits**:
- Consistent secret management across dashboard and insights
- Easier to understand and maintain
- Can override via workflow input if needed
- Always validated upfront, preventing deployment failures

## Documentation Updates

- Updated `INSIGHTS_SETUP.md` to include automated deployment option
- Added this fix summary document for reference

## Related Files Changed

- `.github/workflows/deploy-azure-infrastructure.yml`
- `.github/workflows/deploy-azure-function.yml`
- `INSIGHTS_SETUP.md`
- `INSIGHTS_DEPLOYMENT_FIX.md` (new)
