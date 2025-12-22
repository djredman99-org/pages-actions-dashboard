// Azure Function: Add Workflow
// HTTP-triggered function that adds a new workflow to the dashboard configuration

const { app } = require('@azure/functions');
const { getWorkflowConfigurations, saveWorkflowConfigurations } = require('../storage-client');
const { getSecret } = require('../keyvault-client');
const { createInstallationClient, getAppInstallations } = require('../github-auth');
const crypto = require('crypto');

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
 * Verify that the workflow exists in GitHub and the app has access
 * @param {string} appId - GitHub App ID
 * @param {string} privateKey - GitHub App private key
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} workflowFile - Workflow file name
 * @returns {Promise<Object>} Verification result with success, error, and statusCode
 */
async function verifyWorkflowAccess(appId, privateKey, owner, repo, workflowFile) {
    try {
        // Get all installations to find the one for this repo
        const installations = await getAppInstallations(appId, privateKey);
        
        // Find installation for the repository owner
        const installation = installations.find(
            inst => inst.account.login.toLowerCase() === owner.toLowerCase()
        );
        
        if (!installation) {
            return {
                success: false,
                statusCode: 404,
                error: 'GitHub App is not installed on the specified organization or user account'
            };
        }
        
        // Create installation-specific client
        const octokit = await createInstallationClient(appId, privateKey, installation.id);
        
        // Try to get the workflow file to verify it exists and we have access
        try {
            await octokit.rest.actions.getWorkflow({
                owner,
                repo,
                workflow_id: workflowFile
            });
            
            return { success: true };
        } catch (error) {
            if (error.status === 404) {
                return {
                    success: false,
                    statusCode: 404,
                    error: `Workflow '${workflowFile}' not found in repository ${owner}/${repo}`
                };
            } else if (error.status === 403) {
                return {
                    success: false,
                    statusCode: 403,
                    error: 'GitHub App does not have permission to access this repository or workflow'
                };
            } else {
                return {
                    success: false,
                    statusCode: 502,
                    error: 'Failed to verify workflow with GitHub API'
                };
            }
        }
    } catch (error) {
        return {
            success: false,
            statusCode: 502,
            error: 'Failed to communicate with GitHub API'
        };
    }
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
            const keyVaultUrl = process.env.KEY_VAULT_URL;
            const storageAccountUrl = process.env.STORAGE_ACCOUNT_URL;
            const workflowConfigContainer = process.env.WORKFLOW_CONFIG_CONTAINER;

            if (!keyVaultUrl || !storageAccountUrl || !workflowConfigContainer) {
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

            // Get GitHub App credentials from Key Vault
            context.log('Retrieving GitHub App credentials from Key Vault');
            let appId, privateKey;
            try {
                [appId, privateKey] = await Promise.all([
                    getSecret(keyVaultUrl, 'github-app-id'),
                    getSecret(keyVaultUrl, 'github-app-private-key')
                ]);
            } catch (error) {
                context.log('Failed to retrieve GitHub App credentials:', error);
                return {
                    status: 500,
                    jsonBody: {
                        error: 'Server configuration error',
                        message: 'Failed to retrieve GitHub App credentials'
                    }
                };
            }

            // Verify workflow exists and app has access
            context.log(`Verifying workflow access for ${owner}/${repo}/${workflowFile}`);
            const verification = await verifyWorkflowAccess(appId, privateKey, owner, repo, workflowFile);
            if (!verification.success) {
                context.log(`Workflow verification failed: ${verification.error}`);
                return {
                    status: verification.statusCode,
                    jsonBody: {
                        error: 'Workflow not accessible',
                        message: verification.error
                    }
                };
            }

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

            // Create new workflow entry (no id field per workflow)
            const newWorkflow = {
                owner,
                repo,
                workflow: workflowFile,
                label
            };

            // Add to workflows array
            workflows.push(newWorkflow);
            config.workflows = workflows;

            // Save updated configuration back to Storage
            context.log('Saving updated workflow configuration to Storage');
            await saveWorkflowConfigurations(
                storageAccountUrl,
                workflowConfigContainer,
                config
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
                    dashboardId: config.dashboardId,
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
