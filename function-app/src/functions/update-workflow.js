// Azure Function: Update Workflow
// HTTP-triggered function that updates a workflow's properties (currently just label)

const { app } = require('@azure/functions');
const { getWorkflowConfigurations, saveWorkflowConfigurations } = require('../storage-client');

/**
 * HTTP trigger function to update a workflow's properties
 * Request body: { repo: "owner/repo", workflow: "workflow.yml", label: "New Label" }
 * 
 * Security Note: authLevel is 'anonymous' to allow direct access from GitHub Pages.
 * Security is provided by CORS configuration which restricts allowed origins.
 */
app.http('update-workflow', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Processing request to update workflow');

        try {
            // Get configuration from environment variables
            const storageAccountUrl = process.env.STORAGE_ACCOUNT_URL;
            const workflowConfigContainer = process.env.WORKFLOW_CONFIG_CONTAINER;

            // Validate environment variables
            if (!storageAccountUrl || typeof storageAccountUrl !== 'string' || storageAccountUrl.trim().length === 0 ||
                !workflowConfigContainer || typeof workflowConfigContainer !== 'string' || workflowConfigContainer.trim().length === 0) {
                context.log('Missing or invalid required environment variables');
                return {
                    status: 500,
                    jsonBody: {
                        error: 'Server configuration error',
                        message: 'Required environment variables are not properly configured'
                    }
                };
            }

            // Parse request body
            const requestBody = await request.json();
            const { repo, workflow, label } = requestBody;

            // Validate required fields
            if (!repo || typeof repo !== 'string' || repo.trim().length === 0) {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Validation error',
                        message: 'repo field is required and must be a non-empty string'
                    }
                };
            }

            if (!workflow || typeof workflow !== 'string' || workflow.trim().length === 0) {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Validation error',
                        message: 'workflow field is required and must be a non-empty string'
                    }
                };
            }

            if (!label || typeof label !== 'string' || label.trim().length === 0) {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Validation error',
                        message: 'label field is required and must be a non-empty string'
                    }
                };
            }

            // Validate repo format (owner/repo)
            const repoParts = repo.trim().split('/');
            if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Validation error',
                        message: 'repo must be in the format "owner/repo"'
                    }
                };
            }

            const owner = repoParts[0];
            const repoName = repoParts[1];

            // Get current configuration
            context.log('Retrieving current workflow configuration from Storage');
            const config = await getWorkflowConfigurations(
                storageAccountUrl,
                workflowConfigContainer
            );

            // Find the active dashboard
            const activeDashboard = config.dashboards?.find(d => d.id === config.activeDashboardId);

            if (!activeDashboard) {
                return {
                    status: 404,
                    jsonBody: {
                        error: 'Dashboard not found',
                        message: 'No active dashboard found'
                    }
                };
            }

            // Find the workflow to update
            const workflowIndex = activeDashboard.workflows.findIndex(w =>
                w.owner === owner &&
                w.repo === repoName &&
                w.workflow === workflow.trim()
            );

            if (workflowIndex === -1) {
                return {
                    status: 404,
                    jsonBody: {
                        error: 'Not found',
                        message: 'Workflow not found in the active dashboard'
                    }
                };
            }

            // Update the workflow label
            const oldLabel = activeDashboard.workflows[workflowIndex].label;
            activeDashboard.workflows[workflowIndex].label = label.trim();

            // Save the updated configuration
            context.log('Saving updated workflow configuration to Storage');
            await saveWorkflowConfigurations(
                storageAccountUrl,
                workflowConfigContainer,
                config
            );

            context.log(`Successfully updated workflow ${owner}/${repoName}/${workflow.trim()} in dashboard ${activeDashboard.id}`);

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    success: true,
                    message: 'Workflow updated successfully',
                    dashboardId: activeDashboard.id,
                    workflow: {
                        owner,
                        repo: repoName,
                        workflow: workflow.trim(),
                        oldLabel,
                        newLabel: label.trim()
                    }
                }
            };

        } catch (error) {
            context.log('Error updating workflow:', error);
            return {
                status: 500,
                jsonBody: {
                    error: 'Failed to update workflow',
                    message: error.message
                }
            };
        }
    }
});
