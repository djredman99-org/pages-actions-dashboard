// GitHub Actions Dashboard API Client
// Handles API calls to Azure Function backend

class GitHubActionsAPI {
    constructor(functionUrl) {
        this.functionUrl = functionUrl;
        this.debug = true; // Set to true to enable debug logging
        this.inflightRequest = null; // Track in-flight requests to prevent duplicates
    }

    /**
     * Get all workflow statuses from Azure Function
     * @returns {Promise<Object>} - Response object with workflows, dashboards, and activeDashboardId
     */
    async getAllWorkflowStatuses() {
        // If there's already a request in flight, return that promise
        if (this.inflightRequest) {
            if (this.debug) {
                console.log('Request already in flight, waiting for it to complete');
            }
            return this.inflightRequest;
        }

        // Create new request
        this.inflightRequest = (async () => {
            try {
                // Add timestamp to URL to ensure cache-busting
                const cacheBustingUrl = `${this.functionUrl}/api/get-workflow-statuses?t=${Date.now()}`;
                const response = await fetch(cacheBustingUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });

                if (!response.ok) {
                    if (response.status === 500) {
                        throw new Error('Azure Function error. Check function configuration.');
                    } else if (response.status === 404) {
                        throw new Error('Azure Function not found. Check URL configuration.');
                    }
                    throw new Error(`Azure Function error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                
                if (this.debug) {
                    console.log('Received workflow statuses from Azure Function:', data);
                }

                return data;
            } finally {
                // Clear the in-flight request tracker
                this.inflightRequest = null;
            }
        })();

        return this.inflightRequest;
    }

    /**
     * Get the status for a specific workflow
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {string} workflowFile - Workflow file name
     * @returns {Promise<Object>} - Status object with conclusion, status, and run URL
     */
    async getWorkflowStatus(owner, repo, workflowFile) {
        try {
            const data = await this.getAllWorkflowStatuses();
            const allStatuses = data.workflows || [];
            
            // Find the specific workflow in the results
            const workflow = allStatuses.find(w => 
                w.owner === owner && 
                w.repo === repo && 
                w.workflow === workflowFile
            );

            if (workflow) {
                return {
                    conclusion: workflow.conclusion,
                    status: workflow.status,
                    url: workflow.url,
                    updatedAt: workflow.updatedAt
                };
            }

            // If not found, return unknown status
            return {
                conclusion: 'unknown',
                status: 'unknown',
                url: `https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`
            };
        } catch (error) {
            console.error(`Failed to get status for ${owner}/${repo}/${workflowFile}:`, error);
            return {
                conclusion: 'error',
                status: 'error',
                url: `https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`,
                error: error.message
            };
        }
    }
                status: 'error',
                url: `https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`,
                error: error.message
            };
        }
    }

    /**
     * Add a workflow to the dashboard via Azure Function
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {string} workflow - Workflow file name
     * @param {string} label - Display label for the workflow
     * @returns {Promise<Object>} - Response object with success status
     */
    async addWorkflow(owner, repo, workflow, label) {
        try {
            const response = await fetch(`${this.functionUrl}/api/add-workflow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    repo: `${owner}/${repo}`,
                    workflow: workflow,
                    label: label
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to add workflow: ${response.status}`);
            }

            const data = await response.json();
            
            if (this.debug) {
                console.log('Workflow added successfully:', data);
            }

            return data;
        } catch (error) {
            console.error('Failed to add workflow:', error);
            throw error;
        }
    }

    /**
     * Remove a workflow from the dashboard via Azure Function
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {string} workflow - Workflow file name
     * @returns {Promise<Object>} - Response object with success status
     */
    async removeWorkflow(owner, repo, workflow) {
        try {
            const response = await fetch(`${this.functionUrl}/api/remove-workflow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    repo: `${owner}/${repo}`,
                    workflow: workflow
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to remove workflow: ${response.status}`);
            }

            const data = await response.json();
            
            if (this.debug) {
                console.log('Workflow removed successfully:', data);
            }

            return data;
        } catch (error) {
            console.error('Failed to remove workflow:', error);
            throw error;
        }
    }

    /**
     * Set the active dashboard
     * @param {string} dashboardId - Dashboard ID to set as active
     * @returns {Promise<Object>} - Response object with success status
     */
    async setActiveDashboard(dashboardId) {
        try {
            const response = await fetch(`${this.functionUrl}/api/set-active-dashboard`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ dashboardId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to set active dashboard: ${response.status}`);
            }

            const data = await response.json();
            
            if (this.debug) {
                console.log('Active dashboard set successfully:', data);
            }

            return data;
        } catch (error) {
            console.error('Failed to set active dashboard:', error);
            throw error;
        }
    }

    /**
     * Create a new dashboard
     * @param {string} name - Dashboard name
     * @param {boolean} setAsActive - Whether to set this as the active dashboard
     * @returns {Promise<Object>} - Response object with success status and new dashboard info
     */
    async createDashboard(name, setAsActive = false) {
        try {
            const response = await fetch(`${this.functionUrl}/api/create-dashboard`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, setAsActive })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to create dashboard: ${response.status}`);
            }

            const data = await response.json();
            
            if (this.debug) {
                console.log('Dashboard created successfully:', data);
            }

            return data;
        } catch (error) {
            console.error('Failed to create dashboard:', error);
            throw error;
        }
    }

    /**
     * Rename a dashboard
     * @param {string} dashboardId - Dashboard ID to rename
     * @param {string} name - New dashboard name
     * @returns {Promise<Object>} - Response object with success status
     */
    async renameDashboard(dashboardId, name) {
        try {
            const response = await fetch(`${this.functionUrl}/api/rename-dashboard`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ dashboardId, name })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to rename dashboard: ${response.status}`);
            }

