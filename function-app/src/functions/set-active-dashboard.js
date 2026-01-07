// Azure Function: Set Active Dashboard
// HTTP-triggered function that switches the active dashboard

const { app } = require('@azure/functions');
const { getWorkflowConfigurations, saveWorkflowConfigurations } = require('../storage-client');

/**
 * HTTP trigger function to set the active dashboard
 * 
 * Security Note: authLevel is 'anonymous' to allow direct access from GitHub Pages.
 * Security is provided by CORS configuration which restricts allowed origins.
 */
app.http('set-active-dashboard', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Processing request to set active dashboard');

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

            // Find the dashboard
            const dashboard = config.dashboards?.find(d => d.id === dashboardId);
            if (!dashboard) {
                context.log('Dashboard not found');
                return {
                    status: 404,
                    jsonBody: {
                        error: 'Not found',
                        message: 'Dashboard not found'
                    }
                };
            }

            // Set as active
            config.activeDashboardId = dashboardId;

            // Save configuration
            context.log('Saving updated configuration to Storage');
            await saveWorkflowConfigurations(
                storageAccountUrl,
                workflowConfigContainer,
                config
            );

            context.log('Successfully set active dashboard');

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    success: true,
                    message: 'Active dashboard updated successfully',
                    activeDashboardId: dashboardId,
                    dashboardName: dashboard.name
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
                    message: 'An error occurred while setting the active dashboard. Please try again later.'
                }
            };
        }
    }
});
