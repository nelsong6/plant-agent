import { useState, useRef, type FormEvent } from 'react';
import { createPlant } from '../../api/plants';
import { Button } from '../ui/Button';
import { ErrorBanner } from '../ui/ErrorBanner';

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

const inputClass =
  'w-full rounded-lg border border-bark-200 dark:border-bark-600 bg-white dark:bg-bark-700 text-bark-800 dark:text-bark-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500';

export function AddPlantForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(file: File | undefined) {
    if (!file) return;
    setPhotoFile(file);
    setPhotoUrl('');
    setPhotoPreview(URL.createObjectURL(file));
  }

  function handleUrlBlur() {
    const trimmed = photoUrl.trim();
    if (!trimmed) return;
    setPhotoFile(null);
    setPhotoPreview(trimmed);
    if (fileRef.current) fileRef.current.value = '';
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoUrl('');
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setBusy(true);
    setError('');
    try {
      const id = crypto.randomUUID();
      const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const photo = photoFile || photoUrl.trim() || undefined;
      await createPlant({ id, name: name.trim(), slug, notes: notes.trim() }, photo);

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

      <div className="mb-3">
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

      <div className="mb-3">
        <label className="block text-xs font-medium text-bark-500 dark:text-bark-400 mb-1">
          Photo
        </label>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e.target.files?.[0])}
            className="text-sm text-bark-500 dark:text-bark-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-leaf-50 file:text-leaf-700 file:cursor-pointer dark:file:bg-leaf-900/30 dark:file:text-leaf-300 hover:file:bg-leaf-100 dark:hover:file:bg-leaf-900/50"
          />
        </div>
        <div className="mt-2">
          <input
            type="text"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="Or paste an image URL..."
            className={inputClass}
          />
        </div>
        {photoPreview && (
          <div className="mt-2 relative inline-block">
            <img
              src={photoPreview}
              alt="Preview"
              className="h-24 rounded-lg object-cover border border-bark-200 dark:border-bark-600"
            />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bark-700 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors"
            >
              ×
            </button>
          </div>
        )}
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
