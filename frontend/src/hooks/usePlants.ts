import { useEffect, useState } from 'react';
import type { Plant } from '../types';
import { fetchPlants, fetchPlant } from '../api/plants';

export function usePlants() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlants()
      .then(setPlants)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { plants, loading, error, refetch: () => fetchPlants().then(setPlants) };
}

export function usePlant(id: string) {
  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchPlant(id)
      .then(setPlant)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { plant, loading, error };
}
