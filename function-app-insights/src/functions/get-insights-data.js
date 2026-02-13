// Data retrieval function for Insights reporting
// This function retrieves workflow event data from Cosmos DB for analysis
const { app } = require('@azure/functions');
const { 
  getEventsByPartition, 
  getEventsByRepository,
  getRepositoryStats 
} = require('../cosmos-client');

/**
 * Get current partition key (YYYY-MM format)
 */
function getCurrentPartition() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get partition key for a specific date
 * @param {string} dateString - ISO date string or YYYY-MM format
 */
function getPartitionForDate(dateString) {
  const date = new Date(dateString);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Data retrieval function
 * Provides various endpoints for retrieving insights data
 */
app.http('get-insights-data', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      context.log('Insights data retrieval started');
      
      // Parse query parameters
      const url = new URL(request.url);
      const queryType = url.searchParams.get('type') || 'recent';
      const repository = url.searchParams.get('repository');
      const partition = url.searchParams.get('partition') || getCurrentPartition();
      const limit = parseInt(url.searchParams.get('limit') || '100');
      
      let results;
      
      switch (queryType) {
        case 'recent':
          // Get recent events for a partition
          if (repository) {
            context.log(`Fetching recent events for repository: ${repository}, partition: ${partition}`);
            results = await getEventsByRepository(repository, partition, limit);
          } else {
            context.log(`Fetching recent events for partition: ${partition}`);
            results = await getEventsByPartition(partition, limit);
          }
          break;
          
        case 'stats':
          // Get aggregated statistics
          const startPartition = url.searchParams.get('startPartition') || partition;
          const endPartition = url.searchParams.get('endPartition') || partition;
          context.log(`Fetching stats from ${startPartition} to ${endPartition}`);
          results = await getRepositoryStats(startPartition, endPartition);
          break;
          
        case 'repository':
          // Get all events for a specific repository
          if (!repository) {
            return {
              status: 400,
              jsonBody: { error: 'Repository parameter is required for repository query type' }
            };
          }
          context.log(`Fetching all events for repository: ${repository}, partition: ${partition}`);
          results = await getEventsByRepository(repository, partition, limit);
          break;
          
        default:
          return {
            status: 400,
            jsonBody: { 
              error: 'Invalid query type',
              validTypes: ['recent', 'stats', 'repository']
            }
          };
      }
      
      context.log(`Retrieved ${results.length} results`);
      
      // Return results without rawPayload by default for efficiency
      const includeRaw = url.searchParams.get('includeRaw') === 'true';
      const sanitizedResults = includeRaw 
        ? results 
        : results.map(({ rawPayload, ...rest }) => rest);
      
      return {
        status: 200,
        jsonBody: {
          queryType,
          partition,
          repository,
          count: sanitizedResults.length,
          data: sanitizedResults
        }
      };
      
    } catch (error) {
      context.error('Error retrieving insights data:', error);
      return {
        status: 500,
        jsonBody: { 
          error: 'Internal server error',
          message: error.message 
        }
      };
    }
  }
});

/**
 * Health check endpoint
 */
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    return {
      status: 200,
      jsonBody: {
        status: 'healthy',
        service: 'github-actions-insights',
        timestamp: new Date().toISOString()
      }
    };
  }
});
