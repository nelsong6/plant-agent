import { Router } from 'express';
import crypto from 'node:crypto';

/**
 * Plant event routes.
 * GET  /api/plants/:plantId/events  – list events for a plant
 * POST /api/plants/:plantId/events  – log a new event
 */
export function createEventRoutes({ eventsContainer, requireAuth }) {
  const router = Router();

  router.get('/api/plants/:plantId/events', async (req, res) => {
    try {
      const { plantId } = req.params;
      const type = req.query.type;
      const limit = parseInt(req.query.limit) || 50;

      let query = 'SELECT TOP @limit * FROM c WHERE c.plantId = @plantId';
      const parameters = [
        { name: '@plantId', value: plantId },
        { name: '@limit', value: limit },
      ];

      if (type) {
        query += ' AND c.type = @type';
        parameters.push({ name: '@type', value: type });
      }

      query += ' ORDER BY c.date DESC';

      const { resources } = await eventsContainer.items
        .query({ query, parameters })
        .fetchAll();
      res.json(resources);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  router.post('/api/plants/:plantId/events', requireAuth, async (req, res) => {
    try {
      const event = {
        id: `evt-${crypto.randomUUID()}`,
        plantId: req.params.plantId,
        type: req.body.type,
        notes: req.body.notes || '',
        date: req.body.date || new Date().toISOString(),
        userId: req.user.sub,
        createdAt: new Date().toISOString(),
      };

      const { resource } = await eventsContainer.items.create(event);
      res.status(201).json(resource);
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  });

  return router;
}
