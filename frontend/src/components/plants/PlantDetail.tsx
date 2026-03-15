import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { usePlant } from '../../hooks/usePlants';
import { useEvents } from '../../hooks/useEvents';
import { usePhotos } from '../../hooks/usePhotos';
import { PhotoTimeline } from './PhotoTimeline';
import { EventLog } from './EventLog';
import { LogAction } from '../actions/LogAction';
import { ChatPanel } from '../chat/ChatPanel';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

export function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { plant, loading: plantLoading } = usePlant(id!);
  const { events, loading: eventsLoading, addEvent } = useEvents(id!);
  const { photos, loading: photosLoading } = usePhotos(id!);

  if (plantLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="text-center py-16">
        <p className="text-bark-500 dark:text-bark-400">Plant not found.</p>
        <Link to="/" className="text-leaf-600 hover:text-leaf-700 text-sm mt-2 inline-block">
          Back to plants
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-bark-500 dark:text-bark-400 mb-4">
        <Link to="/" className="hover:text-bark-700 dark:hover:text-bark-200 transition-colors">Plants</Link>
        <span>/</span>
        <span className="text-bark-800 dark:text-bark-100">{plant.name}</span>
      </nav>

      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-bark-900 dark:text-bark-50">{plant.name}</h1>
        <p className="text-bark-600 dark:text-bark-300 mt-1">{plant.species}</p>
        <div className="flex items-center gap-2 text-sm text-bark-400 mt-1">
          <span>{plant.room}</span>
          <span>&middot;</span>
          <span>{plant.position}</span>
        </div>
        {plant.notes && (
          <p className="mt-3 text-sm text-bark-600 dark:text-bark-300 italic">{plant.notes}</p>
        )}
      </div>

      {/* Actions */}
      {isAdmin && <LogAction plantId={plant.id} onAction={addEvent} />}

      {/* Two-column: Photos + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-bark-900 dark:text-bark-50 mb-4">Photos</h2>
          <PhotoTimeline photos={photos} loading={photosLoading} />
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-bark-900 dark:text-bark-50 mb-4">Event Log</h2>
          <EventLog events={events} loading={eventsLoading} />
        </Card>
      </div>

      {/* Chat */}
      {isAdmin && (
        <div className="mt-6">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-bark-900 dark:text-bark-50 mb-4">Chat</h2>
            <ChatPanel plantId={plant.id} />
          </Card>
        </div>
      )}
    </div>
  );
}
