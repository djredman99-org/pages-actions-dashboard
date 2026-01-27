// Webhook receiver function for GitHub webhooks
// This function receives webhook events from GitHub and validates them
const { app } = require('@azure/functions');
const crypto = require('crypto');
const { getSecret } = require('../keyvault-client');

/**
 * Verify GitHub webhook signature
 * @param {string} payload - Request body as string
 * @param {string} signature - Signature from X-Hub-Signature-256 header
 * @param {string} secret - Webhook secret
 * @returns {boolean} - True if signature is valid
 */
function verifySignature(payload, signature, secret) {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const digest = 'sha256=' + hmac.digest('hex');
  
  // Use timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

/**
 * Webhook receiver function
 * Receives and validates GitHub webhook events
 */
app.http('webhook-receiver', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      context.log('Webhook received');
      
      // Get webhook secret from Key Vault
      const webhookSecret = await getSecret('github-webhook-secret');
      
      // Get signature from header
      const signature = request.headers.get('x-hub-signature-256');
      if (!signature) {
        context.log('Missing signature header');
        return {
          status: 401,
          body: JSON.stringify({ error: 'Missing signature header' })
        };
      }
      
      // Get request body as text for signature verification
      const body = await request.text();
      
      // Verify signature
      if (!verifySignature(body, signature, webhookSecret)) {
        context.log('Invalid signature');
        return {
          status: 401,
          body: JSON.stringify({ error: 'Invalid signature' })
        };
      }
      
      // Parse the verified payload
      const payload = JSON.parse(body);
      
      // Get event type
      const eventType = request.headers.get('x-github-event');
      if (!eventType) {
        context.log('Missing event type header');
        return {
          status: 400,
          body: JSON.stringify({ error: 'Missing event type header' })
        };
      }
      
      context.log(`Valid webhook received: ${eventType}`);
      
      // Queue the event for processing by the triage function
      // For now, we'll return the event details
      // In a production setup, you would use Azure Queue Storage or Service Bus
      const result = {
        eventType,
        action: payload.action,
        deliveryId: request.headers.get('x-github-delivery'),
        received: new Date().toISOString()
      };
      
      // Store the webhook for processing
      // This will be handled by invoking the triage function
      context.log('Webhook validated successfully');
      
      return {
        status: 200,
        jsonBody: {
          message: 'Webhook received and validated',
          ...result
        }
      };
      
    } catch (error) {
      context.log('Error processing webhook:', error);
      return {
        status: 500,
        body: JSON.stringify({ 
          error: 'Internal server error',
          message: error.message 
        })
      };
    }
  }
});
