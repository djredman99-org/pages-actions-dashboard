// GitHub Actions Dashboard API Client
// Handles authentication and API calls to GitHub

class GitHubActionsAPI {
    constructor(token, baseUrl = 'https://api.github.com') {
        this.token = token;
        this.baseUrl = baseUrl;
    }

    /**
     * Make an authenticated request to the GitHub API
     * @param {string} endpoint - API endpoint path
     * @returns {Promise<Object>} - API response
     */
    async request(endpoint) {
        const url = `${this.baseUrl}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication failed. Please check your GitHub token.');
                } else if (response.status === 403) {
                    throw new Error('Rate limit exceeded or insufficient permissions.');
                } else if (response.status === 404) {
                    throw new Error('Workflow not found. Repository may be inaccessible.');
                }
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Get the latest workflow run for a specific workflow
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {string} workflowFile - Workflow file name (e.g., 'ci.yml')
     * @returns {Promise<Object>} - Workflow run data
     */
    async getLatestWorkflowRun(owner, repo, workflowFile) {
        const endpoint = `/repos/${owner}/${repo}/actions/workflows/${workflowFile}/runs?per_page=1&page=1`;
        
        try {
            const data = await this.request(endpoint);
            
            if (data.workflow_runs && data.workflow_runs.length > 0) {
                return data.workflow_runs[0];
            }
            
            return null;
        } catch (error) {
            console.error(`Failed to get workflow runs for ${owner}/${repo}/${workflowFile}:`, error);
            return null;
        }
    }

    /**
     * Get the status and conclusion of a workflow
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {string} workflowFile - Workflow file name
     * @returns {Promise<Object>} - Status object with conclusion, status, and run URL
     */
    async getWorkflowStatus(owner, repo, workflowFile) {
        const run = await this.getLatestWorkflowRun(owner, repo, workflowFile);
        
        if (!run) {
            return {
                conclusion: 'unknown',
                status: 'unknown',
                url: `https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`
            };
        }

        return {
            conclusion: run.conclusion,
            status: run.status,
            url: run.html_url,
            updatedAt: run.updated_at
        };
    }
}

/**
 * Determine the display status based on workflow conclusion
 * @param {string|null} conclusion - Workflow conclusion (success, failure, cancelled, etc.)
 * @param {string} status - Workflow status (queued, in_progress, completed)
 * @returns {Object} - Display status with color and text
 */
function getDisplayStatus(conclusion, status) {
    // If workflow is still running
    if (status !== 'completed') {
        return {
            color: '#dbab09', // Yellow for in-progress
            text: 'running',
            class: 'status-running'
        };
    }

    // Map conclusions to display status
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
                color: '#6c757d', // Gray for unknown
                text: 'unknown',
                class: 'status-unknown'
            };
    }
}
