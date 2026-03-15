import type { PlantEvent } from '../types';
import { apiFetch } from './client';

export function fetchEvents(plantId: string, type?: string): Promise<PlantEvent[]> {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  const qs = params.toString();
  return apiFetch(`/api/plants/${plantId}/events${qs ? `?${qs}` : ''}`);
}

export function logEvent(plantId: string, event: { type: string; notes?: string; date?: string }): Promise<PlantEvent> {
  return apiFetch(`/api/plants/${plantId}/events`, { method: 'POST', body: JSON.stringify(event) });
}
