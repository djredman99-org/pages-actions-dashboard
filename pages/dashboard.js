// GitHub Actions Dashboard Loader
// Loads workflow statuses and renders them dynamically

/**
 * Format time difference as "X Min Ago", "X HR Ago", or "X Days Ago"
 * @param {string|Date} updatedAt - ISO timestamp or Date object
 * @returns {string} - Formatted time string
 */
function formatTimeSince(updatedAt) {
    if (!updatedAt) return '';
    
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffMs = now - updated;
    
    // Handle future dates or very recent updates
    if (diffMs < 0) {
        return 'Just now';
    }
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) {
        return `${diffMinutes} Min Ago`;
    } else if (diffHours < 24) {
        return `${diffHours} HR Ago`;
    } else {
        return `${diffDays} Days Ago`;
    }
}

/**
 * Card display settings manager
 */
class CardDisplaySettings {
    constructor() {
        this.storageKey = 'dashboard_card_display_settings';
        this.settings = this.load();
    }
    
    load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load card display settings:', error);
        }
        return {
            showBranchRef: false,
            showTimeSince: false
        };
    }
    
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save card display settings:', error);
        }
    }
    
    get showBranchRef() {
        return this.settings.showBranchRef;
    }
    
    set showBranchRef(value) {
        this.settings.showBranchRef = value;
        this.save();
    }
    
    get showTimeSince() {
        return this.settings.showTimeSince;
    }
    
    set showTimeSince(value) {
        this.settings.showTimeSince = value;
        this.save();
    }
}

class DashboardLoader {
    constructor(config, apiClient, workflowManager) {
        this.config = config;
        this.api = apiClient;
        this.workflowManager = workflowManager;
        this.dashboards = [];
        this.activeDashboardId = null;
        this.selectedDashboardId = null;
        this.isEditMode = false;
        this.originalWorkflowOrder = null;
        this.draggedElement = null;
        this.cardDisplaySettings = new CardDisplaySettings();
        this.attachedListeners = new WeakMap(); // Track attached event listeners
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
        
        // Add optional details section if any options are enabled
        if (this.cardDisplaySettings.showBranchRef || this.cardDisplaySettings.showTimeSince) {
            const detailsContainer = document.createElement('div');
            detailsContainer.className = 'workflow-details';
            
            // Add branch/ref information
            if (this.cardDisplaySettings.showBranchRef && status.headBranch) {
                const branchDiv = document.createElement('div');
                branchDiv.className = 'workflow-detail-item';
                branchDiv.textContent = `Branch: ${status.headBranch}`;
                detailsContainer.appendChild(branchDiv);
            }
            
            // Add time since last run
            if (this.cardDisplaySettings.showTimeSince && status.updatedAt) {
                const timeDiv = document.createElement('div');
                timeDiv.className = 'workflow-detail-item';
                timeDiv.textContent = formatTimeSince(status.updatedAt);
                detailsContainer.appendChild(timeDiv);
            }
            
            link.appendChild(detailsContainer);
        }
        
        workflowItem.appendChild(link);

        // Add remove button for workflows (will always show for now, API handles permissions)
        const removeButton = document.createElement('button');
        removeButton.className = 'workflow-remove-button';
        removeButton.setAttribute('aria-label', `Remove ${workflow.label} workflow`);
        removeButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        removeButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleRemoveWorkflow(workflow);
        };
        workflowItem.appendChild(removeButton);

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
            refreshStatusText.textContent = 'Refreshing...';
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
                updatedAt: workflow.updatedAt,
                headBranch: workflow.headBranch,
                headSha: workflow.headSha
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
            const data = await this.api.getAllWorkflowStatuses();
            
            // Update dashboards list
            this.dashboards = data.dashboards || [];
            this.activeDashboardId = data.activeDashboardId;
            
            // Update dashboard selector UI
            this.updateDashboardSelector();
            
            const workflowStatuses = data.workflows || [];

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
                                    updatedAt: workflow.updatedAt,
                                    headBranch: workflow.headBranch,
                                    headSha: workflow.headSha
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
            <p>No workflows are currently configured for this dashboard.</p>
            <p>To get started, click the (+ Add Workflow) button at the top right to configure your dashboards.</p>
            <p>See the README documentation for more information.</p>
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

