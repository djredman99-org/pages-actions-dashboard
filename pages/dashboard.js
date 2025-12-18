// GitHub Actions Dashboard Loader
// Loads workflow statuses and renders them dynamically

class DashboardLoader {
    constructor(config, apiClient, workflowManager) {
        this.config = config;
        this.api = apiClient;
        this.workflowManager = workflowManager;
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

        try {
            // Get all workflow statuses from Azure Function
            // The function returns workflows with their statuses already populated
            const workflowStatuses = await this.api.getAllWorkflowStatuses();

            if (!workflowStatuses || workflowStatuses.length === 0) {
                this.showNoWorkflowsMessage(grid);
                return;
            }

            // Create workflow cards
            workflowStatuses.forEach(workflow => {
                const card = this.createWorkflowCard(workflow, {
                    conclusion: workflow.conclusion,
                    status: workflow.status,
                    url: workflow.url,
                    updatedAt: workflow.updatedAt
                });
                grid.appendChild(card);
            });

            // Update last updated time
            const lastUpdatedElement = document.getElementById('last-updated');
            if (lastUpdatedElement) {
                lastUpdatedElement.textContent = new Date().toLocaleString();
            }

        } catch (error) {
            console.error('Failed to load workflows:', error);
            this.showApiError(grid, error);
        }
    }

    /**
     * Show a message when no workflows are configured
     * @param {HTMLElement} grid - Workflow grid element
     */
    showNoWorkflowsMessage(grid) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'config-error';
        messageDiv.innerHTML = `
            <h3>ℹ️ No Workflows Configured</h3>
            <p>No workflows are currently configured in Azure Storage.</p>
            <p>To add workflows, upload a workflows.json file to the Azure Storage container.</p>
            <p>See the README and infrastructure documentation for instructions.</p>
        `;
        grid.appendChild(messageDiv);
    }

    /**
     * Show an error message when Azure Function API fails
     * @param {HTMLElement} grid - Workflow grid element
     * @param {Error} error - Error that occurred
     */
    showApiError(grid, error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'config-error';
        errorDiv.innerHTML = `
            <h3>⚠️ API Error</h3>
            <p>Failed to load workflow statuses from Azure Function.</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <p>Please check:</p>
            <ol>
                <li>Azure Function is deployed and running</li>
                <li>Azure Function URL is configured correctly</li>
                <li>GitHub App credentials are stored in Key Vault</li>
                <li>Workflow configurations are uploaded to Azure Storage</li>
            </ol>
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

// Global dashboard instance for console access and testing
let dashboardInstance = null;

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if Azure Function URL is configured
        if (!DASHBOARD_CONFIG.azureFunction.url || DASHBOARD_CONFIG.azureFunction.url === '__AZURE_FUNCTION_URL__') {
            console.error('Azure Function URL not configured. Dashboard cannot load.');
            const grid = document.querySelector('.workflow-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="config-error">
                        <h3>⚠️ Configuration Required</h3>
                        <p>Azure Function URL is not configured. Please:</p>
                        <ol>
                            <li>Deploy the Azure Function App infrastructure</li>
                            <li>Deploy the function app code</li>
                            <li>Update the AZURE_FUNCTION_URL in the deployment workflow</li>
                        </ol>
                        <p>See the README and infrastructure documentation for setup instructions.</p>
                    </div>
                `;
            }
            return;
        }

        // Initialize API client with Azure Function URL
        const apiClient = new GitHubActionsAPI(DASHBOARD_CONFIG.azureFunction.url);
        
        // Enable debug mode if configured
        if (DASHBOARD_CONFIG.azureFunction.debug) {
            apiClient.debug = true;
        }

        // Initialize workflow manager with config workflows (for backward compatibility)
        // In the new architecture, workflows come from Azure Storage via the Function
        const workflowManager = new WorkflowManager(DASHBOARD_CONFIG.workflows);

        // Initialize dashboard loader
        const dashboard = new DashboardLoader(DASHBOARD_CONFIG, apiClient, workflowManager);
        
        // Expose dashboard instance globally for console access
        window.dashboardInstance = dashboard;
        dashboardInstance = dashboard;

        // Load workflows
        await dashboard.loadWorkflows();

        // Set up auto-refresh every 5 minutes
        dashboard.setupAutoRefresh(5);

        console.log('Dashboard initialized successfully');
        console.log('Using Azure Function backend for workflow statuses');
        console.log('Tip: Workflows are now managed in Azure Storage');
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
    }
});
