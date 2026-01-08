// Azure Function: Reorder Workflows
// HTTP-triggered function that reorders workflows within a dashboard

const { app } = require('@azure/functions');
const { getWorkflowConfigurations, saveWorkflowConfigurations } = require('../storage-client');

/**
 * HTTP trigger function to reorder workflows
 * Request body: { workflows: Array<{owner, repo, workflow}> }
 * The workflows array should contain all workflows in the desired order
 * 
 * Security Note: authLevel is 'anonymous' to allow direct access from GitHub Pages.
 * Security is provided by CORS configuration which restricts allowed origins.
 */
app.http('reorder-workflows', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Processing request to reorder workflows');

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
            const { workflows: newWorkflowOrder } = requestBody;

            // Validate request
            if (!newWorkflowOrder || !Array.isArray(newWorkflowOrder)) {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Invalid request',
                        message: 'workflows array is required'
                    }
                };
            }

            // Validate each workflow has required fields
            for (const workflow of newWorkflowOrder) {
                if (!workflow.owner || !workflow.repo || !workflow.workflow) {
                    return {
                        status: 400,
                        jsonBody: {
                            error: 'Invalid workflow',
                            message: 'Each workflow must have owner, repo, and workflow fields'
                        }
                    };
                }
            }

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

            // Create a map of existing workflows for lookup
            const existingWorkflowsMap = new Map();
            (activeDashboard.workflows || []).forEach(workflow => {
                const key = `${workflow.owner}/${workflow.repo}/${workflow.workflow}`;
                existingWorkflowsMap.set(key, workflow);
            });

            // Build the new workflows array maintaining all properties but in new order
            const reorderedWorkflows = newWorkflowOrder.map((workflowRef, index) => {
                const key = `${workflowRef.owner}/${workflowRef.repo}/${workflowRef.workflow}`;
                const existingWorkflow = existingWorkflowsMap.get(key);
                
                if (!existingWorkflow) {
                    throw new Error(`Workflow not found: ${key}. This may indicate the workflow was removed or the client state is outdated.`);
                }

                // Return workflow with explicit order field
                return {
                    ...existingWorkflow,
                    order: index
                };
            });

            // Verify we have the same number of workflows (no additions or removals)
            if (reorderedWorkflows.length !== activeDashboard.workflows.length) {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Invalid reorder',
                        message: 'Workflow count mismatch. Reorder should include all existing workflows.'
                    }
                };
            }

            // Update the active dashboard's workflows
            activeDashboard.workflows = reorderedWorkflows;

            // Save the updated configuration
            context.log('Saving updated workflow configuration to Storage');
            await saveWorkflowConfigurations(
                storageAccountUrl,
                workflowConfigContainer,
                config
            );

            context.log(`Successfully reordered ${reorderedWorkflows.length} workflows in dashboard ${activeDashboard.id}`);

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    success: true,
                    message: `Reordered ${reorderedWorkflows.length} workflows`,
                    dashboardId: activeDashboard.id
                }
            };

        } catch (error) {
            context.log('Error reordering workflows:', error);
            return {
                status: 500,
                jsonBody: {
                    error: 'Failed to reorder workflows',
                    message: error.message
                }
            };
        }
    }
});
