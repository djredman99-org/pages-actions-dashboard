// Azure Function: Create Dashboard
// HTTP-triggered function that creates a new dashboard

const crypto = require('crypto');
const { app } = require('@azure/functions');
const { getWorkflowConfigurations, saveWorkflowConfigurations } = require('../storage-client');

/**
 * HTTP trigger function to create a new dashboard
 * 
 * Security Note: authLevel is 'anonymous' to allow direct access from GitHub Pages.
 * Security is provided by CORS configuration which restricts allowed origins.
 */
app.http('create-dashboard', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Processing request to create dashboard');

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

            // Validate dashboard name
            const name = requestBody.name;
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
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

            // Check if a dashboard with the same name exists
            const existingDashboard = config.dashboards?.find(d => d.name === name.trim());
            if (existingDashboard) {
                return {
                    status: 409,
                    jsonBody: {
                        error: 'Conflict',
                        message: 'A dashboard with this name already exists'
                    }
                };
            }

            // Create new dashboard
            const newDashboard = {
                id: crypto.randomUUID(),
                name: name.trim(),
                workflows: []
            };

            // Add to dashboards array
            config.dashboards.push(newDashboard);

            // Set as active if requested or if it's the only dashboard
            if (requestBody.setAsActive || config.dashboards.length === 1) {
                config.activeDashboardId = newDashboard.id;
            }

            // Save configuration
            context.log('Saving updated configuration to Storage');
            await saveWorkflowConfigurations(
                storageAccountUrl,
                workflowConfigContainer,
                config
            );

            context.log('Successfully created dashboard');

            return {
                status: 201,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    success: true,
                    message: 'Dashboard created successfully',
                    dashboard: {
                        id: newDashboard.id,
                        name: newDashboard.name
                    },
                    isActive: config.activeDashboardId === newDashboard.id
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
                    message: 'An error occurred while creating the dashboard. Please try again later.'
                }
            };
        }
    }
});
