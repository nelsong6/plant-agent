import type { PlantEvent } from '../../types';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonRow } from '../ui/Skeleton';

interface Props {
  events: PlantEvent[];
  loading: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  watered: 'Watered',
  fertilized: 'Fertilized',
  repotted: 'Repotted',
  pruned: 'Pruned',
  analysis: 'Analysis',
  note: 'Note',
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
  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 4 }, (_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (events.length === 0) {
    return <EmptyState title="No events yet" description="Log a care action to start tracking." />;
  }

  return (
    <div className="divide-y divide-bark-100 dark:divide-bark-700">
      {events.map((event) => (
        <div key={event.id} className="flex items-start gap-3 py-3">
          <Badge variant={event.type}>
            {EVENT_LABELS[event.type] || event.type}
          </Badge>
          <div className="flex-1 min-w-0">
            {event.notes && (
              <p className="text-sm text-bark-800 dark:text-bark-100">{event.notes}</p>
            )}
            <p className="text-xs text-bark-400 mt-0.5">{formatDate(event.date)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
