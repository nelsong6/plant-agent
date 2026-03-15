import { Router } from 'express';

/**
 * Task routes — computed care tasks based on event history.
 * GET /api/tasks  – list pending care tasks across all plants
 *
 * Tasks are computed, not stored. The backend calculates pending tasks by
 * looking at each plant's most recent event of each care type and applying
 * default intervals. Plants can override intervals via their `careSchedule` field.
 */

const DEFAULT_INTERVALS = {
  watered: 7,      // days
  fertilized: 30,
  repotted: 365,
  pruned: 90,
};

function computeUrgency(daysSince, interval) {
  const ratio = daysSince / interval;
  if (ratio >= 1.5) return 'high';
  if (ratio >= 1.0) return 'medium';
  return 'low';
}

export function createTaskRoutes({ plantsContainer, eventsContainer, requireAuth }) {
  const router = Router();

  router.get('/api/tasks', async (req, res) => {
    try {
      // Fetch all plants
      const { resources: plants } = await plantsContainer.items
        .query('SELECT * FROM c')
        .fetchAll();

      if (plants.length === 0) {
        return res.json([]);
      }

      // For each plant, find the most recent event of each care type
      const now = Date.now();
      const tasks = [];

      for (const plant of plants) {
        const { resources: events } = await eventsContainer.items
          .query({
            query: 'SELECT * FROM c WHERE c.plantId = @plantId ORDER BY c.date DESC',
            parameters: [{ name: '@plantId', value: plant.id }],
          })
          .fetchAll();

        const intervals = { ...DEFAULT_INTERVALS, ...plant.careSchedule };

        for (const [careType, intervalDays] of Object.entries(intervals)) {
          const lastEvent = events.find((e) => e.type === careType);
          const daysSince = lastEvent
            ? Math.floor((now - new Date(lastEvent.date).getTime()) / (1000 * 60 * 60 * 24))
            : Infinity;

          // Only surface tasks that are due or overdue
          if (daysSince >= intervalDays * 0.8) {
            tasks.push({
              plantId: plant.id,
              plantName: plant.name,
              room: plant.room,
              action: careType,
              intervalDays,
              daysSinceLast: daysSince === Infinity ? null : daysSince,
              lastDate: lastEvent?.date || null,
              urgency: daysSince === Infinity ? 'high' : computeUrgency(daysSince, intervalDays),
            });
          }
        }
      }

      // Sort: high urgency first, then medium, then low
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      tasks.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

      res.json(tasks);
    } catch (error) {
      console.error('Error computing tasks:', error);
      res.status(500).json({ error: 'Failed to compute tasks' });
    }
  });

  return router;
}
