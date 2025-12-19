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
     * Update refresh status indicator
     * @param {boolean} isRefreshing - Whether a refresh is in progress
     * @param {Date} lastRefreshTime - Last successful refresh time
     */
    updateRefreshStatus(isRefreshing, lastRefreshTime = null) {
        const refreshStatus = document.getElementById('refresh-status');
        const refreshStatusText = refreshStatus?.querySelector('.refresh-status-text');
        
        if (!refreshStatus || !refreshStatusText) {
            return;
        }

        refreshStatus.style.display = 'flex';
        
        if (isRefreshing) {
            refreshStatus.classList.add('refreshing');
            refreshStatusText.textContent = 'Refreshing workflow statuses...';
        } else {
            refreshStatus.classList.remove('refreshing');
            if (lastRefreshTime) {
                const timeString = lastRefreshTime.toLocaleString(undefined, {
                    timeZoneName: 'short'
                });
                refreshStatusText.textContent = `Last updated: ${timeString}`;
            }
        }
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

        // Show refreshing status
        this.updateRefreshStatus(true);

        try {
            // Get all workflow statuses from Azure Function
            // The function returns workflows with their statuses already populated
            const workflowStatuses = await this.api.getAllWorkflowStatuses();

            if (!workflowStatuses || workflowStatuses.length === 0) {
                // Only clear grid if there are no workflows (first load scenario)
                if (grid.children.length === 0 || grid.querySelector('.config-error')) {
                    grid.innerHTML = '';
                    this.showNoWorkflowsMessage(grid);
                }
                this.updateRefreshStatus(false, new Date());
                return;
            }

            // Instead of clearing the grid, update existing cards or add new ones
            // This prevents the visual "wipe" effect
            const existingCards = Array.from(grid.children);
            
            // Create a map of workflow identifiers to new cards
            const newCardsMap = new Map();
            workflowStatuses.forEach(workflow => {
                const key = `${workflow.owner}/${workflow.repo}/${workflow.workflow}`;
                const card = this.createWorkflowCard(workflow, {
                    conclusion: workflow.conclusion,
                    status: workflow.status,
                    url: workflow.url,
                    updatedAt: workflow.updatedAt
                });
                // Store the workflow key as a data attribute for reliable matching
                card.setAttribute('data-workflow-key', key);
                newCardsMap.set(key, card);
            });

            // If this is the first load or we have an error message, clear and rebuild
            if (existingCards.length === 0 || existingCards.some(el => el.classList.contains('config-error'))) {
                grid.innerHTML = '';
                workflowStatuses.forEach(workflow => {
                    const key = `${workflow.owner}/${workflow.repo}/${workflow.workflow}`;
                    const card = newCardsMap.get(key);
                    if (card) {
                        grid.appendChild(card);
                    }
                });
            } else {
                // Update existing cards in place by matching workflow keys
                // Build a map of existing workflow keys to their card elements
                const existingCardsMap = new Map();
                existingCards.forEach(card => {
                    const key = card.getAttribute('data-workflow-key');
                    if (key) {
                        existingCardsMap.set(key, card);
                    }
                });

                // Replace existing cards with updated versions in the same order as workflowStatuses
                workflowStatuses.forEach(workflow => {
                    const key = `${workflow.owner}/${workflow.repo}/${workflow.workflow}`;
                    const newCard = newCardsMap.get(key);
                    const existingCard = existingCardsMap.get(key);
                    
                    if (existingCard && newCard) {
                        // Replace existing card with updated one
                        grid.replaceChild(newCard, existingCard);
                        existingCardsMap.delete(key);
                    } else if (newCard && !existingCard) {
                        // New workflow - append at the end
                        grid.appendChild(newCard);
                    }
                });

                // Remove any cards for workflows that no longer exist
                existingCardsMap.forEach(card => {
                    grid.removeChild(card);
                });
            }

            // Update last updated time
            const lastUpdatedElement = document.getElementById('last-updated');
            const lastRefreshTime = new Date();
            if (lastUpdatedElement) {
                lastUpdatedElement.textContent = lastRefreshTime.toLocaleString();
            }
            
            // Update refresh status
            this.updateRefreshStatus(false, lastRefreshTime);

        } catch (error) {
            console.error('Failed to load workflows:', error);
            // Only show error if grid is empty or already has an error
            if (grid.children.length === 0 || grid.querySelector('.config-error')) {
                grid.innerHTML = '';
                this.showApiError(grid, error);
            }
            // Don't update refresh status time on error - keep showing last successful refresh
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
