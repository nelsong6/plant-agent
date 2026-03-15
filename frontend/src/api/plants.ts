import type { Plant } from '../types';
import { apiFetch } from './client';

export function fetchPlants(): Promise<Plant[]> {
  return apiFetch('/api/plants');
}

export function fetchPlant(id: string): Promise<Plant> {
  return apiFetch(`/api/plants/${id}`);
}

export function createPlant(plant: Partial<Plant>): Promise<Plant> {
  return apiFetch('/api/plants', { method: 'POST', body: JSON.stringify(plant) });
}

export function updatePlant(id: string, plant: Partial<Plant>): Promise<Plant> {
  return apiFetch(`/api/plants/${id}`, { method: 'PUT', body: JSON.stringify(plant) });
}

export function deletePlant(id: string): Promise<void> {
  return apiFetch(`/api/plants/${id}`, { method: 'DELETE' });
}
