// Cosmos DB client for accessing the ActionsInsights database using Managed Identity
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

let cosmosClient = null;
let database = null;
let container = null;

/**
 * Initialize the Cosmos DB client
 */
function getCosmosClient() {
  if (!cosmosClient) {
    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    if (!endpoint) {
      throw new Error('COSMOS_DB_ENDPOINT environment variable is not set');
    }
    
    const credential = new DefaultAzureCredential();
    cosmosClient = new CosmosClient({ endpoint, aadCredentials: credential });
  }
  return cosmosClient;
}

/**
 * Get the Cosmos DB database
 */
function getDatabase() {
  if (!database) {
    const databaseName = process.env.COSMOS_DB_DATABASE || 'ActionsInsights';
    const client = getCosmosClient();
    database = client.database(databaseName);
  }
  return database;
}

/**
 * Get the Cosmos DB container
 */
function getContainer() {
  if (!container) {
    const containerName = process.env.COSMOS_DB_CONTAINER || 'events';
    const db = getDatabase();
    container = db.container(containerName);
  }
  return container;
}

/**
 * Create an event item in Cosmos DB
 * @param {Object} eventData - Event data to store
 * @returns {Promise<Object>} - Created item
 */
async function createEvent(eventData) {
  try {
    const containerClient = getContainer();
    const { resource } = await containerClient.items.create(eventData);
    return resource;
  } catch (error) {
    throw new Error(`Failed to create event in Cosmos DB: ${error.message}`);
  }
}

/**
 * Query events from Cosmos DB
 * @param {string} query - SQL query string
 * @param {Object} parameters - Query parameters
 * @returns {Promise<Array>} - Query results
 */
async function queryEvents(query, parameters = []) {
  try {
    const containerClient = getContainer();
    const { resources } = await containerClient.items
      .query({
        query,
        parameters
      })
      .fetchAll();
    return resources;
  } catch (error) {
    throw new Error(`Failed to query events from Cosmos DB: ${error.message}`);
  }
}

/**
 * Get events by partition key (month)
 * @param {string} partitionKey - Partition key (YYYY-MM format)
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Query results
 */
async function getEventsByPartition(partitionKey, limit = 100) {
  const query = 'SELECT * FROM c WHERE c.partitionKey = @partitionKey ORDER BY c.timestamp DESC OFFSET 0 LIMIT @limit';
  const parameters = [
    { name: '@partitionKey', value: partitionKey },
    { name: '@limit', value: limit }
  ];
  return await queryEvents(query, parameters);
}

/**
 * Get events by repository
 * @param {string} repository - Repository name (owner/repo format)
 * @param {string} partitionKey - Partition key (YYYY-MM format)
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Query results
 */
async function getEventsByRepository(repository, partitionKey, limit = 100) {
  const query = 'SELECT * FROM c WHERE c.partitionKey = @partitionKey AND c.repository = @repository ORDER BY c.timestamp DESC OFFSET 0 LIMIT @limit';
  const parameters = [
    { name: '@partitionKey', value: partitionKey },
    { name: '@repository', value: repository },
    { name: '@limit', value: limit }
  ];
  return await queryEvents(query, parameters);
}

/**
 * Get aggregated statistics by repository for a time period
 * @param {string} startPartition - Start partition key (YYYY-MM format)
 * @param {string} endPartition - End partition key (YYYY-MM format)
 * @returns {Promise<Array>} - Aggregated statistics
 */
async function getRepositoryStats(startPartition, endPartition) {
  // Note: For more complex aggregations, consider using Azure Functions to process data
  // or pre-compute statistics and store them separately
  const query = `
    SELECT 
      c.repository,
      c.partitionKey,
      COUNT(1) as totalRuns,
      SUM(CASE WHEN c.conclusion = 'success' THEN 1 ELSE 0 END) as successfulRuns,
      SUM(CASE WHEN c.conclusion = 'failure' THEN 1 ELSE 0 END) as failedRuns,
      AVG(c.duration_seconds) as avgDuration
    FROM c 
    WHERE c.partitionKey >= @startPartition AND c.partitionKey <= @endPartition
    GROUP BY c.repository, c.partitionKey
  `;
  const parameters = [
    { name: '@startPartition', value: startPartition },
    { name: '@endPartition', value: endPartition }
  ];
  return await queryEvents(query, parameters);
}

module.exports = {
  createEvent,
  queryEvents,
  getEventsByPartition,
  getEventsByRepository,
  getRepositoryStats
};
