import { Router } from 'express';

/**
 * Plant CRUD routes.
 * GET    /api/plants          – list all plants
 * GET    /api/plants/:id      – get single plant
 * POST   /api/plants          – create plant (admin)
 * PUT    /api/plants/:id      – update plant (admin)
 * DELETE /api/plants/:id      – delete plant (admin)
 */
export function createPlantRoutes({ plantsContainer, requireAuth }) {
  const router = Router();

  router.get('/api/plants', async (req, res) => {
    try {
      const { resources } = await plantsContainer.items
        .query('SELECT * FROM c')
        .fetchAll();
      res.json(resources);
    } catch (error) {
      console.error('Error fetching plants:', error);
      res.status(500).json({ error: 'Failed to fetch plants' });
    }
  });

  router.get('/api/plants/:id', async (req, res) => {
    try {
      const { resource } = await plantsContainer.item(req.params.id, req.params.id).read();
      if (!resource) return res.status(404).json({ error: 'Plant not found' });
      res.json(resource);
    } catch (error) {
      console.error('Error fetching plant:', error);
      res.status(500).json({ error: 'Failed to fetch plant' });
    }
  });

  router.post('/api/plants', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    try {
      const plant = {
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const { resource } = await plantsContainer.items.create(plant);
      res.status(201).json(resource);
    } catch (error) {
      console.error('Error creating plant:', error);
      res.status(500).json({ error: 'Failed to create plant' });
    }
  });

  router.put('/api/plants/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    try {
      const plant = {
        ...req.body,
        id: req.params.id,
        updatedAt: new Date().toISOString(),
      };
      const { resource } = await plantsContainer.items.upsert(plant);
      res.json(resource);
    } catch (error) {
      console.error('Error updating plant:', error);
      res.status(500).json({ error: 'Failed to update plant' });
    }
  });

  router.delete('/api/plants/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    try {
      await plantsContainer.item(req.params.id, req.params.id).delete();
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting plant:', error);
      res.status(500).json({ error: 'Failed to delete plant' });
    }
  });

  return router;
}
