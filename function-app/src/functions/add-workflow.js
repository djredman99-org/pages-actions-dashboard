// Azure Function: Add Workflow
// HTTP-triggered function that adds a new workflow to the dashboard configuration

const { app } = require('@azure/functions');
const { getWorkflowConfigurations, saveWorkflowConfigurations } = require('../storage-client');
const crypto = require('crypto');

/**
 * Generate a GUID for a workflow
 * @returns {string} GUID in standard format
 */
function generateGuid() {
    return crypto.randomUUID();
}

/**
 * Validate workflow input
 * @param {Object} workflow - Workflow object to validate
 * @returns {Object} Validation result with isValid and error
 */
function validateWorkflow(workflow) {
    if (!workflow || typeof workflow !== 'object') {
        return { isValid: false, error: 'Workflow must be an object' };
    }

    // Validate repo field (should be in org/repo format)
    if (!workflow.repo || typeof workflow.repo !== 'string') {
        return { isValid: false, error: 'repo field is required and must be a string' };
    }

    // Parse repo into owner and repo
    const repoParts = workflow.repo.split('/');
    if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
        return { isValid: false, error: 'repo must be in the format "owner/repo"' };
    }

    // Validate workflow field
    if (!workflow.workflow || typeof workflow.workflow !== 'string') {
        return { isValid: false, error: 'workflow field is required and must be a string' };
    }

    // Validate workflow filename has .yml or .yaml extension
    if (!workflow.workflow.endsWith('.yml') && !workflow.workflow.endsWith('.yaml')) {
        return { isValid: false, error: 'workflow must be a .yml or .yaml file' };
    }

    // Validate label field
    if (!workflow.label || typeof workflow.label !== 'string') {
        return { isValid: false, error: 'label field is required and must be a string' };
    }

    return { isValid: true };
}

/**
 * Check if workflow already exists
 * @param {Array} workflows - Existing workflows
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} workflowFile - Workflow file name
 * @returns {boolean} True if workflow exists
 */
function workflowExists(workflows, owner, repo, workflowFile) {
    return workflows.some(w => 
        w.owner === owner && 
        w.repo === repo && 
        w.workflow === workflowFile
    );
}

/**
 * HTTP trigger function to add a workflow
 * 
 * Security Note: authLevel is 'anonymous' to allow direct access from GitHub Pages.
 * Security is provided by CORS configuration which restricts allowed origins.
 * For production, consider:
 * - Restricting CORS origins to specific domains
 * - Implementing rate limiting via Azure API Management
 * - Adding function key authentication
 */
app.http('add-workflow', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Processing request to add workflow');

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
            const validation = validateWorkflow(requestBody);
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
            const label = requestBody.label;

            // Get existing workflows from Azure Storage
            context.log('Retrieving existing workflows from Storage');
            const workflows = await getWorkflowConfigurations(
                storageAccountUrl,
                workflowConfigContainer
            );

            // Check if workflow already exists
            if (workflowExists(workflows, owner, repo, workflowFile)) {
                context.log(`Workflow already exists: ${owner}/${repo}/${workflowFile}`);
                return {
                    status: 409,
                    jsonBody: {
                        error: 'Conflict',
                        message: 'Workflow already exists in the dashboard'
                    }
                };
            }

            // Generate GUID for the new workflow
            const guid = generateGuid();

            // Create new workflow entry
            const newWorkflow = {
                id: guid,
                owner: owner,
                repo: repo,
                workflow: workflowFile,
                label: label
            };

            // Add to workflows array
            workflows.push(newWorkflow);

            // Save updated workflows back to Storage
            context.log('Saving updated workflows to Storage');
            await saveWorkflowConfigurations(
                storageAccountUrl,
                workflowConfigContainer,
                workflows
            );

            context.log(`Successfully added workflow: ${owner}/${repo}/${workflowFile}`);

            return {
                status: 201,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    success: true,
                    message: 'Workflow added successfully',
                    workflow: newWorkflow
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
                    message: 'An error occurred while adding the workflow. Please try again later.'
                }
            };
        }
    }
});
