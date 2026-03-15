import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { usePlant } from '../../hooks/usePlants';
import { useEvents } from '../../hooks/useEvents';
import { usePhotos } from '../../hooks/usePhotos';
import { PhotoTimeline } from './PhotoTimeline';
import { EventLog } from './EventLog';
import { LogAction } from '../actions/LogAction';
import { ChatPanel } from '../chat/ChatPanel';

export function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { plant, loading: plantLoading } = usePlant(id!);
  const { events, loading: eventsLoading, addEvent } = useEvents(id!);
  const { photos, loading: photosLoading } = usePhotos(id!);

  if (plantLoading) return <p>Loading...</p>;
  if (!plant) return <p>Plant not found. <Link to="/">Back to plants</Link></p>;

  return (
    <div>
      <Link to="/" style={{ color: '#666', textDecoration: 'none', fontSize: 14 }}>
        &larr; All Plants
      </Link>

      <div style={{ marginTop: 16 }}>
        <h1 style={{ margin: 0 }}>{plant.name}</h1>
        <p style={{ color: '#666', margin: '4px 0' }}>{plant.species}</p>
        <p style={{ color: '#999', fontSize: 14 }}>{plant.room} &middot; {plant.position}</p>
        {plant.notes && <p style={{ marginTop: 8, fontStyle: 'italic' }}>{plant.notes}</p>}
      </div>

      {user && <LogAction plantId={plant.id} onAction={addEvent} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        <div>
          <h2>Photos</h2>
          <PhotoTimeline photos={photos} loading={photosLoading} />
        </div>
        <div>
          <h2>Event Log</h2>
          <EventLog events={events} loading={eventsLoading} />
        </div>
      </div>

      {user && (
        <div style={{ marginTop: 24 }}>
          <h2>Chat</h2>
          <ChatPanel plantId={plant.id} />
        </div>
      )}
    </div>
  );
}
