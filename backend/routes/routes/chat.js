import { Router } from 'express';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';

const PHOTOS_CONTAINER = 'photos';
const MAX_PHOTOS = 3;

/**
 * Chat routes — single-turn AI chat about a specific plant.
 * GET  /api/plants/:plantId/chats      – list saved chats
 * POST /api/plants/:plantId/chats      – send one message, get SSE stream, save exchange
 */
export function createChatRoutes({ plantsContainer, eventsContainer, chatsContainer, requireAuth, anthropicApiKey, storageAccountEndpoint }) {
  const router = Router();

  const blobService = storageAccountEndpoint
    ? new BlobServiceClient(storageAccountEndpoint, new DefaultAzureCredential())
    : null;
  const photosClient = blobService?.getContainerClient(PHOTOS_CONTAINER);

  // List saved chats for a plant (newest first)
  router.get('/api/plants/:plantId/chats', async (req, res) => {
    try {
      const { resources: chats } = await chatsContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.plantId = @plantId ORDER BY c.createdAt DESC',
          parameters: [{ name: '@plantId', value: req.params.plantId }],
        })
        .fetchAll();
      res.json(chats);
    } catch (error) {
      console.error('Error listing chats:', error);
      res.status(500).json({ error: 'Failed to list chats' });
    }
  });

  // Single-turn chat: send message, stream response, save both
  router.post('/api/plants/:plantId/chats', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { plantId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    if (!anthropicApiKey) {
      return res.status(503).json({ error: 'AI chat not configured — missing API key' });
    }

    try {
      // Fetch plant context
      const { resource: plant } = await plantsContainer.item(plantId, plantId).read();
      if (!plant) {
        return res.status(404).json({ error: 'Plant not found' });
      }

      // Fetch recent events for context
      const { resources: events } = await eventsContainer.items
        .query({
          query: 'SELECT TOP 20 * FROM c WHERE c.plantId = @plantId ORDER BY c.date DESC',
          parameters: [{ name: '@plantId', value: plantId }],
        })
        .fetchAll();

      // Fetch recent photos for vision context
      const photoContent = [];
      if (photosClient) {
        const photos = await getRecentPhotos(photosClient, plant);
        for (const photo of photos) {
          photoContent.push({
            type: 'image',
            source: { type: 'base64', media_type: photo.mediaType, data: photo.base64 },
          });
        }
      }

      const hasPhotos = photoContent.length > 0;
      const systemPrompt = buildSystemPrompt(plant, events, hasPhotos);

      const userContent = [
        ...photoContent,
        { type: 'text', text: message },
      ];

      // Set up SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Stream from Claude
      const client = new Anthropic({ apiKey: anthropicApiKey });
      const stream = await client.messages.stream({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      });

      let assistantText = '';
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          assistantText += event.delta.text;
          res.write(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`);
        }
      }

      // Save chat exchange to Cosmos DB
      const chatDoc = {
        id: `chat-${randomUUID()}`,
        plantId,
        userMessage: message,
        assistantMessage: assistantText,
        userId: req.user.id,
        createdAt: new Date().toISOString(),
      };
      await chatsContainer.items.create(chatDoc);

      res.write(`data: ${JSON.stringify({ type: 'done', chat: chatDoc })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Chat error:', error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream interrupted' })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: 'Chat failed' });
      }
    }
  });

  return router;
}

/** Fetch the N most recent photo blobs for a plant, returned as base64. */
async function getRecentPhotos(containerClient, plant) {
  const prefix = `${plant.slug || plant.id}/`;
  const blobs = [];
  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    blobs.push(blob);
  }
  blobs.sort((a, b) => (b.properties.createdOn || 0) - (a.properties.createdOn || 0));
  const recent = blobs.slice(0, MAX_PHOTOS);

  const photos = [];
  for (const blob of recent) {
    const blobClient = containerClient.getBlobClient(blob.name);
    const downloaded = await blobClient.downloadToBuffer();
    const ext = blob.name.split('.').pop()?.toLowerCase();
    const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    photos.push({ base64: downloaded.toString('base64'), mediaType });
  }
  return photos;
}

function buildSystemPrompt(plant, events, hasPhotos) {
  const eventSummary = events.length > 0
    ? events.map((e) => `- ${e.date}: ${e.type}${e.notes ? ` — ${e.notes}` : ''}`).join('\n')
    : 'No events logged yet.';

  return `You are a knowledgeable plant care assistant. You are helping the user with a specific plant.

## Plant Information
- **Name:** ${plant.name}
- **Species:** ${plant.species || 'Unknown'}
- **Location:** ${plant.room || 'Unknown'}${plant.position ? `, ${plant.position}` : ''}
${plant.notes ? `- **Notes:** ${plant.notes}` : ''}

## Recent Care History
${eventSummary}

## Instructions
- Give specific, actionable advice based on the plant's species and care history.
- Reference the care history when relevant (e.g., "It's been X days since the last watering").
- If you notice concerning patterns (overwatering, underwatering, etc.), mention them.
- Keep responses concise but thorough.
- If you're unsure about the species, ask for clarification.${hasPhotos ? '\n- Recent photos of the plant are included. Use them to assess the plant\'s visual health — look for leaf color, wilting, pests, soil condition, and overall vitality.' : ''}`;
}
