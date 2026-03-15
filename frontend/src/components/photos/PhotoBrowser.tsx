import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Plant } from '../../types';
import type { Photo } from '../../hooks/usePhotos';
import { fetchPlants } from '../../api/plants';
import { apiFetch } from '../../api/client';

interface PlantPhotos {
  plant: Plant;
  photos: Photo[];
}

export function PhotoBrowser() {
  const [plantPhotos, setPlantPhotos] = useState<PlantPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const plants = await fetchPlants();
        const results = await Promise.all(
          plants.map(async (plant) => {
            const photos = await apiFetch<Photo[]>(`/api/plants/${plant.id}/photos`);
            return { plant, photos };
          }),
        );
        setPlantPhotos(results.filter((r) => r.photos.length > 0));
      } catch (e) {
        console.error('Error loading photos:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p>Loading photos...</p>;

  const rooms = [...new Set(plantPhotos.map((pp) => pp.plant.room))];
  const filtered = filter
    ? plantPhotos.filter((pp) => pp.plant.room === filter)
    : plantPhotos;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Photos</h2>
        {rooms.length > 1 && (
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: 6 }}>
            <option value="">All rooms</option>
            {rooms.map((room) => (
              <option key={room} value={room}>{room}</option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: '#999' }}>No photos yet. Run a capture session to get started.</p>
      )}

      {filtered.map(({ plant, photos }) => (
        <div key={plant.id} style={{ marginBottom: 24 }}>
          <Link to={`/plants/${plant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3>{plant.name} <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>{plant.room}</span></h3>
          </Link>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
            {photos.map((photo) => (
              <img
                key={photo.url}
                src={photo.url}
                alt={photo.name}
                style={{ width: '100%', borderRadius: 4, display: 'block' }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
