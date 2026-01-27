#!/bin/bash

# Deployment script for GitHub Actions Insights Azure Infrastructure
# This script deploys the Cosmos DB and Insights Function App

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== GitHub Actions Insights Infrastructure Deployment ===${NC}"
echo ""

# Check if parameters file exists
if [ ! -f "insights.parameters.json" ]; then
    echo -e "${YELLOW}Creating insights.parameters.json from example...${NC}"
    cp insights.parameters.example.json insights.parameters.json
    echo -e "${RED}Please edit insights.parameters.json with your values before continuing!${NC}"
    exit 1
fi

# Load parameters
LOCATION=$(jq -r '.parameters.location.value' insights.parameters.json)
BASE_NAME=$(jq -r '.parameters.baseName.value' insights.parameters.json)
ENVIRONMENT=$(jq -r '.parameters.environment.value' insights.parameters.json)
EXISTING_KEY_VAULT_NAME=$(jq -r '.parameters.existingKeyVaultName.value' insights.parameters.json)

# Construct resource names
RESOURCE_GROUP="${BASE_NAME}-rg"
DEPLOYMENT_NAME="${BASE_NAME}-insights-deployment-$(date +%Y%m%d-%H%M%S)"

echo "Deployment Configuration:"
echo "  Location: $LOCATION"
echo "  Base Name: $BASE_NAME"
echo "  Environment: $ENVIRONMENT"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Key Vault: $EXISTING_KEY_VAULT_NAME"
echo ""

# Check if resource group exists
echo -e "${YELLOW}Checking if resource group exists...${NC}"
if ! az group show --name "$RESOURCE_GROUP" &>/dev/null; then
    echo -e "${RED}Error: Resource group '$RESOURCE_GROUP' does not exist.${NC}"
    echo -e "${RED}Please deploy the main infrastructure first using deploy.sh${NC}"
    exit 1
fi

echo -e "${GREEN}Resource group found!${NC}"
echo ""

# Deploy Bicep template
echo -e "${YELLOW}Deploying Insights infrastructure...${NC}"
az deployment group create \
    --name "$DEPLOYMENT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --template-file insights.bicep \
    --parameters insights.parameters.json \
    --verbose

echo ""
echo -e "${GREEN}=== Deployment Outputs ===${NC}"

# Get deployment outputs
FUNCTION_APP_INSIGHTS_NAME=$(az deployment group show \
    --name "$DEPLOYMENT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query 'properties.outputs.functionAppInsightsName.value' -o tsv)

FUNCTION_APP_INSIGHTS_URL=$(az deployment group show \
    --name "$DEPLOYMENT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query 'properties.outputs.functionAppInsightsUrl.value' -o tsv)

COSMOS_DB_ACCOUNT_NAME=$(az deployment group show \
    --name "$DEPLOYMENT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query 'properties.outputs.cosmosDbAccountName.value' -o tsv)

COSMOS_DB_ENDPOINT=$(az deployment group show \
    --name "$DEPLOYMENT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query 'properties.outputs.cosmosDbEndpoint.value' -o tsv)

echo ""
echo "Insights Function App:"
echo "  Name: $FUNCTION_APP_INSIGHTS_NAME"
echo "  URL: $FUNCTION_APP_INSIGHTS_URL"
echo ""
echo "Cosmos DB:"
echo "  Account Name: $COSMOS_DB_ACCOUNT_NAME"
echo "  Endpoint: $COSMOS_DB_ENDPOINT"
echo "  Database: ActionsInsights"
echo "  Container: events"
echo ""

echo -e "${GREEN}=== Next Steps ===${NC}"
echo ""
echo "1. Create GitHub webhook secret in Key Vault:"
echo "   az keyvault secret set \\"
echo "     --vault-name $EXISTING_KEY_VAULT_NAME \\"
echo "     --name github-webhook-secret \\"
echo "     --value 'YOUR_WEBHOOK_SECRET'"
echo ""
echo "2. Deploy Function App code:"
echo "   cd ../function-app-insights"
echo "   npm install"
echo "   func azure functionapp publish $FUNCTION_APP_INSIGHTS_NAME --javascript"
echo ""
echo "3. Configure GitHub webhook:"
echo "   URL: $FUNCTION_APP_INSIGHTS_URL/api/webhook-receiver"
echo "   Content type: application/json"
echo "   Secret: (use the same secret you stored in Key Vault)"
echo "   Events: Select 'workflow_run'"
echo ""
echo -e "${GREEN}Deployment complete!${NC}"
