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
     * Generate a unique key for a workflow
     * @param {Object} workflow - Workflow object with owner, repo, and workflow properties
     * @returns {string} - Unique workflow key
     */
    getWorkflowKey(workflow) {
        if (!workflow?.owner || !workflow?.repo || !workflow?.workflow) {
            console.warn('Invalid workflow object:', workflow);
            return '';
        }
        return `${workflow.owner}/${workflow.repo}/${workflow.workflow}`;
    }

    /**
     * Check if the container has an error state displayed
     * @param {HTMLElement} container - Workflow grids container element
     * @returns {boolean} - True if container has error state
     */
    hasErrorState(container) {
        return container.querySelector('.config-error') !== null;
    }

    /**
     * Update refresh status indicator
     * @param {boolean} isRefreshing - Whether a refresh is in progress
     * @param {Date} lastRefreshTime - Last successful refresh time
     */
    updateRefreshStatus(isRefreshing, lastRefreshTime = null) {
        const refreshStatus = document.getElementById('refresh-status');
        const refreshStatusText = refreshStatus?.querySelector('.refresh-status-text');
        const refreshButton = document.getElementById('refresh-button');
        
        if (!refreshStatus || !refreshStatusText) {
            return;
        }

        refreshStatus.style.display = 'flex';
        
        if (isRefreshing) {
            refreshStatus.classList.add('refreshing');
            refreshStatusText.textContent = 'Refreshing workflow statuses...';
            // Disable refresh button during refresh
            if (refreshButton) {
                refreshButton.disabled = true;
            }
        } else {
            refreshStatus.classList.remove('refreshing');
            if (lastRefreshTime) {
                try {
                    // Use user's browser locale for localized time formatting
                    const locale = navigator.language || 'en-US';
                    const timeString = lastRefreshTime.toLocaleString(locale, {
                        timeZoneName: 'short'
                    });
                    refreshStatusText.textContent = `Last updated: ${timeString}`;
                } catch (error) {
                    // Fallback to ISO string if locale formatting fails
                    console.warn('Failed to format time with locale:', error);
                    refreshStatusText.textContent = `Last updated: ${lastRefreshTime.toISOString()}`;
                }
            }
            // Re-enable refresh button after refresh
            if (refreshButton) {
                refreshButton.disabled = false;
            }
        }
    }

    /**
     * Group workflows by repository
     * @param {Array} workflows - Array of workflow objects
     * @returns {Map} - Map of repository keys to workflow arrays
     */
    groupWorkflowsByRepository(workflows) {
        const grouped = new Map();
        
        workflows.forEach(workflow => {
            const repoKey = `${workflow.owner}/${workflow.repo}`;
            if (!grouped.has(repoKey)) {
                grouped.set(repoKey, []);
            }
            grouped.get(repoKey).push(workflow);
        });
        
        return grouped;
    }

    /**
     * Create a repository section with header and grid
     * @param {string} repoKey - Repository key (owner/repo)
     * @param {Array} workflows - Array of workflows for this repository
     * @returns {HTMLElement} - Repository section element
     */
    createRepositorySection(repoKey, workflows) {
        const section = document.createElement('div');
        section.className = 'repo-section';
        section.setAttribute('data-repo-key', repoKey);
        
        // Create repository header
        const header = document.createElement('h2');
        header.className = 'repo-header';
        header.textContent = repoKey;
        
        // Create workflow grid for this repository
        const grid = document.createElement('div');
        grid.className = 'workflow-grid';
        
        // Add workflow cards to grid
        workflows.forEach(workflow => {
            const key = this.getWorkflowKey(workflow);
            const card = this.createWorkflowCard(workflow, {
                conclusion: workflow.conclusion,
                status: workflow.status,
                url: workflow.url,
                updatedAt: workflow.updatedAt
            });
            card.setAttribute('data-workflow-key', key);
            grid.appendChild(card);
        });
        
        section.appendChild(header);
        section.appendChild(grid);
        
        return section;
    }

    /**
     * Load all workflow statuses and render them
     */
    async loadWorkflows() {
        const container = document.querySelector('.workflow-grids-container');
        
        if (!container) {
            console.error('Workflow grids container element not found');
            return;
        }

        // Show refreshing status
        this.updateRefreshStatus(true);

        try {
            // Get all workflow statuses from Azure Function
            // The function returns workflows with their statuses already populated
            const workflowStatuses = await this.api.getAllWorkflowStatuses();

            if (!workflowStatuses || workflowStatuses.length === 0) {
                // Only clear container if there are no workflows (first load scenario)
                if (container.children.length === 0 || this.hasErrorState(container)) {
                    container.innerHTML = '';
                    this.showNoWorkflowsMessage(container);
                }
                this.updateRefreshStatus(false, new Date());
                return;
            }

            // Group workflows by repository
            const workflowsByRepo = this.groupWorkflowsByRepository(workflowStatuses);
            
            // Get existing repository sections
            const existingSections = new Map();
            Array.from(container.children).forEach(section => {
                if (section.classList.contains('repo-section')) {
                    const repoKey = section.getAttribute('data-repo-key');
                    if (repoKey) {
                        existingSections.set(repoKey, section);
                    }
                }
            });

            // Check if this is a first load or if we have an error state
            const isFirstLoad = container.children.length === 0 || 
                               this.hasErrorState(container) ||
                               existingSections.size === 0;

            if (isFirstLoad) {
                // Clear and rebuild everything
                container.innerHTML = '';
                
                // Create sections for each repository
                workflowsByRepo.forEach((workflows, repoKey) => {
                    const section = this.createRepositorySection(repoKey, workflows);
                    container.appendChild(section);
                });
            } else {
                // Update existing sections or add new ones
                const updatedRepoKeys = new Set();
                
                // Process each repository
                workflowsByRepo.forEach((workflows, repoKey) => {
                    updatedRepoKeys.add(repoKey);
                    const existingSection = existingSections.get(repoKey);
                    
                    if (existingSection) {
                        // Update existing section
                        const grid = existingSection.querySelector('.workflow-grid');
                        if (grid) {
                            // Update workflow cards in this grid
                            const existingCards = new Map();
                            Array.from(grid.children).forEach(card => {
                                const key = card.getAttribute('data-workflow-key');
                                if (key) {
                                    existingCards.set(key, card);
                                }
                            });
                            
                            // Update or add workflow cards
                            workflows.forEach(workflow => {
                                const key = this.getWorkflowKey(workflow);
                                const existingCard = existingCards.get(key);
                                
                                const newCard = this.createWorkflowCard(workflow, {
                                    conclusion: workflow.conclusion,
                                    status: workflow.status,
                                    url: workflow.url,
                                    updatedAt: workflow.updatedAt
                                });
                                newCard.setAttribute('data-workflow-key', key);
                                
                                if (existingCard) {
                                    grid.replaceChild(newCard, existingCard);
                                    existingCards.delete(key);
                                } else {
                                    grid.appendChild(newCard);
                                }
                            });
                            
                            // Remove cards that no longer exist
                            existingCards.forEach(card => {
                                grid.removeChild(card);
                            });
                        }
                    } else {
                        // Create new section
                        const newSection = this.createRepositorySection(repoKey, workflows);
                        container.appendChild(newSection);
                    }
                });
                
                // Remove sections for repositories that no longer exist
                existingSections.forEach((section, repoKey) => {
                    if (!updatedRepoKeys.has(repoKey)) {
                        container.removeChild(section);
                    }
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
            // Only show error if container is empty or already has an error
            if (container.children.length === 0 || this.hasErrorState(container)) {
                container.innerHTML = '';
                this.showApiError(container, error);
            }
            // Clear the refreshing state but don't update timestamp to preserve last successful refresh time
            this.updateRefreshStatus(false);
        }
    }

    /**
     * Show a message when no workflows are configured
     * @param {HTMLElement} container - Workflow grids container element
     */
    showNoWorkflowsMessage(container) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'config-error';
        messageDiv.innerHTML = `
            <h3>ℹ️ No Workflows Configured</h3>
            <p>No workflows are currently configured in Azure Storage.</p>
            <p>To add workflows, upload a workflows.json file to the Azure Storage container.</p>
            <p>See the README and infrastructure documentation for instructions.</p>
        `;
        container.appendChild(messageDiv);
    }

    /**
     * Show an error message when Azure Function API fails
     * @param {HTMLElement} container - Workflow grids container element
     * @param {Error} error - Error that occurred
     */
    showApiError(container, error) {
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
        container.appendChild(errorDiv);
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

    /**
     * Set up manual refresh button
     */
    setupRefreshButton() {
        const refreshButton = document.getElementById('refresh-button');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                console.log('Manual refresh triggered by user');
                this.loadWorkflows();
            });
        }
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
            const container = document.querySelector('.workflow-grids-container');
            if (container) {
                container.innerHTML = `
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

        // Set up manual refresh button
        dashboard.setupRefreshButton();

        // Set up auto-refresh every 5 minutes
        dashboard.setupAutoRefresh(5);

        console.log('Dashboard initialized successfully');
        console.log('Using Azure Function backend for workflow statuses');
        console.log('Tip: Workflows are now managed in Azure Storage');
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
    }
});
