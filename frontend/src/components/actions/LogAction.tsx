import { useState } from 'react';

interface Props {
  plantId: string;
  onAction: (type: string, notes?: string) => Promise<unknown>;
}

const ACTIONS = [
  { type: 'watered', label: 'Watered', color: '#3b82f6' },
  { type: 'fertilized', label: 'Fertilized', color: '#22c55e' },
  { type: 'repotted', label: 'Repotted', color: '#a855f7' },
  { type: 'pruned', label: 'Pruned', color: '#f97316' },
];

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
    <div style={{ marginTop: 16, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {ACTIONS.map((action) => (
          <button
            key={action.type}
            onClick={() => handleQuickAction(action.type)}
            disabled={busy !== null}
            style={{
              background: action.color, color: '#fff', border: 'none',
              padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
              opacity: busy && busy !== action.type ? 0.5 : 1,
              fontSize: 14,
            }}
          >
            {busy === action.type ? 'Logging...' : action.label}
          </button>
        ))}
        <button
          onClick={() => setShowNotes(!showNotes)}
          style={{
            background: '#6b7280', color: '#fff', border: 'none',
            padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 14,
          }}
        >
          + Note
        </button>
      </div>

      {showNotes && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value)}
            style={{ padding: 8 }}
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
            style={{ flex: 1, padding: 8 }}
          />
          <button onClick={handleNote} disabled={busy !== null} style={{ padding: '8px 16px' }}>
            Save
          </button>
        </div>
      )}
    </div>
  );
}
