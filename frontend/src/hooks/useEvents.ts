import { useCallback, useEffect, useState } from 'react';
import type { PlantEvent } from '../types';
import { fetchEvents, logEvent } from '../api/events';

export function useEvents(plantId: string) {
  const [events, setEvents] = useState<PlantEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchEvents(plantId)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [plantId]);

  useEffect(load, [load]);

  async function addEvent(type: string, notes?: string) {
    const event = await logEvent(plantId, { type, notes });
    setEvents((prev) => [event, ...prev]);
    return event;
  }

  return { events, loading, addEvent, refetch: load };
}
