import type { PlantEvent } from '../../types';

interface Props {
  events: PlantEvent[];
  loading: boolean;
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  watered: { label: 'Watered', color: '#3b82f6' },
  fertilized: { label: 'Fertilized', color: '#22c55e' },
  repotted: { label: 'Repotted', color: '#a855f7' },
  pruned: { label: 'Pruned', color: '#f97316' },
  analysis: { label: 'Analysis', color: '#06b6d4' },
  note: { label: 'Note', color: '#6b7280' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

export function EventLog({ events, loading }: Props) {
  if (loading) return <p>Loading events...</p>;

  if (events.length === 0) {
    return <p style={{ color: '#999' }}>No events logged yet.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {events.map((event) => {
        const meta = EVENT_LABELS[event.type] || { label: event.type, color: '#6b7280' };
        return (
          <div key={event.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '8px 0', borderBottom: '1px solid #f0f0f0',
          }}>
            <span style={{
              background: meta.color, color: '#fff',
              fontSize: 11, padding: '2px 8px', borderRadius: 12,
              whiteSpace: 'nowrap', marginTop: 2,
            }}>
              {meta.label}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {event.notes && <p style={{ margin: 0, fontSize: 14 }}>{event.notes}</p>}
              <p style={{ margin: 0, fontSize: 12, color: '#999' }}>{formatDate(event.date)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
