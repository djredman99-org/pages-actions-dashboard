// Azure Storage Client Module
// Handles reading/writing workflow configurations from Azure Blob Storage using managed identity

const crypto = require('crypto');
const { DefaultAzureCredential } = require('@azure/identity');
const { BlobServiceClient } = require('@azure/storage-blob');

/**
 * Get workflow configurations from Azure Blob Storage
 * @param {string} storageAccountUrl - Storage account URL (e.g., https://mystorageaccount.blob.core.windows.net/)
 * @param {string} containerName - Container name
 * @param {string} blobName - Blob name (default: 'workflows.json')
 * @returns {Promise<Object>} Configuration object with dashboards structure
 */
async function getWorkflowConfigurations(storageAccountUrl, containerName, blobName = 'workflows.json') {
    try {
        // Use managed identity to authenticate
        const credential = new DefaultAzureCredential();
        const blobServiceClient = new BlobServiceClient(storageAccountUrl, credential);

        // Get container and blob clients
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);

        // Check if blob exists
        const exists = await blobClient.exists();
        if (!exists) {
            console.log(`Workflow configuration blob '${blobName}' not found. Returning default structure.`);
            return createDefaultConfig();
        }

        // Download and parse the blob content
        const downloadResponse = await blobClient.download(0);
        const downloaded = await streamToBuffer(downloadResponse.readableStreamBody);
        
        try {
            const config = JSON.parse(downloaded.toString());
            // Migrate old format to new format if needed
            return migrateConfig(config);
        } catch (parseError) {
            console.error('Failed to parse workflows.json:', parseError);
            throw new Error(`Invalid JSON in workflows configuration: ${parseError.message}`);
        }
    } catch (error) {
        console.error('Failed to get workflow configurations from storage:', error);
        throw new Error(`Storage access failed: ${error.message}`);
    }
}

/**
 * Create default configuration structure
 * @returns {Object} Default configuration with one empty dashboard
 */
function createDefaultConfig() {
    const dashboardId = crypto.randomUUID();
    return {
        dashboards: [
            {
                id: dashboardId,
                name: 'Main Dashboard',
                workflows: []
            }
        ],
        activeDashboardId: dashboardId
    };
}

/**
 * Migrate old configuration format to new multi-dashboard format
 * @param {Object|Array} config - Configuration in old or new format
 * @returns {Object} Configuration in new format
 */
function migrateConfig(config) {
    // If already in new format (has dashboards array), return as-is
    if (config && config.dashboards && Array.isArray(config.dashboards)) {
        // Ensure activeDashboardId is set
        if (!config.activeDashboardId && config.dashboards.length > 0) {
            config.activeDashboardId = config.dashboards[0].id;
        }
        return config;
    }
    
    // If it's a raw array, convert to old single-dashboard format first
    if (Array.isArray(config)) {
        config = {
            dashboardId: crypto.randomUUID(),
            workflows: config
        };
    }
    
    // Convert old single-dashboard format to new multi-dashboard format
    if (config && config.workflows && Array.isArray(config.workflows)) {
        const dashboardId = config.dashboardId || crypto.randomUUID();
        return {
            dashboards: [
                {
                    id: dashboardId,
                    name: 'Main Dashboard',
                    workflows: config.workflows
                }
            ],
            activeDashboardId: dashboardId
        };
    }
    
    // If we can't understand the format, return default config
    console.warn('Unknown configuration format, returning default config');
    return createDefaultConfig();
}

/**
 * Save workflow configurations to Azure Blob Storage
 * @param {string} storageAccountUrl - Storage account URL
 * @param {string} containerName - Container name
 * @param {Object} config - Configuration object with dashboards structure
 * @param {string} blobName - Blob name (default: 'workflows.json')
 * @returns {Promise<void>}
 */
async function saveWorkflowConfigurations(storageAccountUrl, containerName, config, blobName = 'workflows.json') {
    try {
        // Use managed identity to authenticate
        const credential = new DefaultAzureCredential();
        const blobServiceClient = new BlobServiceClient(storageAccountUrl, credential);

        // Get container and blob clients
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlockBlobClient(blobName);

        // Upload the configuration as JSON
        const content = JSON.stringify(config, null, 2);
        await blobClient.upload(content, content.length, {
            blobHTTPHeaders: {
                blobContentType: 'application/json'
            }
        });

        console.log(`Successfully saved workflow configurations to ${blobName}`);
    } catch (error) {
        console.error('Failed to save workflow configurations to storage:', error);
        throw new Error(`Storage write failed: ${error.message}`);
    }
}

/**
 * Helper function to convert stream to buffer
 * @param {Stream} readableStream - Readable stream
 * @returns {Promise<Buffer>} Buffer containing stream data
 */
async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on('error', reject);
    });
}

module.exports = {
    getWorkflowConfigurations,
    saveWorkflowConfigurations,
};
