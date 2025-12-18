// Azure Function: Get Workflow Statuses
// HTTP-triggered function that returns workflow statuses for the dashboard

const crypto = require('crypto');
const { app } = require('@azure/functions');
const { getSecret } = require('../keyvault-client');
const { getWorkflowConfigurations } = require('../storage-client');
const { createInstallationClient, getAppInstallations } = require('../github-auth');

/**
 * Get the latest workflow run for a specific workflow
 * @param {Octokit} octokit - Authenticated Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} workflowFile - Workflow file name
 * @returns {Promise<Object>} Workflow run data
 */
async function getLatestWorkflowRun(octokit, owner, repo, workflowFile) {
    try {
        const { data } = await octokit.rest.actions.listWorkflowRuns({
            owner,
            repo,
            workflow_id: workflowFile,
            per_page: 1,
            page: 1
        });

        if (data.workflow_runs && data.workflow_runs.length > 0) {
            const run = data.workflow_runs[0];
            return {
                conclusion: run.conclusion,
                status: run.status,
                url: run.html_url,
                updatedAt: run.updated_at
            };
        }

        return {
            conclusion: 'unknown',
            status: 'unknown',
            url: `https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`
        };
    } catch (error) {
        console.error(`Failed to get workflow runs for ${owner}/${repo}/${workflowFile}:`, error);
        return {
            conclusion: 'error',
            status: 'error',
            url: `https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`,
            error: error.message
        };
    }
}

/**
 * Find the installation ID for a specific repository
 * @param {Array} installations - List of GitHub App installations
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {number|null} Installation ID or null if not found
 */
function findInstallationForRepo(installations, owner, repo) {
    for (const installation of installations) {
        if (installation.account.login.toLowerCase() === owner.toLowerCase()) {
            return installation.id;
        }
    }
    return null;
}

/**
 * HTTP trigger function to get workflow statuses
 * 
 * Security Note: authLevel is 'function' so callers must provide a function key.
 * For production, also consider:
 * - Implementing rate limiting
 * - Restricting CORS origins to specific domains
 */
app.http('get-workflow-statuses', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: async (request, context) => {
        context.log('Processing request for workflow statuses');

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

            // Get GitHub App credentials from Key Vault
            context.log('Retrieving GitHub App credentials from Key Vault');
            const [appId, privateKey] = await Promise.all([
                getSecret(keyVaultUrl, 'github-app-id'),
                getSecret(keyVaultUrl, 'github-app-private-key')
            ]);

            // Get workflow configurations from Azure Storage
            context.log('Retrieving workflow configurations from Storage');
            const rawWorkflows = await getWorkflowConfigurations(
                storageAccountUrl,
                workflowConfigContainer
            );

            // Validate workflow structure
            const workflows = rawWorkflows.filter(workflow => {
                if (!workflow || typeof workflow !== 'object') {
                    context.log('Invalid workflow object:', workflow);
                    return false;
                }
                if (typeof workflow.owner !== 'string' || !workflow.owner) {
                    context.log('Invalid or missing owner in workflow:', workflow);
                    return false;
                }
                if (typeof workflow.repo !== 'string' || !workflow.repo) {
                    context.log('Invalid or missing repo in workflow:', workflow);
                    return false;
                }
                if (typeof workflow.workflow !== 'string' || !workflow.workflow) {
                    context.log('Invalid or missing workflow in workflow:', workflow);
                    return false;
                }
                return true;
            });

            if (!workflows || workflows.length === 0) {
                context.log('No workflows configured');
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    jsonBody: {
                        workflows: [],
                        message: 'No workflows configured'
                    }
                };
            }

            // Get GitHub App installations
            context.log('Getting GitHub App installations');
            const installations = await getAppInstallations(appId, privateKey);

            // Group workflows by installation
            const workflowsByInstallation = {};
            for (const workflow of workflows) {
                const installationId = findInstallationForRepo(
                    installations,
                    workflow.owner,
                    workflow.repo
                );

                if (!installationId) {
                    context.log(`No installation found for ${workflow.owner}/${workflow.repo}`);
                    continue;
                }

                if (!workflowsByInstallation[installationId]) {
                    workflowsByInstallation[installationId] = [];
                }
                workflowsByInstallation[installationId].push(workflow);
            }

            // Fetch statuses for all workflows
            context.log('Fetching workflow statuses');
            const results = [];

            for (const [installationId, instWorkflows] of Object.entries(workflowsByInstallation)) {
                // Create installation-specific client
                const octokit = await createInstallationClient(
                    appId,
                    privateKey,
                    parseInt(installationId)
                );

                // Fetch statuses in parallel for this installation
                const statusPromises = instWorkflows.map(workflow =>
                    getLatestWorkflowRun(
                        octokit,
                        workflow.owner,
                        workflow.repo,
                        workflow.workflow
                    )
                );

                const statuses = await Promise.allSettled(statusPromises);

                // Combine workflows with their statuses
                statuses.forEach((result, index) => {
                    const workflow = instWorkflows[index];
                    const status = result.status === 'fulfilled'
                        ? result.value
                        : {
                            conclusion: 'error',
                            status: 'error',
                            url: `https://github.com/${workflow.owner}/${workflow.repo}/actions/workflows/${workflow.workflow}`,
                            error: result.reason?.message || 'Unknown error'
                        };

                    results.push({
                        owner: workflow.owner,
                        repo: workflow.repo,
                        workflow: workflow.workflow,
                        label: workflow.label,
                        ...status
                    });
                });
            }

            context.log(`Successfully retrieved ${results.length} workflow statuses`);

            // Return the results
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=60'
                },
                jsonBody: {
                    workflows: results,
                    timestamp: new Date().toISOString(),
                    count: results.length
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
                    message: 'An error occurred while processing your request. Please try again later.'
                }
            };
        }
    }
});
