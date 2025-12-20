#!/bin/bash
# Deployment script for Azure infrastructure

set -e

# Default values
RESOURCE_GROUP_NAME="${RESOURCE_GROUP_NAME:-ghactionsdash-rg}"
LOCATION="${LOCATION:-eastus}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
PARAMETERS_FILE="${PARAMETERS_FILE:-parameters.json}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== GitHub Actions Dashboard - Azure Infrastructure Deployment ===${NC}"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI is not installed.${NC}"
    echo "Please install Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
echo -e "${YELLOW}Checking Azure login status...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Azure.${NC}"
    echo "Please run: az login"
    exit 1
fi

# Display current subscription
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
echo -e "${GREEN}Using Azure subscription: ${SUBSCRIPTION_NAME}${NC}"
echo ""

# Check if parameters file exists
if [ ! -f "$PARAMETERS_FILE" ]; then
    echo -e "${RED}Error: Parameters file '$PARAMETERS_FILE' not found.${NC}"
    echo "Please create a parameters file based on parameters.example.json"
    exit 1
fi

# Create resource group if it doesn't exist
echo -e "${YELLOW}Creating resource group: $RESOURCE_GROUP_NAME in $LOCATION...${NC}"
az group create \
    --name "$RESOURCE_GROUP_NAME" \
    --location "$LOCATION" \
    --output none

echo -e "${GREEN}Resource group created/verified.${NC}"
echo ""

# Deploy Bicep template
echo -e "${YELLOW}Deploying infrastructure...${NC}"
echo "This may take several minutes..."
echo ""

DEPLOYMENT_NAME="ghactionsdash-deployment-$(date +%Y%m%d-%H%M%S)"

az deployment group create \
    --name "$DEPLOYMENT_NAME" \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --template-file main.bicep \
    --parameters "@$PARAMETERS_FILE" \
    --output json > deployment-output.json

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    echo ""
    
    # Extract outputs
    FUNCTION_APP_NAME=$(jq -r '.properties.outputs.functionAppName.value' deployment-output.json)
    FUNCTION_APP_URL=$(jq -r '.properties.outputs.functionAppUrl.value' deployment-output.json)
    KEY_VAULT_NAME=$(jq -r '.properties.outputs.keyVaultName.value' deployment-output.json)
    STORAGE_ACCOUNT_NAME=$(jq -r '.properties.outputs.storageAccountName.value' deployment-output.json)
    STORAGE_CONTAINER_NAME=$(jq -r '.properties.outputs.storageContainerName.value' deployment-output.json)
    
    echo -e "${GREEN}=== Deployment Outputs ===${NC}"
    echo "Function App Name: $FUNCTION_APP_NAME"
    echo "Function App URL: $FUNCTION_APP_URL"
    echo "Key Vault Name: $KEY_VAULT_NAME"
    echo "Storage Account: $STORAGE_ACCOUNT_NAME"
    echo "Workflow Container: $STORAGE_CONTAINER_NAME"
    echo ""
    echo -e "${GREEN}=== Next Steps ===${NC}"
    echo "1. Upload GitHub App private key to Key Vault:"
    echo "   az keyvault secret set \\"
    echo "     --vault-name $KEY_VAULT_NAME \\"
    echo "     --name github-app-private-key \\"
    echo "     --file /path/to/your/private-key.pem"
    echo ""
    echo "2. Deploy the function app code:"
    echo "   cd ../function-app"
    echo "   npm install"
    echo "   func azure functionapp publish $FUNCTION_APP_NAME"
    echo ""
    echo "3. Upload initial workflow configuration to storage:"
    echo "   az storage blob upload \\"
    echo "     --account-name $STORAGE_ACCOUNT_NAME \\"
    echo "     --container-name $STORAGE_CONTAINER_NAME \\"
    echo "     --name workflows.json \\"
    echo "     --file workflows.json \\"
    echo "     --auth-mode login"
    echo ""
    echo "4. Update your GitHub Pages config with the function URL:"
    echo "   FUNCTION_URL=$FUNCTION_APP_URL"
    
    # Save outputs to env file
    cat > deployment-outputs.env << EOF
FUNCTION_APP_NAME=$FUNCTION_APP_NAME
FUNCTION_APP_URL=$FUNCTION_APP_URL
KEY_VAULT_NAME=$KEY_VAULT_NAME
STORAGE_ACCOUNT_NAME=$STORAGE_ACCOUNT_NAME
STORAGE_CONTAINER_NAME=$STORAGE_CONTAINER_NAME
RESOURCE_GROUP_NAME=$RESOURCE_GROUP_NAME
EOF
    
    echo ""
    echo -e "${GREEN}Deployment outputs saved to: deployment-outputs.env${NC}"
else
    echo -e "${RED}Deployment failed. Check the error messages above.${NC}"
    exit 1
fi
