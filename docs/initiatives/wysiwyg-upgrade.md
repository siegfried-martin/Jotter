# Initiative: WYSIWYG Upgrade — Quill → TipTap

**Status**: Built on `feat/wysiwyg-tiptap` (2026-07-20) — all five slices done, Quill
removed, 50 unit + 83 e2e green. Awaiting owner hands-on testing before merge.
**Feature**: Replace the Quill rich-text editor with **TipTap** (ProseMirror) to deliver
the "Word / Google Docs" feature set the owner asked for — starting with **text color and
highlighting** — while keeping the entire Yjs offline/collab stack intact.
**Predecessors**: `docs/features/requested-features.md` §3c (the ask);
`docs/functionality/editors/rich-text.md` (parity baseline);
`docs/initiatives/offline-sync.md` (the CRDT architecture this must slot into).

## Why TipTap (decision locked with owner, 2026-07-20)

- The wysiwyg type lives on the **CRDT track**: Yjs doc + `y-indexeddb` durability +
  `SupabaseYjsProvider` realtime + ydoc base64 in Postgres + HTML materialized to
  `content` on save. The replacement editor must have a first-class Yjs binding.
- **`y-prosemirror` is the reference Yjs binding** — the most battle-tested editor
  binding in the Yjs ecosystem. TipTap wraps it in official `Collaboration` /
  `CollaborationCaret` extensions.
- **`Color` and `Highlight` are first-party TipTap extensions** — the two features that
  motivated this upgrade are configuration, not custom work.
- Lexical's Yjs support exists but is younger; Quill has no path to the richer feature
  set. TipTap is React-first, which was itself one of the motivations for the React move.

## Feature set

**Parity — pragmatic, not contractual** (owner, 2026-07-20: don't get hung up on
old-editor compatibility or rarely-used features; keep what TipTap supports easily):
bold / italic / underline / strikethrough, H1–H3, ordered + unordered lists (with
Tab/Shift+Tab nesting), links (Ctrl+K), alignment, smart paste, undo/redo
(via Yjs — `Collaboration` supplies its own undo manager; TipTap's own history must be
disabled), Ctrl+B/I/U shortcuts, auto-materialization of HTML to `content` on save.
Blockquote ships only because it's free in TipTap's StarterKit — it is explicitly NOT a
requirement; the same rule applies to any other legacy feature that turns out to cost
real effort.

**New in v1:**
- **Text color** (`@tiptap/extension-color` on `TextStyle`) with a small preset palette.
- **Highlight** (`@tiptap/extension-highlight`, `multicolor: true`) with preset colors.
- **Remote cursors**: `CollaborationCaret` bound to the existing `Awareness` (the
  current `QuillBinding` is constructed *without* awareness, so wysiwyg collab today has
  no cursors — this comes almost free and visibly improves the collab story).

**Cheap follow-ups enabled but NOT in v1**: tables, task lists, images (pairs with the
Image-section backlog item), font family/size.

## Architecture: what changes, what doesn't

Unchanged: the CRDT registry (`crdtSection.ts`) refcounting/StrictMode discipline, the
`y-indexeddb` room naming, `SupabaseYjsProvider`, ydoc base64 flush, the LWW/CRDT split
(`sectionTrack.ts`), and the save path (editor reports live HTML via `onChange`; the
modal materializes `content` — TipTap's `editor.getHTML()` replaces `quill.root.innerHTML`).

Changed:

1. **Shared type: `Y.Text` → `Y.XmlFragment`.** `CrdtHandle` exposes `doc.getText('content')`
   for all CRDT types; ProseMirror binds a `Y.XmlFragment`. The registry gains a
   per-track shape: code/markdown keep `Y.Text('content')`; wysiwyg binds
   `doc.getXmlFragment('richtext')`. The old `content` Y.Text may sit dormant inside
   migrated docs — harmless.
2. **`YQuillEditor` → `YTipTapEditor`.** Same props contract (`initial`, `onChange`,
   handle), same one-time-seed guard. Quill, `y-quill`, `quill-editor.css` and the Quill
   config are removed once the editor lands.

## Ydoc migration (the hard part)

Stored wysiwyg ydocs hold **Quill deltas in a `Y.Text`** — not convertible to
ProseMirror's `Y.XmlFragment`. The migration reuses the existing legacy-HTML seeding
pattern (`YQuillEditor.tsx` seeds empty docs from `content` today):

- On open, if the doc's `richtext` XmlFragment is **empty**, seed it from the section's
  materialized HTML `content` (TipTap parses HTML natively), guarded per-doc against
  StrictMode double-mounts exactly as today.
- After the first TipTap client flushes, the Postgres ydoc snapshot contains the
  XmlFragment — later clients (and stale `y-indexeddb` copies) rehydrate from the
  canonical snapshot instead of re-seeding, same idempotency argument as the current
  seed path.
- **This is a deliberate history wipe** (owner-approved 2026-07-20): re-seeding from
  HTML discards the old doc's Yjs edit history and undo stack — only the current
  materialized content survives. Accepted; no delta conversion will be built.
- **Fidelity caveat**: Quill emits `ql-*` class markup (e.g. `ql-align-center`,
  `ql-indent-*`) that ProseMirror won't recognize on parse, so alignment/indent from
  old notes may be dropped. Add a `ql-align-*` → `TextAlign` parse rule **only if it's
  a trivial line or two**; otherwise the loss is accepted (owner, 2026-07-20:
  backwards compatibility with the old editor is not worth real effort).
- `content` stays HTML throughout, so **search's tag-strip (migration 0013), card
  previews, and copy-as-markdown keep working unmodified** — but card preview CSS must
  be re-checked against TipTap's markup (inline styles vs Quill's classes).

## Implementation sketch (e2e-green slices)

1. **TipTap editor, plain** — `YTipTapEditor` behind the existing lazy-load, bound to
   XmlFragment, HTML seed + materialization; parity toolbar. Quill still present.
2. **Parity hardening** — keyboard shortcuts, lists/links behavior, paste; port
   `crdt-wysiwyg.spec.ts`, `wysiwyg-bullets.spec.ts`, `collab.spec.ts`, `offline.spec.ts`
   coverage; `ql-align` parse rule if trivial.
3. **Color + highlight** — toolbar UI (preset swatches), e2e for persistence round-trip.
4. **CollaborationCaret** — wire awareness; collab e2e for cursor presence.
5. **Remove Quill** — drop `quill`, `y-quill`, config + CSS; bundle-size check
   (TipTap is code-split like the other heavy editors).

## Scope / non-goals (v1)

- No `search_text` materialized column — the ride-along idea from the search initiative
  stays deferred: it touches every write path (incl. offline outbox replay) and search
  v1 already handles wysiwyg via tag-strip. Revisit as its own slice when search needs
  richer types.
- No tables / task lists / images / font controls (follow-ups above).
- No change to markdown/code editors (they keep `Y.Text` + CodeMirror).
- No Quill-delta → XmlFragment structural conversion — HTML re-seed is the migration.

## Testing

- Unit: HTML seed idempotency (StrictMode double-mount), `ql-align-*` parse mapping
  (only if shipped), materialized-HTML round-trip (seed → getHTML → seed is stable).
- e2e: parity suite (formatting, lists, links, shortcuts, paste); color/highlight
  persist across reopen; legacy Quill-HTML section opens in TipTap with its text
  content intact; offline edit → reconnect sync; two-client collab converges and shows
  remote carets; search still matches wysiwyg text post-migration.
