/**
 * Shared task computation logic.
 *
 * Calculates pending care tasks by comparing each plant's most recent event
 * of each care type against its interval. Tasks surface at 80% of interval.
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

export async function computeTasks(plantsContainer, eventsContainer) {
  const { resources: plants } = await plantsContainer.items
    .query('SELECT * FROM c')
    .fetchAll();

  if (plants.length === 0) return [];

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

  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  tasks.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return tasks;
}
