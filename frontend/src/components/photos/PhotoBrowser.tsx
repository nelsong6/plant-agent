import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Plant } from '../../types';
import type { Photo } from '../../hooks/usePhotos';
import { fetchPlants } from '../../api/plants';
import { apiFetch } from '../../api/client';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { PhotoLightbox } from '../ui/PhotoLightbox';

interface PlantPhotos {
  plant: Plant;
  photos: Photo[];
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function PhotoBrowser() {
  const [plantPhotos, setPlantPhotos] = useState<PlantPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<{ src: string; alt: string } | null>(null);

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

  if (loading) {
    return (
      <div>
        <PageHeader title="Photos" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const rooms = [...new Set(plantPhotos.map((pp) => pp.plant.room))];
  const filtered = filter
    ? plantPhotos.filter((pp) => pp.plant.room === filter)
    : plantPhotos;

  return (
    <div>
      <PageHeader
        title="Photos"
        action={
          rooms.length > 1 ? (
            <div className="flex gap-1">
              <button
                onClick={() => setFilter('')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  !filter ? 'bg-leaf-500 text-white' : 'bg-bark-100 dark:bg-bark-700 text-bark-600 dark:text-bark-300 hover:bg-bark-200 dark:hover:bg-bark-600'
                }`}
              >
                All
              </button>
              {rooms.map((room) => (
                <button
                  key={room}
                  onClick={() => setFilter(room)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filter === room ? 'bg-leaf-500 text-white' : 'bg-bark-100 dark:bg-bark-700 text-bark-600 dark:text-bark-300 hover:bg-bark-200 dark:hover:bg-bark-600'
                  }`}
                >
                  {room}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      {filtered.length === 0 && (
        <EmptyState
          icon={<CameraIcon className="w-12 h-12" />}
          title="No photos yet"
          description="Photos from capture sessions will appear here."
        />
      )}

      {filtered.map(({ plant, photos }) => (
        <div key={plant.id} className="mb-8">
          <Link to={`/plants/${plant.id}`} className="inline-flex items-baseline gap-2 no-underline mb-3">
            <h3 className="text-base font-medium text-bark-900 dark:text-bark-50 hover:text-leaf-600 transition-colors">{plant.name}</h3>
            <span className="text-sm text-bark-400 dark:text-bark-500">{plant.room}</span>
          </Link>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {photos.map((photo) => (
              <Card key={photo.url} hover>
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="w-full aspect-square object-cover cursor-pointer"
                  onClick={() => setSelectedPhoto({ src: photo.url, alt: photo.name })}
                />
              </Card>
            ))}
          </div>
        </div>
      ))}

      <PhotoLightbox
        open={selectedPhoto !== null}
        src={selectedPhoto?.src ?? ''}
        alt={selectedPhoto?.alt ?? ''}
        onClose={() => setSelectedPhoto(null)}
      />
    </div>
  );
}
