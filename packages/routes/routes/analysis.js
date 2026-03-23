import { Router } from 'express';

/**
 * Analysis routes — AI-powered plant health analysis.
 * POST /api/analysis/run        – trigger agentic capture + analysis loop
 * GET  /api/analysis             – list past analyses
 * GET  /api/analysis/:id         – get single analysis
 */
export function createAnalysisRoutes({ analysesContainer, requireAuth }) {
  const router = Router();

  router.post('/api/analysis/run', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    // TODO: Implement agentic capture loop
    // 1. Take wide reference shot via Pi API
    // 2. Send to Claude with plant roster context
    // 3. Loop: Claude requests close-ups → Pi captures → Claude analyzes
    // 4. Write results to Cosmos DB
    res.status(501).json({ error: 'Not yet implemented' });
  });

  router.get('/api/analysis', async (req, res) => {
    try {
      const { resources } = await analysesContainer.items
        .query('SELECT * FROM c ORDER BY c.date DESC')
        .fetchAll();
      res.json(resources);
    } catch (error) {
      console.error('Error fetching analyses:', error);
      res.status(500).json({ error: 'Failed to fetch analyses' });
    }
  });

  router.get('/api/analysis/:id', async (req, res) => {
    try {
      const { resource } = await analysesContainer.item(req.params.id, req.params.id).read();
      if (!resource) return res.status(404).json({ error: 'Analysis not found' });
      res.json(resource);
    } catch (error) {
      console.error('Error fetching analysis:', error);
      res.status(500).json({ error: 'Failed to fetch analysis' });
    }
  });

  return router;
}
