import { useEffect, useState } from 'react';
import { useDataSource } from '../api/snapshotContext';

export interface Photo {
  url: string;
  name: string;
  createdAt: string;
}

export function usePhotos(plantId: string) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const { fetchPhotos, isReady } = useDataSource();

  useEffect(() => {
    if (!isReady) return;
    setLoading(true);
    fetchPhotos(plantId)
      .then(setPhotos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [plantId, isReady]);

  return { photos, loading };
}
