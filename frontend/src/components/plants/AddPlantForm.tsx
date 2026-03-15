import { useState, type FormEvent } from 'react';
import { createPlant } from '../../api/plants';
import { Button } from '../ui/Button';
import { ErrorBanner } from '../ui/ErrorBanner';

interface Props {
  existingRooms: string[];
  onCreated: () => void;
  onCancel: () => void;
}

const inputClass =
  'w-full rounded-lg border border-bark-200 dark:border-bark-600 bg-white dark:bg-bark-700 text-bark-800 dark:text-bark-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500';

export function AddPlantForm({ existingRooms, onCreated, onCancel }: Props) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [room, setRoom] = useState('');
  const [position, setPosition] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setBusy(true);
    setError('');
    try {
      await createPlant({
        id: crypto.randomUUID(),
        name: name.trim(),
        slug: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        species: species.trim(),
        room: room.trim(),
        position: position.trim(),
        notes: notes.trim(),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plant');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-leaf-50/50 dark:bg-leaf-900/20 rounded-xl border border-leaf-100 dark:border-leaf-800 p-4 mb-6"
    >
      <h3 className="text-sm font-semibold text-bark-700 dark:text-bark-200 mb-3">New Plant</h3>

      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-bark-500 dark:text-bark-400 mb-1">
            Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Monstera"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-bark-500 dark:text-bark-400 mb-1">
            Species
          </label>
          <input
            type="text"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            placeholder="e.g. Monstera deliciosa"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-bark-500 dark:text-bark-400 mb-1">
            Room
          </label>
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="e.g. Living Room"
            list="room-options"
            className={inputClass}
          />
          <datalist id="room-options">
            {existingRooms.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-xs font-medium text-bark-500 dark:text-bark-400 mb-1">
            Position
          </label>
          <input
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="e.g. Window sill"
            className={inputClass}
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs font-medium text-bark-500 dark:text-bark-400 mb-1">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Any extra details..."
          className={inputClass + ' resize-none'}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={busy}>
          Create Plant
        </Button>
      </div>
    </form>
  );
}