    /**
     * Set up add workflow button and modal
     */
    setupAddWorkflowButton() {
        const addButton = document.getElementById('add-workflow-button');
        const modal = document.getElementById('add-workflow-modal');
        const closeButton = modal?.querySelector('.close-button');
        const cancelButton = document.getElementById('add-workflow-cancel');
        const applyButton = document.getElementById('add-workflow-apply');
        const repoInput = document.getElementById('repo-input');
        const workflowInput = document.getElementById('workflow-input');
        const labelInput = document.getElementById('workflow-label-input');
        const errorDiv = document.getElementById('add-workflow-error');

        if (!addButton || !modal) return;

        // Open modal
        addButton.addEventListener('click', () => {
            modal.style.display = 'block';
            repoInput.value = '';
            workflowInput.value = '';
            labelInput.value = '';
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
            repoInput.focus();
        });

        // Close modal
        const closeModal = () => {
            modal.style.display = 'none';
        };

        closeButton?.addEventListener('click', closeModal);
        cancelButton?.addEventListener('click', closeModal);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Handle apply button
        applyButton?.addEventListener('click', async () => {
            await this.handleAddWorkflow(repoInput.value, workflowInput.value, labelInput.value, errorDiv, applyButton, closeModal);
        });

        // Handle Enter key in inputs
        const handleEnter = async (e) => {
            if (e.key === 'Enter') {
                await this.handleAddWorkflow(repoInput.value, workflowInput.value, labelInput.value, errorDiv, applyButton, closeModal);
            }
        };
        repoInput?.addEventListener('keypress', handleEnter);
        workflowInput?.addEventListener('keypress', handleEnter);
        labelInput?.addEventListener('keypress', handleEnter);
    }

    /**
     * Handle adding a workflow
     * @param {string} repoPath - Repository path in format owner/repo
     * @param {string} workflow - Workflow file name or ID
     * @param {string} label - Display label for workflow
     * @param {HTMLElement} errorDiv - Error message container
     * @param {HTMLElement} applyButton - Apply button element
     * @param {Function} closeModal - Function to close the modal
     */
    async handleAddWorkflow(repoPath, workflow, label, errorDiv, applyButton, closeModal) {
        // Clear previous error
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';

        // Validate repo input
        if (!repoPath || !repoPath.trim()) {
            errorDiv.textContent = 'Please enter a repository';
            errorDiv.style.display = 'block';
            return;
        }

        // Parse repo path (owner/repo)
        const repoParts = repoPath.trim().split('/');
        if (repoParts.length !== 2) {
            errorDiv.textContent = 'Invalid format. Expected: owner/repo';
            errorDiv.style.display = 'block';
            return;
        }

        const [owner, repo] = repoParts;

        if (!owner || !repo) {
            errorDiv.textContent = 'Both owner and repo are required';
            errorDiv.style.display = 'block';
            return;
        }

        // Validate workflow input
        if (!workflow || !workflow.trim()) {
            errorDiv.textContent = 'Please enter a workflow file or ID';
            errorDiv.style.display = 'block';
            return;
        }

        const workflowValue = workflow.trim();

        // Validate workflow: if it looks like a file, check extension
        // If it's numeric, accept it as an ID
        const isNumeric = /^\d+$/.test(workflowValue);
        const hasYamlExtension = workflowValue.endsWith('.yml') || workflowValue.endsWith('.yaml');

        if (!isNumeric && !hasYamlExtension) {
            errorDiv.textContent = 'Workflow must be a .yml/.yaml file or a numeric ID';
            errorDiv.style.display = 'block';
            return;
        }

        // Validate label
        if (!label || !label.trim()) {
            errorDiv.textContent = 'Please enter a display label';
            errorDiv.style.display = 'block';
            return;
        }

        // Disable button during API call
        applyButton.disabled = true;
        applyButton.textContent = 'Adding...';

        try {
            // Call API to add workflow
            await this.api.addWorkflow(owner, repo, workflowValue, label.trim());

            // Close modal
            closeModal();

            // Reload workflows to show the new one
            await this.loadWorkflows();

            console.log(`Successfully added workflow: ${owner}/${repo}/${workflowValue}`);
        } catch (error) {
            console.error('Failed to add workflow:', error);
            errorDiv.textContent = error.message || 'Failed to add workflow. Please try again.';
            errorDiv.style.display = 'block';
        } finally {
            // Re-enable button
            applyButton.disabled = false;
            applyButton.textContent = 'Add Workflow';
        }
    }

