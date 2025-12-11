// GitHub Actions Dashboard Loader
// Loads workflow statuses and renders them dynamically

class DashboardLoader {
    constructor(config, apiClient) {
        this.config = config;
        this.api = apiClient;
        this.workflows = config.workflows;
    }

    /**
     * Create a workflow card element
     * @param {Object} workflow - Workflow configuration
     * @param {Object} status - Workflow status
     * @returns {HTMLElement} - Workflow card element
     */
    createWorkflowCard(workflow, status) {
        const workflowItem = document.createElement('div');
        workflowItem.className = 'workflow-item';

        const link = document.createElement('a');
        link.href = status.url;
        link.className = 'workflow-card-link';
        link.setAttribute('aria-label', `View ${workflow.label} workflow runs`);

        const label = document.createElement('div');
        label.className = 'workflow-label';
        label.textContent = workflow.label;

        const statusBadge = document.createElement('span');
        statusBadge.className = 'workflow-status';
        
        const displayStatus = getDisplayStatus(status.conclusion, status.status, this.api.debug);
        statusBadge.classList.add(displayStatus.class);
        statusBadge.textContent = displayStatus.text;

        link.appendChild(label);
        link.appendChild(statusBadge);
        workflowItem.appendChild(link);

        return workflowItem;
    }

    /**
     * Create a loading placeholder card
     * @param {Object} workflow - Workflow configuration
     * @returns {HTMLElement} - Loading card element
     */
    createLoadingCard(workflow) {
        const workflowItem = document.createElement('div');
        workflowItem.className = 'workflow-item';

        const link = document.createElement('a');
        link.href = '#';
        link.className = 'workflow-card-link';
        link.setAttribute('aria-label', `Loading ${workflow.label} workflow status`);

        const label = document.createElement('div');
        label.className = 'workflow-label';
        label.textContent = workflow.label;

        const statusBadge = document.createElement('span');
        statusBadge.className = 'workflow-status status-loading';
        statusBadge.textContent = 'loading...';

        link.appendChild(label);
        link.appendChild(statusBadge);
        workflowItem.appendChild(link);

        return workflowItem;
    }

    /**
     * Load all workflow statuses and render them
     */
    async loadWorkflows() {
        const grid = document.querySelector('.workflow-grid');
        
        if (!grid) {
            console.error('Workflow grid element not found');
            return;
        }

        // Clear existing content
        grid.innerHTML = '';

        // Check if token is configured
        if (this.api.token === '__GITHUB_TOKEN__' || !this.api.token) {
            this.showTokenError(grid);
            return;
        }

        // Create loading placeholders
        const placeholders = this.workflows.map(workflow => {
            const card = this.createLoadingCard(workflow);
            grid.appendChild(card);
            return { workflow, card };
        });

        // Load all workflow statuses in parallel
        const statusPromises = placeholders.map(({ workflow }) => 
            this.api.getWorkflowStatus(
                workflow.owner,
                workflow.repo,
                workflow.workflow
            )
        );

        const results = await Promise.allSettled(statusPromises);

        // Update cards with results
        results.forEach((result, index) => {
            const { workflow, card } = placeholders[index];
            
            if (result.status === 'fulfilled') {
                const newCard = this.createWorkflowCard(workflow, result.value);
                grid.replaceChild(newCard, card);
            } else {
                console.error(`Failed to load workflow ${workflow.label}:`, result.reason);
                this.showErrorCard(grid, card, workflow, result.reason);
            }
        });

        // Update last updated time
        const lastUpdatedElement = document.getElementById('last-updated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = new Date().toLocaleString();
        }
    }

    /**
     * Show an error message when token is not configured
     * @param {HTMLElement} grid - Workflow grid element
     */
    showTokenError(grid) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'config-error';
        errorDiv.innerHTML = `
            <h3>⚠️ Configuration Required</h3>
            <p>GitHub token not configured. Please follow these steps:</p>
            <ol>
                <li>Create a GitHub App or Personal Access Token with <code>actions:read</code> permission</li>
                <li>Configure the token in your build/deployment process</li>
                <li>The token should replace <code>__GITHUB_TOKEN__</code> in config.js</li>
            </ol>
            <p>See the README for detailed setup instructions.</p>
        `;
        grid.appendChild(errorDiv);
    }

    /**
     * Show an error card for a failed workflow
     * @param {HTMLElement} grid - Workflow grid element
     * @param {HTMLElement} card - Original card element
     * @param {Object} workflow - Workflow configuration
     * @param {Error} error - Error that occurred
     */
    showErrorCard(grid, card, workflow, error) {
        const errorCard = this.createWorkflowCard(workflow, {
            conclusion: 'unknown',
            status: 'error',
            url: `https://github.com/${workflow.owner}/${workflow.repo}/actions/workflows/${workflow.workflow}`
        });
        grid.replaceChild(errorCard, card);
    }

    /**
     * Set up auto-refresh
     * @param {number} intervalMinutes - Refresh interval in minutes
     */
    setupAutoRefresh(intervalMinutes = 5) {
        setInterval(() => {
            console.log('Auto-refreshing workflow statuses...');
            this.loadWorkflows();
        }, intervalMinutes * 60 * 1000);
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize API client
        const apiClient = new GitHubActionsAPI(
            DASHBOARD_CONFIG.github.token,
            DASHBOARD_CONFIG.github.apiBaseUrl
        );
        
        // Enable debug mode if configured
        if (DASHBOARD_CONFIG.github.debug) {
            apiClient.debug = true;
        }

        // Initialize dashboard loader
        const dashboard = new DashboardLoader(DASHBOARD_CONFIG, apiClient);

        // Load workflows
        await dashboard.loadWorkflows();

        // Set up auto-refresh every 5 minutes
        dashboard.setupAutoRefresh(5);

        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
    }
});
