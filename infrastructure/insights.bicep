// Bicep template for GitHub Actions Insights Azure Infrastructure
// This template deploys Azure resources for the new Insights feature:
// - Cosmos DB for storing webhook events
// - Separate Function App for handling webhooks
// - Managed Identity with RBAC permissions

@description('The Azure region where resources will be deployed')
param location string = resourceGroup().location

@description('Base name for all resources (will be suffixed with resource type)')
param baseName string = 'ghactionsdash'

@description('Environment name (dev, staging, prod)')
@allowed([
  'dev'
  'staging'
  'prod'
])
param environment string = 'dev'

@description('Existing Key Vault name to reuse')
param existingKeyVaultName string

@description('CORS allowed origins for the function app (e.g., https://your-org.github.io)')
param corsAllowedOrigins array = [
  'https://*.github.io'
]

// Variables
var functionAppInsightsName = '${baseName}-func-insights-${environment}'
var appServicePlanInsightsName = '${baseName}-plan-insights-${environment}'
var applicationInsightsInsightsName = '${baseName}-ai-insights-${environment}'
var cosmosDbAccountName = '${baseName}-cosmos-${environment}'
var cosmosDbDatabaseName = 'ActionsInsights'
var cosmosDbContainerName = 'events'

// Reference existing Key Vault
resource existingKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: existingKeyVaultName
}

// Application Insights for monitoring
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// App Service Plan (Consumption plan for serverless)
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanInsightsName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {}
}

// Cosmos DB Account for storing webhook events
resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: cosmosDbAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
  }
}

// Cosmos DB Database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosDbAccount
  name: cosmosDbDatabaseName
  properties: {
    resource: {
      id: cosmosDbDatabaseName
    }
  }
}

// Cosmos DB Container for events with partition key
resource cosmosContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: cosmosDbContainerName
  properties: {
    resource: {
      id: cosmosDbContainerName
      partitionKey: {
        paths: [
          '/partitionKey'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
          {
            path: '/rawPayload/*'
          }
        ]
      }
    }
  }
}

// Function App for Insights with managed identity
resource functionAppInsights 'Microsoft.Web/sites@2022-09-01' = {
  name: functionAppInsightsName
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      appSettings: [
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: applicationInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: applicationInsights.properties.ConnectionString
        }
        {
          name: 'KEY_VAULT_URL'
          value: existingKeyVault.properties.vaultUri
        }
        {
          name: 'COSMOS_DB_ENDPOINT'
          value: cosmosDbAccount.properties.documentEndpoint
        }
        {
          name: 'COSMOS_DB_DATABASE'
          value: cosmosDbDatabaseName
        }
        {
          name: 'COSMOS_DB_CONTAINER'
          value: cosmosDbContainerName
        }
      ]
      cors: {
        allowedOrigins: corsAllowedOrigins
        supportCredentials: false
      }
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
  }
}

// Role assignments for Insights Function App managed identity

// Key Vault Secrets User role for reading webhook secret
resource keyVaultSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(existingKeyVault.id, functionAppInsights.id, 'Key Vault Secrets User')
  scope: existingKeyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: functionAppInsights.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Cosmos DB Data Contributor role for reading/writing events
resource cosmosDbDataContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(cosmosDbAccount.id, functionAppInsights.id, 'Cosmos DB Data Contributor')
  scope: cosmosDbAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '00000000-0000-0000-0000-000000000002')
    principalId: functionAppInsights.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Outputs
output functionAppInsightsName string = functionAppInsights.name
output functionAppInsightsUrl string = 'https://${functionAppInsights.properties.defaultHostName}'
output cosmosDbAccountName string = cosmosDbAccount.name
output cosmosDbDatabaseName string = cosmosDbDatabaseName
output cosmosDbContainerName string = cosmosDbContainerName
output cosmosDbEndpoint string = cosmosDbAccount.properties.documentEndpoint
output functionAppInsightsPrincipalId string = functionAppInsights.identity.principalId
