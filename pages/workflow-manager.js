// Workflow Manager
// Manages workflow configurations from multiple sources (config.js and local storage)

class WorkflowManager {
    constructor(configWorkflows) {
        this.configWorkflows = configWorkflows || [];
        this.storageKey = 'dashboard_custom_workflows';
        this.customWorkflows = this.loadCustomWorkflows();
    }

    /**
     * Load custom workflows from local storage
     * @returns {Array} - Array of custom workflow objects
     */
    loadCustomWorkflows() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Ensure all custom workflows have source='user'
                return parsed.map(wf => ({ ...wf, source: 'user' }));
            }
        } catch (error) {
            console.error('Failed to load custom workflows from local storage:', error);
        }
        return [];
    }

    /**
     * Save custom workflows to local storage
     */
    saveCustomWorkflows() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.customWorkflows));
        } catch (error) {
            console.error('Failed to save custom workflows to local storage:', error);
            throw error;
        }
    }

    /**
     * Get all workflows (config + custom)
     * @returns {Array} - Array of all workflow objects with source property
     */
    getAllWorkflows() {
        // Mark config workflows with source='config'
        const configWithSource = this.configWorkflows.map(wf => ({
            ...wf,
            source: 'config'
        }));

        // Combine config and custom workflows
        return [...configWithSource, ...this.customWorkflows];
    }

    /**
     * Add a custom workflow
     * @param {Object} workflow - Workflow object {owner, repo, workflow, label}
     * @returns {boolean} - Success status
     */
    addWorkflow(workflow) {
        // Validate workflow object
        if (!workflow.owner || !workflow.repo || !workflow.workflow || !workflow.label) {
            throw new Error('Invalid workflow: missing required fields (owner, repo, workflow, label)');
        }

        // Check for duplicates
        const isDuplicate = this.getAllWorkflows().some(wf =>
            wf.owner === workflow.owner &&
            wf.repo === workflow.repo &&
            wf.workflow === workflow.workflow
        );

        if (isDuplicate) {
            throw new Error('Workflow already exists in the dashboard');
        }

        // Add to custom workflows
        const newWorkflow = {
            ...workflow,
            source: 'user',
            addedAt: new Date().toISOString()
        };

        this.customWorkflows.push(newWorkflow);
        this.saveCustomWorkflows();
        return true;
    }

    /**
     * Remove a custom workflow
     * @param {number} index - Index in the combined workflow list
     * @returns {boolean} - Success status
     */
    removeWorkflow(index) {
        const allWorkflows = this.getAllWorkflows();
        const workflow = allWorkflows[index];

        if (!workflow) {
            throw new Error('Workflow not found at index ' + index);
        }

        // Only allow removing custom workflows
        if (workflow.source !== 'user') {
            throw new Error('Cannot remove workflows from config.js. Only user-added workflows can be removed.');
        }

        // Find in custom workflows and remove
        const customIndex = this.customWorkflows.findIndex(wf =>
            wf.owner === workflow.owner &&
            wf.repo === workflow.repo &&
            wf.workflow === workflow.workflow
        );

        if (customIndex !== -1) {
            this.customWorkflows.splice(customIndex, 1);
            this.saveCustomWorkflows();
            return true;
        }

        return false;
    }

    /**
     * Remove a workflow by its properties
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {string} workflow - Workflow file name
     * @returns {boolean} - Success status
     */
    removeWorkflowByProps(owner, repo, workflow) {
        const customIndex = this.customWorkflows.findIndex(wf =>
            wf.owner === owner &&
            wf.repo === repo &&
            wf.workflow === workflow
        );

        if (customIndex !== -1) {
            const workflowToRemove = this.customWorkflows[customIndex];
            
            // Only allow removing custom workflows
            if (workflowToRemove.source !== 'user') {
                throw new Error('Cannot remove workflows from config.js');
            }

            this.customWorkflows.splice(customIndex, 1);
            this.saveCustomWorkflows();
            return true;
        }

        throw new Error('Custom workflow not found');
    }

    /**
     * Clear all custom workflows
     * @returns {boolean} - Success status
     */
    clearCustomWorkflows() {
        this.customWorkflows = [];
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Failed to clear custom workflows:', error);
            return false;
        }
    }

    /**
     * Get count of custom workflows
     * @returns {number} - Number of custom workflows
     */
    getCustomWorkflowCount() {
        return this.customWorkflows.length;
    }
}