            const data = await response.json();
            
            if (this.debug) {
                console.log('Dashboard renamed successfully:', data);
            }

            return data;
        } catch (error) {
            console.error('Failed to rename dashboard:', error);
            throw error;
        }
    }

    /**
     * Delete a dashboard
     * @param {string} dashboardId - Dashboard ID to delete
     * @returns {Promise<Object>} - Response object with success status
     */
    async deleteDashboard(dashboardId) {
        try {
            const response = await fetch(`${this.functionUrl}/api/delete-dashboard`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ dashboardId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to delete dashboard: ${response.status}`);
            }

            const data = await response.json();
            
            if (this.debug) {
                console.log('Dashboard deleted successfully:', data);
            }

            return data;
        } catch (error) {
            console.error('Failed to delete dashboard:', error);
            throw error;
        }
    }
}

/**
 * Determine the display status based on workflow conclusion
 * @param {string|null} conclusion - Workflow conclusion (success, failure, cancelled, etc.)
 * @param {string} status - Workflow status (queued, in_progress, completed)
 * @param {boolean} debug - Enable debug logging
 * @returns {Object} - Display status with color and text
 */
function getDisplayStatus(conclusion, status, debug = false) {
    // Debug logging
    if (debug) {
        console.log(`getDisplayStatus called with: status="${status}", conclusion="${conclusion}"`);
    }
    
    // Handle unknown/error state explicitly
    if (status === 'unknown' || conclusion === 'unknown') {
        return {
            color: '#6c757d', // Gray for unknown
            text: 'no runs',
            class: 'status-unknown'
        };
    }
    
    // If workflow is queued or in progress
    if (status === 'queued' || status === 'in_progress' || status === 'waiting') {
        return {
            color: '#dbab09', // Yellow for in-progress
            text: 'running',
            class: 'status-running'
        };
    }
    
    // If workflow status is completed, check the conclusion
    if (status === 'completed') {
        switch (conclusion) {
            case 'success':
                return {
                    color: '#2ea043', // Green for success
                    text: 'passing',
                    class: 'status-success'
                };
            case 'failure':
                return {
                    color: '#d73a49', // Red for failure
                    text: 'failing',
                    class: 'status-failure'
                };
            case 'cancelled':
                return {
                    color: '#6c757d', // Gray for cancelled
                    text: 'cancelled',
                    class: 'status-cancelled'
                };
            case 'skipped':
                return {
                    color: '#6c757d', // Gray for skipped
                    text: 'skipped',
                    class: 'status-skipped'
                };
            case 'timed_out':
                return {
                    color: '#d73a49', // Red for timeout
                    text: 'timed out',
                    class: 'status-timeout'
                };
            case null:
                // null conclusion with completed status means workflow didn't run
                return {
                    color: '#6c757d', // Gray for not run
                    text: 'not run',
                    class: 'status-unknown'
                };
            default:
                return {
                    color: '#6c757d', // Gray for unknown conclusion
                    text: conclusion || 'unknown',
                    class: 'status-unknown'
                };
        }
    }
    
    // If we get here, status has an unexpected value
    return {
        color: '#6c757d', // Gray for unknown
        text: 'unknown',
        class: 'status-unknown'
    };
}
