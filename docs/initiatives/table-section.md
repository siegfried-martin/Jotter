# Initiative: Table (Spreadsheet) Section

**Status**: Design — awaiting sign-off (2026-06-19).
**Feature**: `docs/features/requested-features.md` #4 (Table) — top of the post-offline roadmap, alongside Calendar (#1). The spec explicitly warns to "pick a library with **headroom**" for Excel-like features (autocomplete / fill-down) the owner will eventually want — Univer satisfies this. Sub-items #4a (user-saved table **templates**) and the XLSX half of #4b are explicit **deferrals**, not v1.
**Predecessors**: Markdown section (#3a) and Copy / Copy as Markdown (#3b) shipped; the offline two-track model is live.

## Goal

A real **spreadsheet** section — as close to Excel / Google Sheets as open source gets:
multiple cells, formulas (`=SUM(A1:A4)`), formatting, merged cells, row/column ops. Not a
data grid (grid-of-records); a free-form sheet. Functionality is the priority.

## Library decision: Univer

Picked **[Univer](https://github.com/dream-num/univer)** (`@univerjs/*`).

| Why | Detail |
|-----|--------|
| **License** | Apache-2.0 — modify freely, ship commercially, no obligation to open-source Jotter. Patent grant included. Avoids Handsontable's paid-commercial trap. |
| **Power** | Canvas-rendered engine, real formula engine, pivot/charts/freeze/merge. The most capable OSS spreadsheet, and where the momentum is (active successor to Luckysheet). |
| **React** | View layer is React 18; mounts into a container `div` via its plugin system. |
| **Extensible** | Plugin + Facade API for adding commands/cell types without forking; `patch-package` for small fixes; hard-fork legal under Apache-2.0 if ever needed. |

**Not used**: Univer's Pro / enterprise packages (advanced collab, server import/export) are
*separately licensed* and **not** Apache-2.0. We stay entirely inside the free core. We also
do **not** use Univer's built-in OT collaboration — see track decision below.

Fortune-sheet (MIT, lighter) is the fallback only if Univer's bundle weight proves
unworkable in practice.

## Architecture: Table = the Diagram pattern, on the LWW track

A spreadsheet is the **same shape as the existing `diagram` (Excalidraw) section**: an
opaque JSON document the editor owns, snapshotted into `note_section.content`, synced
**last-write-wins** via the outbox. So Table reuses the diagram code path almost verbatim
and deliberately **does not** touch Yjs.

| | Diagram (existing) | Table (new) |
|-|--------------------|-------------|
| Editor owns | Excalidraw scene JSON | Univer workbook snapshot JSON |
| Stored in | `content` (text blob) | `content` (text blob) |
| Track | **LWW** (outbox, compare-and-swap) | **LWW** (outbox, compare-and-swap) |
| Yjs | No | **No** |
| Card preview | static thumbnail (`DiagramThumbnail`) | static grid render (`TablePreview`) |

**Why LWW, not CRDT** — consistent with the offline-sync rationale: Univer's document model
is internal and large; diffing snapshots into a Y.Doc is high-effort, low-value. Tables in a
personal dev-notes tool rarely see concurrent edits. Univer's own OT collab is a Pro
feature we're skipping. LWW (optimistic concurrency: `update ... where updated_at = <fetched>`,
zero rows ⇒ "edited elsewhere — Save as copy / Overwrite / Discard") is exactly right, and
already built. **Yjs support being absent is therefore a non-issue, by design.**

## Data model & migration

No schema change beyond the type enum — `content` already holds arbitrary text.

`supabase/migrations/0010_table_section_type.sql` (mirrors the markdown migration 0009):

```sql
alter table public.note_section drop constraint if exists note_section_type_check;
alter table public.note_section add constraint note_section_type_check
  check (type = any (array['checklist'::text, 'code'::text, 'wysiwyg'::text,
                           'diagram'::text, 'markdown'::text, 'table'::text]));
```

Apply to **dev** first (`/usr/lib/postgresql/17/bin/psql`, dev `.pgpass`); **prod applied
manually at deploy** (prod password never pasted to chat). Note: prod still owes migration
0009 (markdown) — both 0009 and 0010 must be applied before/with the next prod deploy.

## Plumbing checklist (register the `'table'` type)

Mirror every place `'markdown'` / `'diagram'` is registered:

- `src/lib/types.ts` — add `'table'` to the `type` union in `NoteSection`,
  `CreateNoteSection`, `UpdateNoteSection`.
- `src/lib/offline/sectionTrack.ts` — **leave `table` OUT of `CRDT_TYPES`** so it defaults
  to the LWW track (same as diagram/checklist).
- `src/lib/util/sectionTypeStyle.ts` — `SECTION_TYPE_META.table`: `typeLabel: 'Table'`,
  `addLabel: 'Table'`, `icon` (a grid/table SVG path), `base`/`hover` color classes; then
  append `'table'` to `SECTION_TYPE_ORDER`.
- Section-creation UI — **no manual change needed**: `SectionGrid.tsx` iterates
  `SECTION_TYPE_ORDER` × `SECTION_TYPE_META`, so the "Table" add button appears
  automatically once the two entries above exist. (`defaultSection()` returns the initial
  `{ type: 'table', content: '', meta: {} }`, mirroring diagram.)
- `src/routes/sectionEditor.tsx` — add `table` to `TYPE_TITLE`; it is **not** `isCrdt` and
  **not** `isPlainText`; add a `YTableEditor` (name TBD) render branch; `buildUpdates`
  serializes the live workbook snapshot to `content` (the diagram branch is the template).
- `src/components/sections/SectionCard.tsx` — add a `table` case to `SectionPreview`
  (`TablePreview`).
- `src/lib/util/sectionClipboard.ts` — add `table` to the copy matrix (below).
- `tests/e2e/helpers.ts` — add `'table'` to the seed `SectionType` union.

## Editor component

`src/components/editors/TableEditor.tsx` (mirrors `ExcalidrawEditor.tsx`):

- Props: `{ initial: string; onChange: (content: string) => void }` — exact same shape as
  the diagram editor. Parse the workbook snapshot from `initial` once on mount (graceful
  fallback to an empty default sheet when blank/invalid), fire `onChange(json)` on edits.
- **Code-split**: Univer is heavy — lazy-load it (`React.lazy` / dynamic `import()`) so it
  only loads when a Table section opens, keeping it out of the main bundle.
- Mounts Univer into a container `div`, registers only the core OSS plugins we need
  (sheets core + formula + UI), no Pro packages.
- On save, serialize the Univer workbook to JSON → `content`. LWW outbox handles the rest.
- Desktop-first: spreadsheets need width. Acceptable to show a simplified/read-only view on
  narrow mobile (decide during build; diagram already degrades on mobile).

## Card preview

`TablePreview` renders a small static, non-interactive grid (first N rows/cols) from the
workbook snapshot — analogous to `DiagramThumbnail`. Empty workbook ⇒ "New table"
placeholder (use a `getTableCellCount(content)` util, mirroring `getDiagramElementCount` in
`src/lib/util/diagram.ts`). Crucially, **no Univer instance on the card** — unlike
`DiagramThumbnail` (which dynamically imports Excalidraw to rasterize a PNG), the table
preview parses the snapshot's cell matrix and renders a plain HTML `<table>`. Keeps the
container page light and Univer fully behind the editor's code-split boundary.

## Copy / export

Fits the existing per-type clipboard matrix (`sectionClipboard.ts`):

| Action | Behavior |
|--------|----------|
| **Copy** (native) | TSV of cell values → `text/plain` (pastes straight into Excel/Sheets), plus an HTML `<table>` in `text/html` for rich targets. |
| **Copy as Markdown** | GFM pipe table (`\| A \| B \|`). Add `table` to `hasMarkdownCopy`. |

**Export (v1)**: **CSV** of the raw cell data via a "Download CSV" affordance — cheap and
covers the immediate need. **XLSX later**: Univer can produce a real `.xlsx` from the
workbook snapshot; defer to a follow-up unless trivial. Note both in the section menu /
editor footer.

## Testing

- `tests/e2e/table.spec.ts` — create a Table section → editor opens → enter values →
  Save → card shows a preview → reopen shows persisted data. Clipboard: Copy (TSV) and
  Copy as Markdown (GFM) like the markdown/checklist clipboard tests.
- `src/lib/util/sectionClipboard.test.ts` — unit-test `sectionToMarkdown` for a table
  (GFM pipe output) and the native TSV path.
- `src/lib/offline/sectionTrack.test.ts` — assert `table` classifies to the **LWW** track.
- Run `test:e2e:smoke` during build; full `test:e2e` for the behavior slices. Kill any
  stale 5174 dev server first.

## Build order (slices, each committed + e2e-green)

1. **Plumbing + migration** — type registered everywhere, migration 0010 on dev, creation
   button, a stub editor + preview, LWW classification test. Green skeleton, no Univer yet.
2. **Univer editor** — code-split TableEditor, load/save workbook snapshot, mount + core
   plugins. Create → edit → save → reopen round-trips.
3. **Card preview** — `TablePreview` static grid + empty state.
4. **Copy / CSV export** — TSV native copy, GFM Copy as Markdown, Download CSV.

XLSX export and any mobile-specific table UX are explicit follow-ups, not v1.

## Open questions for sign-off

1. **Bundle weight** — Univer is large even code-split. Accept for a desktop-first dev tool? (Recommend yes; revisit Fortune-sheet only if it bites.)
2. **Mobile** — read-only/simplified on narrow screens for v1, full editor desktop-only? (Recommend yes, mirroring diagram's degradation.)
3. **Export scope for v1** — CSV only now, XLSX deferred? (Recommend yes.)
