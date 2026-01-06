// Azure Function: Delete Dashboard
// HTTP-triggered function that deletes a dashboard

const { app } = require('@azure/functions');
const { getWorkflowConfigurations, saveWorkflowConfigurations } = require('../storage-client');

/**
 * HTTP trigger function to delete a dashboard
 * 
 * Security Note: authLevel is 'anonymous' to allow direct access from GitHub Pages.
 * Security is provided by CORS configuration which restricts allowed origins.
 */
app.http('delete-dashboard', {
    methods: ['POST', 'DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Processing request to delete dashboard');

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

            // Validate dashboard ID
            const dashboardId = requestBody.dashboardId;
            if (!dashboardId || typeof dashboardId !== 'string') {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Validation error',
                        message: 'dashboardId is required and must be a string'
                    }
                };
            }

            // Get workflow configuration
            context.log('Retrieving workflow configuration from Storage');
            const config = await getWorkflowConfigurations(
                storageAccountUrl,
                workflowConfigContainer
            );

            // Prevent deleting the last dashboard
            if (config.dashboards.length === 1) {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Cannot delete',
                        message: 'Cannot delete the last dashboard. At least one dashboard must exist.'
                    }
                };
            }

            // Find the dashboard to delete
            const dashboardIndex = config.dashboards?.findIndex(d => d.id === dashboardId);
            if (dashboardIndex === -1) {
                context.log('Dashboard not found');
                return {
                    status: 404,
                    jsonBody: {
                        error: 'Not found',
                        message: 'Dashboard not found'
                    }
                };
            }

            const deletedDashboard = config.dashboards[dashboardIndex];

            // Remove the dashboard
            config.dashboards.splice(dashboardIndex, 1);

            // If this was the active dashboard, set a new active dashboard
            if (config.activeDashboardId === dashboardId) {
                config.activeDashboardId = config.dashboards[0].id;
            }

            // Save configuration
            context.log('Saving updated configuration to Storage');
            await saveWorkflowConfigurations(
                storageAccountUrl,
                workflowConfigContainer,
                config
            );

            context.log('Successfully deleted dashboard');

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    success: true,
                    message: 'Dashboard deleted successfully',
                    deletedDashboard: {
                        id: deletedDashboard.id,
                        name: deletedDashboard.name
                    },
                    newActiveDashboardId: config.activeDashboardId
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
                    message: 'An error occurred while deleting the dashboard. Please try again later.'
                }
            };
        }
    }
});
