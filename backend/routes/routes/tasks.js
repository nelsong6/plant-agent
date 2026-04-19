import { Router } from 'express';
import { computeTasks } from '../lib/computeTasks.js';

/**
 * Task routes — computed care tasks based on event history.
 * GET /api/tasks  – list pending care tasks across all plants
 */

export function createTaskRoutes({ plantsContainer, eventsContainer, requireAuth }) {
  const router = Router();

  router.get('/api/tasks', async (req, res) => {
    try {
      const tasks = await computeTasks(plantsContainer, eventsContainer);
      res.json(tasks);
    } catch (error) {
      console.error('Error computing tasks:', error);
      res.status(500).json({ error: 'Failed to compute tasks' });
    }
  });

  return router;
}
