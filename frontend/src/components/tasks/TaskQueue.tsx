import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Task } from '../../types';
import { apiFetch } from '../../api/client';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonRow } from '../ui/Skeleton';

const ACTION_LABELS: Record<string, string> = {
  watered: 'Needs watering',
  fertilized: 'Needs fertilizing',
  repotted: 'Needs repotting',
  pruned: 'Needs pruning',
};

const URGENCY_BORDER: Record<string, string> = {
  high: 'border-l-urgency-high',
  medium: 'border-l-urgency-medium',
  low: 'border-l-urgency-low',
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </svg>
  );
}

export function TaskQueue() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Task[]>('/api/tasks')
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader title="Tasks" />
        <Card className="divide-y divide-bark-100 dark:divide-bark-700">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="px-5 py-1"><SkeletonRow /></div>
          ))}
        </Card>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div>
        <PageHeader title="Tasks" />
        <EmptyState
          icon={<CheckIcon className="w-12 h-12" />}
          title="All caught up!"
          description="No pending tasks right now."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Tasks" count={tasks.length} />
      <Card className="divide-y divide-bark-100 dark:divide-bark-700">
        {tasks.map((task, i) => (
          <Link
            key={`${task.plantId}-${task.action}-${i}`}
            to={`/plants/${task.plantId}`}
            className={`flex items-center gap-4 px-5 py-4 no-underline text-inherit hover:bg-bark-50 dark:hover:bg-bark-700 transition-colors border-l-4 ${URGENCY_BORDER[task.urgency] || URGENCY_BORDER.low}`}
          >
            <Badge variant={task.urgency} className="uppercase">
              {task.urgency}
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-bark-900 dark:text-bark-50">{task.plantName}</p>
              <p className="text-sm text-bark-500 dark:text-bark-400 mt-0.5">
                {ACTION_LABELS[task.action] || task.action}
                {task.daysSinceLast !== null && ` \u00b7 ${task.daysSinceLast}d ago`}
                {task.daysSinceLast === null && ' \u00b7 never'}
              </p>
            </div>
            <svg className="w-4 h-4 text-bark-300 dark:text-bark-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </Card>
    </div>
  );
}
