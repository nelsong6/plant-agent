import { useEffect, useState } from 'react';
import type { Plant } from '../types';
import { useDataSource } from '../api/snapshotContext';

export function usePlants() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchPlants, isReady } = useDataSource();

  useEffect(() => {
    if (!isReady) return;
    fetchPlants()
      .then(setPlants)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isReady]);

  return { plants, loading, error, refetch: () => fetchPlants().then(setPlants) };
}

export function usePlant(id: string) {
  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchPlant, isReady } = useDataSource();

  useEffect(() => {
    if (!isReady) return;
    setLoading(true);
    fetchPlant(id)
      .then(setPlant)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isReady]);

  return { plant, loading, error };
}
