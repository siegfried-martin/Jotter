import { useState } from 'react';
import type { Collection } from '@/lib/types';
import { DEFAULT_COLLECTION_COLORS, LIMITS } from '@/lib/constants';

export type CollectionSaveInput = { name: string; color: string; description?: string };

const PencilIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {DEFAULT_COLLECTION_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={c}
          className={`h-6 w-6 rounded-full border-2 transition hover:scale-110 ${
            value === c ? 'border-slate-800' : 'border-slate-300'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

export function CollectionCard({
  collection,
  onSelect,
  onSave,
  onDelete
}: {
  collection: Collection;
  onSelect: () => void;
  onSave: (input: CollectionSaveInput) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(collection.name);
  const [color, setColor] = useState(collection.color);
  const [description, setDescription] = useState(collection.description ?? '');

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setName(collection.name);
    setColor(collection.color);
    setDescription(collection.description ?? '');
    setEditing(true);
  }
  function save() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, description: description.trim() || undefined });
    setEditing(false);
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div
        data-testid="collection-card"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <span
            className="mt-1 h-4 w-4 flex-shrink-0 rounded-full border border-slate-300"
            style={{ backgroundColor: color }}
          />
          <div className="flex-1 space-y-3">
            <input
              autoFocus
              value={name}
              maxLength={LIMITS.COLLECTION_NAME_MAX_LENGTH}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Collection name"
              className="w-full border-b border-blue-500 bg-transparent pb-1 font-semibold text-slate-900 focus:outline-none"
            />
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>

        <label className="mt-4 mb-1 block text-sm font-medium text-slate-700">Description</label>
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
            onClick={save}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save Changes
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-md bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="collection-card"
      onClick={onSelect}
      className="group relative flex min-h-[180px] cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={startEdit}
          title="Edit collection"
          aria-label="Edit collection"
          className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
        >
          <PencilIcon />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete collection"
          aria-label="Delete collection"
          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
        >
          <TrashIcon />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span
          className="h-4 w-4 flex-shrink-0 rounded-full"
          style={{ backgroundColor: collection.color }}
        />
        <h3 className="flex-1 truncate font-semibold text-slate-900 group-hover:text-blue-700">
          {collection.name}
        </h3>
        {collection.is_default && (
          <span className="flex-shrink-0 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
            Default
          </span>
        )}
      </div>

      <p
        className={`mt-3 line-clamp-3 flex-1 text-sm ${
          collection.description ? 'text-slate-600' : 'text-slate-400 italic'
        }`}
      >
        {collection.description || 'No description'}
      </p>

      <div className="mt-3 text-xs text-slate-400">
        Created {new Date(collection.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}
