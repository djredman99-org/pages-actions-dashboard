// GitHub Actions Dashboard API Client
// Handles API calls to Azure Function backend

class GitHubActionsAPI {
    constructor(functionUrl, functionKey) {
        this.functionUrl = functionUrl;
        this.functionKey = functionKey;
        this.debug = true; // Set to true to enable debug logging
        this.cache = null;
        this.cacheTimestamp = null;
        this.cacheTTL = 60000; // 1 minute cache
        this.inflightRequest = null; // Track in-flight requests to prevent duplicates
    }

    /**
     * Get all workflow statuses from Azure Function
     * @returns {Promise<Array>} - Array of workflow statuses
     */
    async getAllWorkflowStatuses() {
        // Check cache
        if (this.cache && this.cacheTimestamp && (Date.now() - this.cacheTimestamp < this.cacheTTL)) {
            if (this.debug) {
                console.log('Returning cached workflow statuses');
            }
            return this.cache;
        }

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
                // Build URL with function key
                const url = this.functionKey 
                    ? `${this.functionUrl}/api/get-workflow-statuses?code=${this.functionKey}`
                    : `${this.functionUrl}/api/get-workflow-statuses`;
                    
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
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

                // Cache the results
                this.cache = data.workflows || [];
                this.cacheTimestamp = Date.now();

                return this.cache;
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
            const allStatuses = await this.getAllWorkflowStatuses();
            
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

    /**
     * Clear the cache (useful for manual refresh)
     */
    clearCache() {
        this.cache = null;
        this.cacheTimestamp = null;
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