    /**
     * Handle removing a workflow
     * @param {Object} workflow - Workflow object with owner, repo, workflow properties
     */
    async handleRemoveWorkflow(workflow) {
        // Confirm removal
        // TODO: Replace with custom modal for better UX consistency
        const confirmed = confirm(`Are you sure you want to remove "${workflow.label}"?`);
        if (!confirmed) return;

        try {
            // Call API to remove workflow
            await this.api.removeWorkflow(workflow.owner, workflow.repo, workflow.workflow);

            // Reload workflows to update the display
            await this.loadWorkflows();

            console.log(`Successfully removed workflow: ${workflow.owner}/${workflow.repo}/${workflow.workflow}`);
        } catch (error) {
            console.error('Failed to remove workflow:', error);
            // TODO: Replace with toast notification or error modal for better UX
            alert(`Failed to remove workflow: ${error.message}`);
        }
    }

    /**
     * Update the dashboard selector UI with available dashboards
     */
    updateDashboardSelector() {
        // Update active dashboard name in header
        const activeDashboardName = document.getElementById('active-dashboard-name');
        if (activeDashboardName && this.dashboards.length > 0) {
            const activeDashboard = this.dashboards.find(d => d.id === this.activeDashboardId);
            if (activeDashboard) {
                activeDashboardName.textContent = activeDashboard.name;
                activeDashboardName.style.display = 'block';
            } else {
                activeDashboardName.style.display = 'none';
            }
        }

        // Also update the modal custom dropdown
        const dropdownList = document.getElementById('dashboard-dropdown-list');
        if (dropdownList && this.dashboards.length > 0) {
            this.renderCustomDropdown(this.dashboards);
        }
    }

