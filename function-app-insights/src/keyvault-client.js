// Key Vault client for accessing secrets using Managed Identity
const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');

let secretClient = null;

/**
 * Initialize the Key Vault client
 */
function getSecretClient() {
  if (!secretClient) {
    const keyVaultUrl = process.env.KEY_VAULT_URL;
    if (!keyVaultUrl) {
      throw new Error('KEY_VAULT_URL environment variable is not set');
    }
    
    const credential = new DefaultAzureCredential();
    secretClient = new SecretClient(keyVaultUrl, credential);
  }
  return secretClient;
}

/**
 * Get a secret from Key Vault
 * @param {string} secretName - Name of the secret to retrieve
 * @returns {Promise<string>} - Secret value
 */
async function getSecret(secretName) {
  try {
    const client = getSecretClient();
    const secret = await client.getSecret(secretName);
    return secret.value;
  } catch (error) {
    throw new Error(`Failed to get secret '${secretName}' from Key Vault: ${error.message}`);
  }
}

module.exports = {
  getSecret
};
