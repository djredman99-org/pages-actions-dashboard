// GitHub App Authentication Module
// Handles GitHub App authentication using private key from Key Vault

const crypto = require('crypto');
const { createAppAuth } = require('@octokit/auth-app');
const { Octokit } = require('@octokit/rest');

/**
 * Create an authenticated Octokit instance using GitHub App credentials
 * @param {string} appId - GitHub App ID
 * @param {string} privateKey - GitHub App private key (PEM format)
 * @returns {Promise<Octokit>} Authenticated Octokit instance
 */
async function createGitHubAppClient(appId, privateKey) {
    try {
        // Create app authentication
        const auth = createAppAuth({
            appId: appId,
            privateKey: privateKey,
        });

        // Get app installation token
        // Note: This requires the app to be installed on the target repositories
        const appAuthentication = await auth({ type: 'app' });

        // Create Octokit instance with app authentication
        const octokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: appId,
                privateKey: privateKey,
            },
        });

        return octokit;
    } catch (error) {
        console.error('Failed to create GitHub App client:', error);
        throw new Error(`GitHub App authentication failed: ${error.message}`);
    }
}

/**
 * Create an authenticated Octokit instance for a specific installation
 * @param {string} appId - GitHub App ID
 * @param {string} privateKey - GitHub App private key (PEM format)
 * @param {number} installationId - GitHub App installation ID
 * @returns {Promise<Octokit>} Authenticated Octokit instance
 */
async function createInstallationClient(appId, privateKey, installationId) {
    try {
        const octokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: appId,
                privateKey: privateKey,
                installationId: installationId,
            },
        });

        return octokit;
    } catch (error) {
        console.error('Failed to create installation client:', error);
        throw new Error(`Installation authentication failed: ${error.message}`);
    }
}

/**
 * Get all installations for the GitHub App
 * @param {string} appId - GitHub App ID
 * @param {string} privateKey - GitHub App private key (PEM format)
 * @returns {Promise<Array>} List of installations
 */
async function getAppInstallations(appId, privateKey) {
    try {
        const octokit = await createGitHubAppClient(appId, privateKey);
        const { data: installations } = await octokit.rest.apps.listInstallations();
        return installations;
    } catch (error) {
        console.error('Failed to get app installations:', error);
        const errorDetails = error.status ? `HTTP ${error.status}: ${error.message}` : error.message;
        throw new Error(`Failed to get GitHub App installations: ${errorDetails}`);
    }
}

module.exports = {
    createGitHubAppClient,
    createInstallationClient,
    getAppInstallations,
};
