// Azure Function: Remove Workflow
// HTTP-triggered function that removes a workflow from the dashboard configuration

const { app } = require('@azure/functions');
const { getWorkflowConfigurations, saveWorkflowConfigurations } = require('../storage-client');
const crypto = require('crypto');

/**
 * Validate remove workflow input
 * @param {Object} request - Request object to validate
 * @returns {Object} Validation result with isValid and error
 */
function validateRemoveRequest(request) {
    if (!request || typeof request !== 'object') {
        return { isValid: false, error: 'Request must be an object' };
    }

    // Validate repo field (should be in org/repo format)
    if (!request.repo || typeof request.repo !== 'string') {
        return { isValid: false, error: 'repo field is required and must be a string' };
    }

    // Parse repo into owner and repo
    const repoParts = request.repo.split('/');
    if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
        return { isValid: false, error: 'repo must be in the format "owner/repo"' };
    }

    // Validate workflow field
    if (!request.workflow || typeof request.workflow !== 'string') {
        return { isValid: false, error: 'workflow field is required and must be a string' };
    }

    return { isValid: true };
}

/**
 * Find workflow index in the workflows array
 * @param {Array} workflows - Existing workflows
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} workflowFile - Workflow file name
 * @returns {number} Index of workflow or -1 if not found
 */
function findWorkflowIndex(workflows, owner, repo, workflowFile) {
    return workflows.findIndex(w => 
        w.owner === owner && 
        w.repo === repo && 
        w.workflow === workflowFile
    );
}

/**
 * HTTP trigger function to remove a workflow
 * 
 * Security Note: authLevel is 'anonymous' to allow direct access from GitHub Pages.
 * Security is provided by CORS configuration which restricts allowed origins.
 * For production, consider:
 * - Restricting CORS origins to specific domains
 * - Implementing rate limiting via Azure API Management
 * - Adding function key authentication
 */
app.http('remove-workflow', {
    methods: ['POST', 'DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Processing request to remove workflow');

        try {
            // Get configuration from environment variables
            const storageAccountUrl = process.env.STORAGE_ACCOUNT_URL;
            const workflowConfigContainer = process.env.WORKFLOW_CONFIG_CONTAINER;

            if (!storageAccountUrl || !workflowConfigContainer) {
                context.log('Missing required environment variables');
                return {
                    status: 500,
                    jsonBody: {
                        error: 'Server configuration error',
                        message: 'Required environment variables are not set'
                    }
                };
            }

            // Parse request body
            let requestBody;
            try {
                requestBody = await request.json();
            } catch (error) {
                context.log('Failed to parse request body:', error);
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Invalid request',
                        message: 'Request body must be valid JSON'
                    }
                };
            }

            // Validate input
            const validation = validateRemoveRequest(requestBody);
            if (!validation.isValid) {
                context.log('Validation failed:', validation.error);
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Validation error',
                        message: validation.error
                    }
                };
            }

            // Parse repo into owner and repo
            const [owner, repo] = requestBody.repo.split('/');
            const workflowFile = requestBody.workflow;

            // Get existing workflow configuration from Azure Storage
            context.log('Retrieving workflow configuration from Storage');
            let config = await getWorkflowConfigurations(
                storageAccountUrl,
                workflowConfigContainer
            );

            // Ensure configuration is in correct format and has dashboardId
            let needsSave = false;
            if (Array.isArray(config)) {
                context.log('Converting array format to object format');
                config = {
                    dashboardId: crypto.randomUUID(),
                    workflows: config
                };
                needsSave = true;
            }

            // Generate dashboardId if it doesn't exist
            if (!config.dashboardId) {
                context.log('Generating dashboardId');
                config.dashboardId = crypto.randomUUID();
                needsSave = true;
            }

            // Save configuration if GUID was generated
            if (needsSave) {
                context.log('Saving configuration with generated dashboardId');
                await saveWorkflowConfigurations(
                    storageAccountUrl,
                    workflowConfigContainer,
                    config
                );
            }

            const workflows = config.workflows || [];

            // Find the workflow to remove
            const workflowIndex = findWorkflowIndex(workflows, owner, repo, workflowFile);

            if (workflowIndex === -1) {
                context.log(`Workflow not found: ${owner}/${repo}/${workflowFile}`);
                return {
                    status: 404,
                    jsonBody: {
                        error: 'Not found',
                        message: 'Workflow not found in the dashboard'
                    }
                };
            }

            // Remove the workflow
            const removedWorkflow = workflows[workflowIndex];
            workflows.splice(workflowIndex, 1);
            config.workflows = workflows;

            // Save updated configuration back to Storage
            context.log('Saving updated workflow configuration to Storage');
            await saveWorkflowConfigurations(
                storageAccountUrl,
                workflowConfigContainer,
                config
            );

            context.log(`Successfully removed workflow: ${owner}/${repo}/${workflowFile}`);

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    success: true,
                    message: 'Workflow removed successfully',
                    dashboardId: config.dashboardId,
                    workflow: removedWorkflow
                }
            };

        } catch (error) {
            context.log('Error processing request:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    error: 'Internal server error',
                    message: 'An error occurred while removing the workflow. Please try again later.'
                }
            };
        }
    }
});
