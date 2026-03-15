import type { Plant } from '../types';
import { apiFetch } from './client';

export function fetchPlants(): Promise<Plant[]> {
  return apiFetch('/api/plants');
}

export function fetchPlant(id: string): Promise<Plant> {
  return apiFetch(`/api/plants/${id}`);
}

export async function createPlant(
  plant: Partial<Plant>,
  photo?: File | string,
): Promise<Plant> {
  const token = localStorage.getItem('token');
  const API_BASE = import.meta.env.VITE_API_BASE ?? '';
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const fd = new FormData();
  if (plant.id) fd.append('id', plant.id);
  if (plant.name) fd.append('name', plant.name);
  if (plant.slug) fd.append('slug', plant.slug);
  if (plant.notes) fd.append('notes', plant.notes);

  if (photo instanceof File) {
    fd.append('photo', photo);
  } else if (typeof photo === 'string' && photo.trim()) {
    fd.append('photoUrl', photo.trim());
  }

  let res: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(`${API_BASE}/api/plants`, { method: 'POST', headers, body: fd });
    if (res.status !== 503) break;
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
  if (!res!.ok) {
    const err = await res!.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create plant');
  }
  return res!.json();
}

export function updatePlant(id: string, plant: Partial<Plant>): Promise<Plant> {
  return apiFetch(`/api/plants/${id}`, { method: 'PUT', body: JSON.stringify(plant) });
}

export function deletePlant(id: string): Promise<void> {
  return apiFetch(`/api/plants/${id}`, { method: 'DELETE' });
}

export async function uploadPlantPhoto(plantId: string, source: File | string): Promise<{ url: string }> {
  const token = localStorage.getItem('token');
  const API_BASE = import.meta.env.VITE_API_BASE ?? '';
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let body: FormData | string;
  if (typeof source === 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ url: source });
  } else {
    const fd = new FormData();
    fd.append('photo', source);
    body = fd;
  }

  const res = await fetch(`${API_BASE}/api/plants/${plantId}/photos`, {
    method: 'POST',
    headers,
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}
