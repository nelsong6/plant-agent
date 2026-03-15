import { useState } from 'react';
import { Button } from '../ui/Button';

interface Props {
  plantId: string;
  onAction: (type: string, notes?: string) => Promise<unknown>;
}

const ACTIONS = [
  { type: 'watered', label: 'Watered', variant: 'water' as const },
  { type: 'fertilized', label: 'Fertilized', variant: 'fertilize' as const },
  { type: 'repotted', label: 'Repotted', variant: 'repot' as const },
  { type: 'pruned', label: 'Pruned', variant: 'prune' as const },
];

const ACTION_COLORS: Record<string, string> = {
  watered: 'bg-water text-white hover:bg-water/90',
  fertilized: 'bg-fertilize text-white hover:bg-fertilize/90',
  repotted: 'bg-repot text-white hover:bg-repot/90',
  pruned: 'bg-prune text-white hover:bg-prune/90',
};

export function LogAction({ onAction }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [noteType, setNoteType] = useState('');
  const [noteText, setNoteText] = useState('');

  async function handleQuickAction(type: string) {
    setBusy(type);
    try {
      await onAction(type);
    } catch (e) {
      console.error('Failed to log action:', e);
    } finally {
      setBusy(null);
    }
  }

  async function handleNote() {
    if (!noteText.trim()) return;
    setBusy('note');
    try {
      await onAction(noteType || 'note', noteText.trim());
      setNoteText('');
      setShowNotes(false);
    } catch (e) {
      console.error('Failed to log note:', e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-leaf-50/50 dark:bg-leaf-900/20 rounded-xl border border-leaf-100 dark:border-leaf-800 p-4">
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.type}
            onClick={() => handleQuickAction(action.type)}
            disabled={busy !== null}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${ACTION_COLORS[action.type]}`}
          >
            {busy === action.type ? 'Logging...' : action.label}
          </button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNotes(!showNotes)}
        >
          + Note
        </Button>
      </div>

      {showNotes && (
        <div className="flex gap-2 mt-3">
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value)}
            className="rounded-lg border border-bark-200 dark:border-bark-600 px-3 py-2 text-sm bg-white dark:bg-bark-700 text-bark-800 dark:text-bark-100 focus:outline-none focus:ring-2 focus:ring-leaf-500"
          >
            <option value="note">Note</option>
            {ACTIONS.map((a) => <option key={a.type} value={a.type}>{a.label}</option>)}
          </select>
          <input
            type="text"
            placeholder="Add a note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNote()}
            className="flex-1 rounded-lg border border-bark-200 dark:border-bark-600 bg-white dark:bg-bark-700 text-bark-800 dark:text-bark-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
          />
          <Button size="sm" onClick={handleNote} disabled={busy !== null}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
