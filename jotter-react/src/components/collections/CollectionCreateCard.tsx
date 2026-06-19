import { useState } from 'react';
import { DEFAULT_COLLECTION_COLORS, LIMITS } from '@/lib/constants';
import type { CollectionSaveInput } from './CollectionCard';

export function CollectionCreateCard({
  count,
  onCreate
}: {
  count: number;
  onCreate: (input: CollectionSaveInput) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>('#3B82F6');
  const [description, setDescription] = useState('');

  const atLimit = count >= LIMITS.MAX_COLLECTIONS_PER_USER;

  function reset() {
    setShowForm(false);
    setName('');
    setColor('#3B82F6');
    setDescription('');
  }
  function submit() {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), color, description: description.trim() || undefined });
    reset();
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      reset();
    }
  }

  if (showForm) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5">
        <div className="mb-3 flex items-center gap-3">
          <span
            className="h-4 w-4 flex-shrink-0 rounded-full border border-slate-300"
            style={{ backgroundColor: color }}
          />
          <h3 className="font-semibold text-slate-900">New Collection</h3>
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
        <input
          autoFocus
          value={name}
          maxLength={LIMITS.COLLECTION_NAME_MAX_LENGTH}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Collection name"
          className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />

        <label className="mt-3 mb-1 block text-sm font-medium text-slate-700">Color</label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_COLLECTION_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              title={c}
              className={`h-6 w-6 rounded-full border-2 transition hover:scale-110 ${
                color === c ? 'border-slate-800' : 'border-slate-300'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <label className="mt-3 mb-1 block text-sm font-medium text-slate-700">
          Description (optional)
        </label>
        <textarea
          value={description}
          maxLength={LIMITS.COLLECTION_DESCRIPTION_MAX_LENGTH}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          placeholder="What will you store in this collection?"
          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="mt-3 flex gap-2">
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Collection
          </button>
          <button
            onClick={reset}
            className="rounded-md bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (atLimit) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-400">
        <div>
          <p className="font-medium text-slate-500">Collection limit reached</p>
          <p className="mt-1 text-xs">
            Maximum of {LIMITS.MAX_COLLECTIONS_PER_USER} collections. Delete one to create a new
            collection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      className="group flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-slate-400 hover:bg-slate-100"
    >
      <span className="mb-2 text-2xl text-slate-400 group-hover:text-slate-600">+</span>
      <span className="font-medium text-slate-600 group-hover:text-slate-800">
        Create New Collection
      </span>
      <span className="mt-1 text-xs text-slate-500">
        Organize your notes into focused collections
      </span>
    </button>
  );
}
