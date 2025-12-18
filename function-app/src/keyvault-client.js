// Azure Key Vault Client Module
// Handles retrieving secrets from Azure Key Vault using managed identity

const crypto = require('crypto');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

/**
 * Get a secret from Azure Key Vault
 * @param {string} keyVaultUrl - Key Vault URL (e.g., https://myvault.vault.azure.net/)
 * @param {string} secretName - Name of the secret to retrieve
 * @returns {Promise<string>} Secret value
 */
async function getSecret(keyVaultUrl, secretName) {
    try {
        // Use managed identity to authenticate
        const credential = new DefaultAzureCredential();
        const client = new SecretClient(keyVaultUrl, credential);

        // Get the secret
        const secret = await client.getSecret(secretName);
        return secret.value;
    } catch (error) {
        console.error(`Failed to get secret '${secretName}' from Key Vault:`, error);
        throw new Error(`Key Vault access failed: ${error.message}`);
    }
}

/**
 * Get multiple secrets from Key Vault
 * @param {string} keyVaultUrl - Key Vault URL
 * @param {Array<string>} secretNames - Array of secret names to retrieve
 * @returns {Promise<Object>} Object with secret names as keys and secret values as values
 */
async function getSecrets(keyVaultUrl, secretNames) {
    const secrets = {};
    
    for (const secretName of secretNames) {
        secrets[secretName] = await getSecret(keyVaultUrl, secretName);
    }
    
    return secrets;
}

module.exports = {
    getSecret,
    getSecrets,
};
