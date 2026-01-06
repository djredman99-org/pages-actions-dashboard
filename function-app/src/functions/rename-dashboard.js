// Azure Function: Rename Dashboard
// HTTP-triggered function that renames a dashboard

const { app } = require('@azure/functions');
const { getWorkflowConfigurations, saveWorkflowConfigurations } = require('../storage-client');

/**
 * HTTP trigger function to rename a dashboard
 * 
 * Security Note: authLevel is 'anonymous' to allow direct access from GitHub Pages.
 * Security is provided by CORS configuration which restricts allowed origins.
 */
app.http('rename-dashboard', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Processing request to rename dashboard');

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

            // Validate new name
            const newName = requestBody.name;
            if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Validation error',
                        message: 'name is required and must be a non-empty string'
                    }
                };
            }

            // Get workflow configuration
            context.log('Retrieving workflow configuration from Storage');
            const config = await getWorkflowConfigurations(
                storageAccountUrl,
                workflowConfigContainer
            );

            // Find the dashboard to rename
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

            // Check if a dashboard with the new name already exists (different from current)
            const existingDashboard = config.dashboards?.find(d => d.id !== dashboardId && d.name === newName.trim());
            if (existingDashboard) {
                return {
                    status: 409,
                    jsonBody: {
                        error: 'Conflict',
                        message: 'A dashboard with this name already exists'
                    }
                };
            }

            // Update the name
            dashboard.name = newName.trim();

            // Save configuration
            context.log('Saving updated configuration to Storage');
            await saveWorkflowConfigurations(
                storageAccountUrl,
                workflowConfigContainer,
                config
            );

            context.log('Successfully renamed dashboard');

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    success: true,
                    message: 'Dashboard renamed successfully',
                    dashboard: {
                        id: dashboard.id,
                        name: dashboard.name
                    }
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
                    message: 'An error occurred while renaming the dashboard. Please try again later.'
                }
            };
        }
    }
});
