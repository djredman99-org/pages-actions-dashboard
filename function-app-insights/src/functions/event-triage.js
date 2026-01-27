// Event triage function for processing GitHub webhook events
// This function extracts key fields and stores events in Cosmos DB
const { app } = require('@azure/functions');
const crypto = require('crypto');
const { getSecret } = require('../keyvault-client');
const { createEvent } = require('../cosmos-client');

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
 * Extract event data from workflow_run webhook payload
 * @param {Object} payload - GitHub webhook payload
 * @returns {Object} - Extracted event data
 */
function extractEventData(payload) {
  const timestamp = payload.workflow_run?.created_at || new Date().toISOString();
  const date = new Date(timestamp);
  const partitionKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  
  const workflowRun = payload.workflow_run || {};
  const repository = payload.repository || {};
  
  // Calculate duration in seconds
  let duration_seconds = null;
  if (workflowRun.created_at && workflowRun.updated_at) {
    const start = new Date(workflowRun.created_at);
    const end = new Date(workflowRun.updated_at);
    duration_seconds = Math.round((end - start) / 1000);
  }
  
  return {
    id: `${repository.id}_${workflowRun.id}`,
    partitionKey,
    timestamp,
    eventType: 'workflow_run',
    action: payload.action,
    repository: repository.full_name,
    repositoryId: repository.id,
    workflowName: workflowRun.name,
    workflowId: workflowRun.workflow_id,
    runId: workflowRun.id,
    runNumber: workflowRun.run_number,
    status: workflowRun.status,
    conclusion: workflowRun.conclusion,
    duration_seconds,
    actor: workflowRun.actor?.login,
    branch: workflowRun.head_branch,
    triggeredBy: workflowRun.event,
    htmlUrl: workflowRun.html_url,
    rawPayload: payload
  };
}

/**
 * Event triage function
 * Processes webhook events and stores them in Cosmos DB
 */
app.http('event-triage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      context.log('Event triage started');
      
      // Get webhook secret from Key Vault
      const webhookSecret = await getSecret('github-webhook-secret');
      
      // Get signature from header
      const signature = request.headers.get('x-hub-signature-256');
      if (!signature) {
        context.log('Missing signature header');
        return {
          status: 401,
          jsonBody: { error: 'Missing signature header' }
        };
      }
      
      // Get request body as text for signature verification
      const body = await request.text();
      
      // Verify signature
      if (!verifySignature(body, signature, webhookSecret)) {
        context.log('Invalid signature');
        return {
          status: 401,
          jsonBody: { error: 'Invalid signature' }
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
          jsonBody: { error: 'Missing event type header' }
        };
      }
      
      // Only process workflow_run events
      if (eventType !== 'workflow_run') {
        context.log(`Ignoring event type: ${eventType}`);
        return {
          status: 200,
          jsonBody: { 
            message: 'Event type not supported',
            eventType 
          }
        };
      }
      
      // Extract event data
      const eventData = extractEventData(payload);
      context.log(`Processing workflow_run event for ${eventData.repository}/${eventData.workflowName}`);
      
      // Store in Cosmos DB
      const storedEvent = await createEvent(eventData);
      context.log(`Event stored with id: ${storedEvent.id}`);
      
      return {
        status: 201,
        jsonBody: {
          message: 'Event processed and stored successfully',
          eventId: storedEvent.id,
          partitionKey: storedEvent.partitionKey,
          repository: storedEvent.repository,
          workflowName: storedEvent.workflowName,
          conclusion: storedEvent.conclusion
        }
      };
      
    } catch (error) {
      context.error('Error processing event:', error);
      return {
        status: 500,
        jsonBody: { 
          error: 'Internal server error',
          message: error.message 
        }
      };
    }
  }
});
