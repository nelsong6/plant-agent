import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

export interface Photo {
  url: string;
  name: string;
  createdAt: string;
}

export function usePhotos(plantId: string) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<Photo[]>(`/api/plants/${plantId}/photos`)
      .then(setPhotos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [plantId]);

  return { photos, loading };
}
