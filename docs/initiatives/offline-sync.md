# Initiative: Seamless Offline / Online Mode

**Status**: In progress (started 2026-06-19, branch `feat/offline-sync`)
**Feature**: `docs/features/requested-features.md` #6 — the highest-risk / highest-value item.
**Predecessor**: Sharing (#5) shipped — shared-ownership model, last-write-wins, no app server.

## Why

Real data was lost: editing a section, closing the laptop, reopening **offline** — the
app tried to save, the network call failed, and changes were gone. The requirement is
that losing a connection just drops you into offline mode and re-syncs on reconnect, with
**browser storage and remote storage behaving as one caching system, not two stores.**

The React rewrite already softened the acute bug: an offline save now fails *gracefully*
(the editor stays open, `saving` resets) and content is continuously mirrored to a
`localStorage` draft that restores on reopen. So we are hardening a partially-safe system
into a properly local-first one — not racing a live wound. That lets us build it clean.

## The two-track model (the core architectural decision)

Match the cost of each mechanism to where it pays off. A section's editor type decides
its track:

| Track | Types | Offline durability | Concurrency model |
|-------|-------|--------------------|-------------------|
| **CRDT** | `code`, `wysiwyg` | Yjs + `y-indexeddb` | Automatic merge; real-time collab later |
| **LWW**  | `checklist`, `diagram` | mutation **outbox** (IndexedDB) | last-write-wins + compare-and-swap conflict detect |

Rationale:
- Free-flowing text (code/wysiwyg) is where concurrent editing is genuinely useful
  (remote interviews, ideation) **and** where clean Yjs bindings already exist
  (`y-codemirror.next`, `y-quill`).
- Checklist/diagram rarely see concurrent edits, and are the two **hardest** to put on
  Yjs (Excalidraw has no official binding; the checklist is a custom component). Value
  split and effort split point the same way.
- The conflict types are tidy: CRDT types merge (no conflict ever); LWW types use
  optimistic concurrency — `update ... where updated_at = <fetched>`; zero rows updated
  ⇒ "edited elsewhere — Save as copy / Overwrite / Discard."

Future text-like editors (Markdown for sure; Table/Calendar per library support) plug
into the CRDT seam. The seam supports either track; nothing is pre-committed.

## Data model

Additive and lazy — the existing `content` column stays:
- `note_section.ydoc bytea` (nullable) stores the latest Yjs document snapshot for CRDT
  sections. `content` becomes a **derived mirror** — materialized from the ydoc on every
  flush — so search, the recent feed, previews, RLS, and every non-Yjs reader keep
  working untouched.
- **No backfill.** Existing sections have no ydoc; the first time one is opened in a Yjs
  editor, the ydoc is seeded from its current `content`.

## Slice plan

1. **Foundation** (this slice) — additive `ydoc` column; online/offline detection; the
   durable IndexedDB **outbox** primitive; the track classifier. Substrate only, no
   behavior change. Unit-tested; full e2e stays green.
2. **LWW offline durability** — route checklist/diagram/title/meta saves through the
   outbox; replay on reconnect; offline/pending UI. *Data loss dead for LWW types.*
3. **Yjs offline-first** — `y-codemirror.next` + `y-quill` bound to `y-indexeddb`,
   materialize → `content` on flush. *Data loss dead for code/wysiwyg, still single-user.*
4. **Conflict detect + "save as copy"** — compare-and-swap for the LWW types.
5. **Real-time provider** — custom Yjs provider over **Supabase Realtime broadcast**
   (stays inside existing infra, honors "no app server") → live collab. Only slice that
   touches infra; decided when we reach it.

## Deferred / out of scope (for now)

- Real-time presence cursors / awareness (comes with slice 5's provider).
- CRDT for checklist/diagram/table/calendar.
- ydoc compaction/snapshot tuning (small notes; revisit if docs grow).

## Migrations

Applied to **jotter-dev** only; prod runs them at the eventual cutover (same policy as
sharing). `0007_offline_sync_foundation.sql` onward.
