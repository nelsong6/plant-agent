import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Task } from '../../types';
import { apiFetch } from '../../api/client';

const URGENCY_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: '#fef2f2', text: '#dc2626' },
  medium: { bg: '#fffbeb', text: '#d97706' },
  low: { bg: '#f0fdf4', text: '#16a34a' },
};

const ACTION_LABELS: Record<string, string> = {
  watered: 'Needs watering',
  fertilized: 'Needs fertilizing',
  repotted: 'Needs repotting',
  pruned: 'Needs pruning',
};

export function TaskQueue() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Task[]>('/api/tasks')
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading tasks...</p>;

  if (tasks.length === 0) {
    return (
      <div>
        <h2>Tasks</h2>
        <p style={{ color: '#999' }}>All caught up! No pending tasks.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Tasks ({tasks.length})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map((task, i) => {
          const style = URGENCY_STYLES[task.urgency] || URGENCY_STYLES.low;
          return (
            <Link
              key={`${task.plantId}-${task.action}-${i}`}
              to={`/plants/${task.plantId}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 8,
                background: style.bg, textDecoration: 'none', color: 'inherit',
              }}
            >
              <span style={{
                color: style.text, fontWeight: 600, fontSize: 12,
                textTransform: 'uppercase', minWidth: 60,
              }}>
                {task.urgency}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 500 }}>{task.plantName}</p>
                <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
                  {ACTION_LABELS[task.action] || task.action}
                  {task.daysSinceLast !== null && ` (${task.daysSinceLast} days ago)`}
                  {task.daysSinceLast === null && ' (never)'}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
