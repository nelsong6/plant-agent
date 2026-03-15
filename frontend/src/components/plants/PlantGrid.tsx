import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { usePlants } from '../../hooks/usePlants';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { SkeletonCard } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ErrorBanner } from '../ui/ErrorBanner';
import { AddPlantForm } from './AddPlantForm';

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8c.7-1 1-2.2 1-3.5C18 2.5 16.5 1 14.5 1c-1 0-2 .5-2.5 1.2C11.5 1.5 10.5 1 9.5 1 7.5 1 6 2.5 6 4.5c0 1.3.3 2.5 1 3.5" />
      <path d="M12 2v20" />
      <path d="M6 8c-1.5 1.5-3 4-3 7 0 4 2.5 7 9 7s9-3 9-7c0-3-1.5-5.5-3-7" />
    </svg>
  );
}

export function PlantGrid() {
  const { plants, loading, error, refetch } = usePlants();
  const { isAdmin } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const existingRooms = [...new Set(plants.map((p) => p.room).filter(Boolean))];
  const addButton = isAdmin ? (
    <Button size="sm" onClick={() => setShowForm((f) => !f)}>
      + Add Plant
    </Button>
  ) : undefined;

  if (loading) {
    return (
      <div>
        <PageHeader title="My Plants" action={addButton} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="My Plants" action={addButton} />
        {showForm && (
          <AddPlantForm
            existingRooms={existingRooms}
            onCreated={() => { refetch(); setShowForm(false); }}
            onCancel={() => setShowForm(false)}
          />
        )}
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (plants.length === 0) {
    return (
      <div>
        <PageHeader title="My Plants" action={addButton} />
        {showForm ? (
          <AddPlantForm
            existingRooms={existingRooms}
            onCreated={() => { refetch(); setShowForm(false); }}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <EmptyState
            icon={<LeafIcon className="w-12 h-12" />}
            title="No plants yet"
            description="Add your first plant to get started."
          />
        )}
      </div>
    );
  }

  const rooms = new Map<string, typeof plants>();
  for (const plant of plants) {
    const room = plant.room || 'Unassigned';
    if (!rooms.has(room)) rooms.set(room, []);
    rooms.get(room)!.push(plant);
  }

  return (
    <div>
      <PageHeader title="My Plants" count={plants.length} action={addButton} />
      {showForm && (
        <AddPlantForm
          existingRooms={existingRooms}
          onCreated={() => { refetch(); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}
      {[...rooms.entries()].map(([room, roomPlants]) => (
        <div key={room} className="mb-8">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-bark-500 dark:text-bark-400 mb-3">
            {room}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {roomPlants.map((plant) => (
              <Link key={plant.id} to={`/plants/${plant.id}`} className="no-underline text-inherit">
                <Card hover>
                  <div className="h-32 bg-leaf-50 dark:bg-leaf-900/30 flex items-center justify-center">
                    <LeafIcon className="w-10 h-10 text-leaf-300" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-bark-900 dark:text-bark-50">{plant.name}</h3>
                    <p className="text-sm text-bark-500 dark:text-bark-400 mt-0.5">{plant.species}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
