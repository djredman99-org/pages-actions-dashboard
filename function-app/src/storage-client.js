// Azure Storage Client Module
// Handles reading/writing workflow configurations from Azure Blob Storage using managed identity

const { DefaultAzureCredential } = require('@azure/identity');
const { BlobServiceClient } = require('@azure/storage-blob');

/**
 * Get workflow configurations from Azure Blob Storage
 * @param {string} storageAccountUrl - Storage account URL (e.g., https://mystorageaccount.blob.core.windows.net/)
 * @param {string} containerName - Container name
 * @param {string} blobName - Blob name (default: 'workflows.json')
 * @returns {Promise<Array>} Array of workflow configurations
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
            console.log(`Workflow configuration blob '${blobName}' not found. Returning empty array.`);
            return [];
        }

        // Download and parse the blob content
        const downloadResponse = await blobClient.download(0);
        const downloaded = await streamToBuffer(downloadResponse.readableStreamBody);
        const workflows = JSON.parse(downloaded.toString());

        return workflows;
    } catch (error) {
        console.error('Failed to get workflow configurations from storage:', error);
        throw new Error(`Storage access failed: ${error.message}`);
    }
}

/**
 * Save workflow configurations to Azure Blob Storage
 * @param {string} storageAccountUrl - Storage account URL
 * @param {string} containerName - Container name
 * @param {Array} workflows - Array of workflow configurations
 * @param {string} blobName - Blob name (default: 'workflows.json')
 * @returns {Promise<void>}
 */
async function saveWorkflowConfigurations(storageAccountUrl, containerName, workflows, blobName = 'workflows.json') {
    try {
        // Use managed identity to authenticate
        const credential = new DefaultAzureCredential();
        const blobServiceClient = new BlobServiceClient(storageAccountUrl, credential);

        // Get container and blob clients
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlockBlobClient(blobName);

        // Upload the workflows as JSON
        const content = JSON.stringify(workflows, null, 2);
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