    /**
     * Render the custom dropdown items
     * @param {Array} dashboards - Array of dashboards to display
     */
    renderCustomDropdown(dashboards) {
        const dropdownList = document.getElementById('dashboard-dropdown-list');
        if (!dropdownList) return;

        dropdownList.innerHTML = '';

        if (dashboards.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'custom-dropdown-empty';
            emptyDiv.textContent = 'No dashboards found';
            dropdownList.appendChild(emptyDiv);
            return;
        }

        dashboards.forEach(dashboard => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item';
            item.setAttribute('role', 'option');
            item.setAttribute('data-dashboard-id', dashboard.id);
            
            if (dashboard.id === this.activeDashboardId) {
                item.classList.add('selected');
                item.setAttribute('aria-selected', 'true');
            } else {
                item.setAttribute('aria-selected', 'false');
            }

            // Add icon
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.classList.add('item-icon');
            icon.setAttribute('viewBox', '0 0 16 16');
            icon.setAttribute('fill', 'currentColor');
            icon.innerHTML = '<path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"></path>';

            // Add text
            const text = document.createElement('span');
            text.className = 'item-text';
            text.textContent = dashboard.name;

            // Add checkmark for selected item
            const checkmark = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            checkmark.classList.add('item-check');
            checkmark.setAttribute('viewBox', '0 0 16 16');
            checkmark.setAttribute('fill', 'currentColor');
            checkmark.innerHTML = '<path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"></path>';

            item.appendChild(icon);
            item.appendChild(text);
            item.appendChild(checkmark);

            // Add click handler
            item.addEventListener('click', () => {
                this.selectDashboardFromDropdown(dashboard.id);
            });

            dropdownList.appendChild(item);
        });
    }

    /**
     * Select a dashboard from the custom dropdown
     * @param {string} dashboardId - ID of the selected dashboard
     */
    selectDashboardFromDropdown(dashboardId) {
        // Update selected state in the UI
        const dropdownList = document.getElementById('dashboard-dropdown-list');
        if (!dropdownList) return;
        
        const items = dropdownList.querySelectorAll('.custom-dropdown-item');
        items.forEach(item => {
            const itemId = item.getAttribute('data-dashboard-id');
            if (itemId === dashboardId) {
                item.classList.add('selected');
                item.setAttribute('aria-selected', 'true');
            } else {
                item.classList.remove('selected');
                item.setAttribute('aria-selected', 'false');
            }
        });

        // Store the selected dashboard ID for later use
        this.selectedDashboardId = dashboardId;
    }

    /**
     * Filter dashboards based on search input
     * @param {string} searchTerm - Search term to filter by
     */
    filterDashboards(searchTerm) {
        if (!searchTerm?.trim()) {
            // Show all dashboards
            this.renderCustomDropdown(this.dashboards);
            return;
        }

        const searchLower = searchTerm.toLowerCase();
        const filtered = this.dashboards.filter(dashboard => 
            dashboard.name.toLowerCase().includes(searchLower)
        );

        this.renderCustomDropdown(filtered);
    }

    /**
     * Set up dashboard selector change handler
     */
    setupDashboardSelector() {
        // This function is kept for compatibility but the UI now uses the modal
        // The actual switching logic is in setupChangeDashboardModal
    }

    /**
     * Set up change dashboard modal and button
     */
    setupChangeDashboardModal() {
        const button = document.getElementById('change-dashboard-nav-button');
        const modal = document.getElementById('change-dashboard-modal');
        const closeButton = modal?.querySelector('.close-button');
        const cancelButton = document.getElementById('change-dashboard-cancel');
        const applyButton = document.getElementById('change-dashboard-apply');
        const searchInput = document.getElementById('dashboard-search-input');
        const errorDiv = document.getElementById('change-dashboard-error');

        if (!button || !modal) return;

        // Initialize selected dashboard ID
        this.selectedDashboardId = this.activeDashboardId;

        // Open modal
        button.addEventListener('click', () => {
            modal.style.display = 'block';
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
            
            // Reset selected dashboard to current active
            this.selectedDashboardId = this.activeDashboardId;
            
            // Update dropdown options
            this.updateDashboardSelector();
            
            // Clear search input and focus it
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            
            // Close side nav
            if (window.themeSwitcher) {
                window.themeSwitcher.closeSideNav();
            }
        });

        // Set up search input
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterDashboards(e.target.value);
            });
        }

        // Close modal
        const closeModal = () => {
            modal.style.display = 'none';
            if (searchInput) {
                searchInput.value = '';
            }
        };

        closeButton?.addEventListener('click', closeModal);
        cancelButton?.addEventListener('click', closeModal);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Handle apply button
        applyButton?.addEventListener('click', async () => {
            const newDashboardId = this.selectedDashboardId || this.activeDashboardId;

            // Don't do anything if same dashboard selected
            if (newDashboardId === this.activeDashboardId) {
                closeModal();
                return;
            }

            applyButton.disabled = true;
            applyButton.textContent = 'Switching...';
            errorDiv.style.display = 'none';

            try {
                // Set as active dashboard
                await this.api.setActiveDashboard(newDashboardId);

                // Clear the container and reload workflows
                const container = document.querySelector('.workflow-grids-container');
                if (container) {
                    container.innerHTML = '';
                }

                // Reload workflows for new dashboard
                await this.loadWorkflows();

                console.log(`Switched to dashboard: ${newDashboardId}`);
                closeModal();
            } catch (error) {
                console.error('Failed to switch dashboard:', error);
                errorDiv.textContent = error.message || 'Failed to switch dashboard';
                errorDiv.style.display = 'block';
            } finally {
                applyButton.disabled = false;
                applyButton.textContent = 'Switch';
            }
        });
    }

    /**
     * Sync checkbox states with settings
     * @private
     */
    _syncCheckboxStates() {
        const showBranchRefCheckbox = document.getElementById('show-branch-ref-checkbox');
        const showTimeSinceCheckbox = document.getElementById('show-time-since-checkbox');
        
        if (showBranchRefCheckbox) {
            showBranchRefCheckbox.checked = this.cardDisplaySettings.showBranchRef;
        }
        if (showTimeSinceCheckbox) {
            showTimeSinceCheckbox.checked = this.cardDisplaySettings.showTimeSince;
        }
    }

    /**
     * Set up new dashboard button (side nav)
     */
    setupNewDashboardButton() {
        const button = document.getElementById('new-dashboard-nav-button');
        
        if (!button) return;
        
        button.addEventListener('click', () => {
            // Open the manage dashboards modal which has create functionality
            const manageModal = document.getElementById('manage-dashboards-modal');
            if (manageModal) {
                manageModal.style.display = 'block';
                const nameInput = document.getElementById('new-dashboard-input');
                const errorDiv = document.getElementById('manage-dashboards-error');
                
                if (nameInput) nameInput.value = '';
                if (errorDiv) {
                    errorDiv.style.display = 'none';
                    errorDiv.textContent = '';
                }
                this.renderDashboardsList();
                
                // Update checkbox states when opening modal
                this._syncCheckboxStates();
            }
            
            // Close side nav
            if (window.themeSwitcher) {
                window.themeSwitcher.closeSideNav();
            }
        });
    }

    /**
     * Set up manage dashboards button and modal
     */
    setupManageDashboardsButton() {
        const button = document.getElementById('manage-dashboards-button');
        const modal = document.getElementById('manage-dashboards-modal');
        const closeButton = modal?.querySelector('.close-button');
        const createButton = document.getElementById('create-dashboard-button');
        const nameInput = document.getElementById('new-dashboard-input');
        const errorDiv = document.getElementById('manage-dashboards-error');
        const showBranchRefCheckbox = document.getElementById('show-branch-ref-checkbox');
        const showTimeSinceCheckbox = document.getElementById('show-time-since-checkbox');
        
        if (!modal) return;
        
        // Set up checkbox event listeners (only once)
        if (showBranchRefCheckbox && !this.attachedListeners.has(showBranchRefCheckbox)) {
            showBranchRefCheckbox.checked = this.cardDisplaySettings.showBranchRef;
            showBranchRefCheckbox.addEventListener('change', (e) => {
                this.cardDisplaySettings.showBranchRef = e.target.checked;
                // Reload workflows to update cards
                this.loadWorkflows();
            });
            this.attachedListeners.set(showBranchRefCheckbox, true);
        }
        
        if (showTimeSinceCheckbox && !this.attachedListeners.has(showTimeSinceCheckbox)) {
            showTimeSinceCheckbox.checked = this.cardDisplaySettings.showTimeSince;
            showTimeSinceCheckbox.addEventListener('change', (e) => {
                this.cardDisplaySettings.showTimeSince = e.target.checked;
                // Reload workflows to update cards
                this.loadWorkflows();
            });
            this.attachedListeners.set(showTimeSinceCheckbox, true);
        }
        
        // Open modal (only if button exists)
        if (button) {
            button.addEventListener('click', () => {
                modal.style.display = 'block';
                nameInput.value = '';
                errorDiv.style.display = 'none';
                errorDiv.textContent = '';
                this.renderDashboardsList();
                // Update checkbox states when opening modal
                this._syncCheckboxStates();
            });
        }
        
        // Close modal
        const closeModal = () => {
            modal.style.display = 'none';
        };
        
        closeButton?.addEventListener('click', closeModal);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Create dashboard
        createButton?.addEventListener('click', async () => {
            await this.handleCreateDashboard(nameInput.value, errorDiv, createButton);
        });
        
        // Handle Enter key in input
        nameInput?.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await this.handleCreateDashboard(nameInput.value, errorDiv, createButton);
            }
        });
    }

    /**
     * Render the list of dashboards in the manage modal
     */
    renderDashboardsList() {
        const listContainer = document.getElementById('manage-dashboards-list');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        
        if (this.dashboards.length === 0) {
            listContainer.innerHTML = '<p>No dashboards available.</p>';
            return;
        }
        
        this.dashboards.forEach(dashboard => {
            const item = document.createElement('div');
            item.className = 'dashboard-item';
            if (dashboard.id === this.activeDashboardId) {
                item.classList.add('active');
            }
            
            const info = document.createElement('div');
            info.className = 'dashboard-item-info';
            
            const name = document.createElement('span');
            name.className = 'dashboard-item-name';
            name.textContent = dashboard.name;
            info.appendChild(name);
            
            if (dashboard.id === this.activeDashboardId) {
                const badge = document.createElement('span');
                badge.className = 'dashboard-item-badge';
                badge.textContent = 'Active';
                info.appendChild(badge);
            }
            
            const actions = document.createElement('div');
            actions.className = 'dashboard-item-actions';
            
            // Rename button
            const renameBtn = document.createElement('button');
            renameBtn.className = 'dashboard-item-action';
            renameBtn.title = 'Rename dashboard';
            renameBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M18.5 2.49998C18.8978 2.10216 19.4374 1.87866 20 1.87866C20.5626 1.87866 21.1022 2.10216 21.5 2.49998C21.8978 2.89781 22.1213 3.43737 22.1213 3.99998C22.1213 4.56259 21.8978 5.10216 21.5 5.49998L12 15L8 16L9 12L18.5 2.49998Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            renameBtn.onclick = () => this.handleRenameDashboard(dashboard);
            actions.appendChild(renameBtn);
            
            // Delete button (only if not the last dashboard)
            if (this.dashboards.length > 1) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'dashboard-item-action danger';
                deleteBtn.title = 'Delete dashboard';
                deleteBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `;
                deleteBtn.onclick = () => this.handleDeleteDashboard(dashboard);
                actions.appendChild(deleteBtn);
            }
            
            item.appendChild(info);
            item.appendChild(actions);
            listContainer.appendChild(item);
        });
    }

    /**
     * Handle creating a new dashboard
     */
    async handleCreateDashboard(name, errorDiv, createButton) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
        
        if (!name || !name.trim()) {
            errorDiv.textContent = 'Please enter a dashboard name';
            errorDiv.style.display = 'block';
            return;
        }
        
        createButton.disabled = true;
        createButton.textContent = 'Creating...';
        
        try {
            await this.api.createDashboard(name.trim(), true);
            
            // Clear the container before reloading to ensure clean UI state
            const container = document.querySelector('.workflow-grids-container');
            if (container) {
                container.innerHTML = '';
            }
            
            // Reload to get updated dashboards list
            await this.loadWorkflows();
            
            // Update the dashboards list in modal
            this.renderDashboardsList();
            
            // Clear input
            document.getElementById('new-dashboard-input').value = '';
            
            console.log(`Successfully created dashboard: ${name}`);
        } catch (error) {
            console.error('Failed to create dashboard:', error);
            errorDiv.textContent = error.message || 'Failed to create dashboard';
            errorDiv.style.display = 'block';
        } finally {
            createButton.disabled = false;
            createButton.textContent = 'Create';
        }
    }

    /**
     * Handle renaming a dashboard
     */
    async handleRenameDashboard(dashboard) {
        const newName = prompt(`Enter new name for "${dashboard.name}":`, dashboard.name);
        if (!newName || newName.trim() === dashboard.name) return;
        
        try {
            await this.api.renameDashboard(dashboard.id, newName.trim());
            
            // Reload to get updated dashboards list
            await this.loadWorkflows();
            
            // Update the dashboards list in modal
            this.renderDashboardsList();
            
            console.log(`Successfully renamed dashboard to: ${newName}`);
        } catch (error) {
            console.error('Failed to rename dashboard:', error);
            alert(`Failed to rename dashboard: ${error.message}`);
        }
    }

    /**
     * Handle deleting a dashboard
     */
    async handleDeleteDashboard(dashboard) {
        const confirmed = confirm(`Are you sure you want to delete "${dashboard.name}"? This will also delete all workflows in this dashboard.`);
        if (!confirmed) return;
        
        try {
            await this.api.deleteDashboard(dashboard.id);
            
            // Reload to get updated dashboards list and possibly new active dashboard
            await this.loadWorkflows();
            
            // Update the dashboards list in modal
            this.renderDashboardsList();
            
            console.log(`Successfully deleted dashboard: ${dashboard.name}`);
        } catch (error) {
            console.error('Failed to delete dashboard:', error);
            alert(`Failed to delete dashboard: ${error.message}`);
        }
    }

    /**
     * Set up edit mode button and handlers
     */
    setupEditModeButton() {
        const editModeButton = document.getElementById('edit-mode-button');
        const cancelButton = document.getElementById('cancel-edit-button');
        const saveButton = document.getElementById('save-edit-button');

        if (!editModeButton) return;

        editModeButton.addEventListener('click', () => {
            this.enterEditMode();
        });

        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                this.cancelEditMode();
            });
        }

        if (saveButton) {
            saveButton.addEventListener('click', async () => {
                await this.saveEditMode();
            });
        }
    }

    /**
     * Enter edit mode
     */
    enterEditMode() {
        this.isEditMode = true;
        
        // Store original order for cancel functionality
        this.originalWorkflowOrder = this.captureCurrentOrder();
        
        // Show edit mode banner
        const banner = document.getElementById('edit-mode-banner');
        if (banner) {
            banner.style.display = 'flex';
        }
        
        // Add edit mode class to body
        document.body.classList.add('edit-mode');
        
        // Make all workflow cards draggable
        this.enableDragAndDrop();
        
        if (this.api.debug) {
            console.log('Entered edit mode');
        }
    }

    /**
     * Cancel edit mode and revert to original order
     */
    cancelEditMode() {
        if (!this.isEditMode) return;

        this.isEditMode = false;
        
        // Hide edit mode banner
        const banner = document.getElementById('edit-mode-banner');
        if (banner) {
            banner.style.display = 'none';
        }
        
        // Remove edit mode class from body
        document.body.classList.remove('edit-mode');
        
        // Revert to original order
        if (this.originalWorkflowOrder) {
            this.restoreOrder(this.originalWorkflowOrder);
            this.originalWorkflowOrder = null;
        }
        
        // Disable drag and drop
        this.disableDragAndDrop();
        
        if (this.api.debug) {
            console.log('Cancelled edit mode');
        }
    }

    /**
     * Save edit mode and persist the new order
     */
    async saveEditMode() {
        if (!this.isEditMode) return;

        const saveButton = document.getElementById('save-edit-button');
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
            saveButton.setAttribute('aria-label', 'Saving workflow order, please wait');
        }

        try {
            // Get current order from DOM
            const newOrder = this.captureCurrentOrder();
            
            // Build workflows array for API call
            const workflowsToSave = [];
            Object.values(newOrder).forEach(repoWorkflows => {
                workflowsToSave.push(...repoWorkflows);
            });

            // Call API to save order
            await this.api.reorderWorkflows(workflowsToSave);

            // Exit edit mode
            this.isEditMode = false;
            
            // Hide edit mode banner
            const banner = document.getElementById('edit-mode-banner');
            if (banner) {
                banner.style.display = 'none';
            }
            
            // Remove edit mode class from body
            document.body.classList.remove('edit-mode');
            
            // Disable drag and drop
            this.disableDragAndDrop();
            
            this.originalWorkflowOrder = null;
            
            if (this.api.debug) {
                console.log('Saved workflow order successfully');
            }
        } catch (error) {
            console.error('Failed to save workflow order:', error);
            alert(`Failed to save workflow order: ${error.message}`);
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = 'Save Order';
                saveButton.setAttribute('aria-label', 'Save workflow order');
            }
        }
    }

    /**
     * Capture current workflow order from DOM
     * @returns {Object} Map of repo keys to ordered workflow arrays
     */
    captureCurrentOrder() {
        const order = {};
        const container = document.querySelector('.workflow-grids-container');
        if (!container) return order;

        const sections = container.querySelectorAll('.repo-section');
        sections.forEach(section => {
            const repoKey = section.getAttribute('data-repo-key');
            const grid = section.querySelector('.workflow-grid');
            if (!grid) return;

            const cards = grid.querySelectorAll('.workflow-item');
            const workflows = [];
            
            cards.forEach(card => {
                const key = card.getAttribute('data-workflow-key');
                if (key) {
                    const [owner, repo, workflow] = key.split('/');
                    const label = card.querySelector('.workflow-label')?.textContent || '';
                    workflows.push({ owner, repo, workflow, label });
                }
            });

            if (workflows.length > 0) {
                order[repoKey] = workflows;
            }
        });

        return order;
    }

    /**
     * Restore workflow order in DOM
     * @param {Object} order - Map of repo keys to ordered workflow arrays
     */
    restoreOrder(order) {
        const container = document.querySelector('.workflow-grids-container');
        if (!container) return;

        Object.entries(order).forEach(([repoKey, workflows]) => {
            const section = container.querySelector(`.repo-section[data-repo-key="${repoKey}"]`);
            if (!section) return;

            const grid = section.querySelector('.workflow-grid');
            if (!grid) return;

            // Get all cards
            const cardsMap = new Map();
            const cards = grid.querySelectorAll('.workflow-item');
            cards.forEach(card => {
                const key = card.getAttribute('data-workflow-key');
                if (key) {
                    cardsMap.set(key, card);
                }
            });

            // Reorder cards
            workflows.forEach(workflow => {
                const key = `${workflow.owner}/${workflow.repo}/${workflow.workflow}`;
                const card = cardsMap.get(key);
                if (card) {
                    grid.appendChild(card);
                }
            });
        });
    }

    /**
     * Enable drag and drop for all workflow cards
     */
    enableDragAndDrop() {
        const container = document.querySelector('.workflow-grids-container');
        if (!container) return;

        const cards = container.querySelectorAll('.workflow-item');
        cards.forEach(card => {
            card.setAttribute('draggable', 'true');
            
            // Store bound handlers as data attributes so we can remove them later
            if (!card._dragHandlers) {
                card._dragHandlers = {
                    dragstart: this.handleDragStart.bind(this),
                    dragend: this.handleDragEnd.bind(this),
                    dragover: this.handleDragOver.bind(this),
                    drop: this.handleDrop.bind(this),
                    dragleave: this.handleDragLeave.bind(this)
                };
            }
            
            card.addEventListener('dragstart', card._dragHandlers.dragstart);
            card.addEventListener('dragend', card._dragHandlers.dragend);
            card.addEventListener('dragover', card._dragHandlers.dragover);
            card.addEventListener('drop', card._dragHandlers.drop);
            card.addEventListener('dragleave', card._dragHandlers.dragleave);
        });
    }

    /**
     * Disable drag and drop for all workflow cards
     */
    disableDragAndDrop() {
        const container = document.querySelector('.workflow-grids-container');
        if (!container) return;

        const cards = container.querySelectorAll('.workflow-item');
        cards.forEach(card => {
            card.removeAttribute('draggable');
            
            // Remove listeners using stored handlers
            if (card._dragHandlers) {
                card.removeEventListener('dragstart', card._dragHandlers.dragstart);
                card.removeEventListener('dragend', card._dragHandlers.dragend);
                card.removeEventListener('dragover', card._dragHandlers.dragover);
                card.removeEventListener('drop', card._dragHandlers.drop);
                card.removeEventListener('dragleave', card._dragHandlers.dragleave);
                
                // Clean up handler references to prevent memory leaks
                delete card._dragHandlers;
            }
        });
    }

    /**
     * Handle drag start event
     */
    handleDragStart(e) {
        this.draggedElement = e.currentTarget;
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    }

    /**
     * Handle drag end event
     */
    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        
        // Remove drag-over class from all cards
        const container = document.querySelector('.workflow-grids-container');
        if (container) {
            const cards = container.querySelectorAll('.workflow-item');
            cards.forEach(card => card.classList.remove('drag-over'));
        }
        
        this.draggedElement = null;
    }

    /**
     * Handle drag over event
     */
    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        
        e.dataTransfer.dropEffect = 'move';
        
        const targetCard = e.currentTarget;
        const draggedCard = this.draggedElement;
        
        if (!draggedCard || draggedCard === targetCard) {
            return;
        }
        
        // Check if both cards are in the same repo section
        const draggedRepoKey = this.getRepoKeyForCard(draggedCard);
        const targetRepoKey = this.getRepoKeyForCard(targetCard);
        
        if (draggedRepoKey !== targetRepoKey) {
            // Don't allow drop across different repos
            e.dataTransfer.dropEffect = 'none';
            return;
        }
        
        targetCard.classList.add('drag-over');
        
        return false;
    }

    /**
     * Handle drag leave event
     */
    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    /**
     * Handle drop event
     */
    handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        
        e.preventDefault();
        
        const targetCard = e.currentTarget;
        const draggedCard = this.draggedElement;
        
        if (!draggedCard || draggedCard === targetCard) {
            return false;
        }
        
        // Check if both cards are in the same repo section
        const draggedRepoKey = this.getRepoKeyForCard(draggedCard);
        const targetRepoKey = this.getRepoKeyForCard(targetCard);
        
        if (draggedRepoKey !== targetRepoKey) {
            // Don't allow drop across different repos
            return false;
        }
        
        // Get the parent grid
        const grid = targetCard.parentNode;
        
        // Determine where to insert the dragged card
        const targetIndex = Array.from(grid.children).indexOf(targetCard);
        const draggedIndex = Array.from(grid.children).indexOf(draggedCard);
        
        if (draggedIndex < targetIndex) {
            // Insert after target
            grid.insertBefore(draggedCard, targetCard.nextSibling);
        } else {
            // Insert before target
            grid.insertBefore(draggedCard, targetCard);
        }
        
        targetCard.classList.remove('drag-over');
        
        return false;
    }

    /**
     * Get the repo key for a workflow card
     * @param {HTMLElement} card - Workflow card element
     * @returns {string} - Repo key (owner/repo)
     */
    getRepoKeyForCard(card) {
        const section = card.closest('.repo-section');
        return section ? section.getAttribute('data-repo-key') : '';
    }
}

// Global dashboard instance for console access and testing
let dashboardInstance = null;

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize API client with Azure Function URL (even if not configured yet)
        const apiClient = new GitHubActionsAPI(
            DASHBOARD_CONFIG.azureFunction.url || '__AZURE_FUNCTION_URL__'
        );
        
        // Enable debug mode if configured
        if (DASHBOARD_CONFIG.azureFunction.debug) {
            apiClient.debug = true;
        }

        // Initialize workflow manager with config workflows (for backward compatibility)
        const workflowManager = new WorkflowManager(DASHBOARD_CONFIG.workflows);

        // Initialize dashboard loader
        const dashboard = new DashboardLoader(DASHBOARD_CONFIG, apiClient, workflowManager);
        
        // Expose dashboard instance globally for console access
        window.dashboardInstance = dashboard;

        // Set up add workflow button and modal (always available)
        dashboard.setupAddWorkflowButton();
        
        // Set up edit mode button and handlers
        dashboard.setupEditModeButton();
        
        // Set up dashboard navigation and management
        dashboard.setupChangeDashboardModal();
        dashboard.setupNewDashboardButton();
        dashboard.setupManageDashboardsButton();

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
