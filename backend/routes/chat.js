import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Chat routes — AI chat about a specific plant.
 * POST /api/plants/:plantId/chat  – send message, get SSE stream back
 *
 * Builds context from plant record + recent events + recent photos,
 * sends to Claude, streams response via Server-Sent Events.
 */
export function createChatRoutes({ plantsContainer, eventsContainer, requireAuth, anthropicApiKey }) {
  const router = Router();

  router.post('/api/plants/:plantId/chat', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { plantId } = req.params;
    const { message, history = [] } = req.body;

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

      // Build system prompt with plant context
      const systemPrompt = buildSystemPrompt(plant, events);

      // Build message history
      const messages = [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
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
        messages,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          res.write(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Chat error:', error);
      // If headers already sent (streaming started), send error event
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

function buildSystemPrompt(plant, events) {
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
- If you're unsure about the species, ask for clarification.`;
}
