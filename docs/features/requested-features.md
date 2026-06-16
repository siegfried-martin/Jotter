# Requested Features

**Status**: Captured / Not Started
**Source**: Direct from product owner (planning session, 2026-06-16)
**Context**: Replaces the old monetization-oriented roadmap. The product strategy is no
longer "sell this as a product." The new strategy is **adoption through open sharing** —
"here's a link to the notes I just took from our discussion" instead of "try my app."
The owner uses Jotter daily as a critical work tool, and expects teammates to adopt it
organically once sharing is frictionless.

> This document preserves the feature thinking exactly as described. Implementation
> details and framework notes are annotations added during planning, clearly marked.
> These features will be built **after** the React migration (see
> `docs/initiatives/react-migration.md`), with the exception of foundation/data-model
> work that is framework-neutral and may be designed earlier.

---

## Guiding Principle

Everything is open and convenience-first. Sharing is the headline feature because it is
also the best adoption mechanism the owner has found. The classic "try my app" pitch has
failed; sharing real, useful notes from real conversations is expected to convert far
better and generate feature feedback from teammates.

---

## 1. Calendar Section (new section type)

**What it is**: A *scrapbook* planning calendar — **not** an integrated/synced calendar.
It is for general, temporary planning that you can mark up and throw away. Explicitly
**not** tied to Outlook or Google Calendar (the whole point is to *avoid* showing your
real calendar on a screenshare).

**Why**: In planning meetings at the owner's level, people constantly screenshare a
calendar to walk through timelines: "here's where the sprint finishes, here's when we
deploy to prod, if you want extra changes we can delay — here's what the new timeline
looks like." Since the Windows 11 upgrade removed the always-available taskbar calendar,
this gap became painfully obvious. A throwaway markup calendar fills it.

**Requirements**:
- Defaults to **month view**; also has a **week view**.
- **Month view** use case: rollout / release planning across weeks.
- **Week view** use case: sprint cadence and ceremonies.
- Temporary, low-stakes planning — easy to create, edit, and discard.

**Planning notes (annotation)**:
- Candidate library: **Schedule-X** (framework-agnostic, built-in month + week views).
  Re-evaluate React-native options (e.g. react-big-calendar, FullCalendar React) during
  implementation since the app will be React by then.
- Placing/moving events on the grid is a drag interaction → benefits from `@dnd-kit`.
- Content model: store events in the section's `content`/`meta` (JSON). No new tables
  required for a throwaway calendar.

---

## 2. Unparented Note Sections ("quick jot")

**What it is**: The ability to create a note section directly from the home page without
first choosing a collection and container. The owner still reaches for Notepad++ purely
because Jotter currently forces you to think about and open a collection + container just
to jot something down. This removes that friction. **Described as "huge."**

**Requirements**:
- From the **home page**, open a new note section of **any type** immediately.
- A **list of recent note sections** on the home page.
- The **only required foreign key on a note section is `user_id`.** Collection and
  container become optional — this enables a future "query all my notes / find old
  unparented notes" page.
- **Inside a note section, always display:**
  - the **note's title** (this is a current obvious miss),
  - the **current collection and container**, which can be **assigned if empty or
    reassigned** from within the section.

**Planning notes (annotation)**:
- Data-model change: make `note_section.note_container_id` (and the collection linkage)
  **nullable**. This is **framework-neutral** and is the substrate for several other
  features — good candidate to design early.
- This reshapes the core hierarchy from strict `collection → container → section` into
  "sections belong to a user, optionally filed into a container/collection."
- Pairs naturally with Sharing (#5), which also makes section ownership many-to-many.

---

## 3. Markdown Support + Richer Text Editing

Three related pieces:

**3a. Markdown section (new section type)**
- A real Markdown section. There is almost certainly a good Markdown viewer JS library
  to use.

**3b. Copy as Markdown**
- Ability to **copy most section types to clipboard as Markdown.**

**3c. More powerful WYSIWYG editor**
- The current editor (Quill) has a "web-based" feature set. The owner wants something
  closer to **Word / Google Docs**, which is what most people are used to —
  specifically **richer rich-text like text color and highlighting.**

**Planning notes (annotation)**:
- Markdown render: markdown-it / marked (framework-agnostic). Copy-as-markdown: turndown
  (HTML → Markdown).
- WYSIWYG upgrade: **TipTap** (ProseMirror-based; color/highlight/table extensions are
  first-class) or **Lexical**. In React these are first-class; this is one of the
  features that motivated the React move.
- Copy-as-markdown and a markdown section were also listed in the now-retired
  `free-enhancements.md`; consolidated here as the canonical source.

---

## 4. Table Section (new section type)

**What it is**: A table/grid section. Useful in any form. The owner expects that
eventually they or another user will want **Excel-like features** (e.g. autocomplete /
fill-down completion) and will be annoyed when those are missing — so pick a library
with headroom.

### 4a. Table templates (user-saved, not pre-configured)

The owner has a few table layouts they use constantly and wants to start from those
instead of a blank table. The **preferred approach is user-saved templates**: let a user
**save any table they've built as a reusable template**, then start a new table from it.
This is smarter than shipping fixed/configurable templates — the user grows their own
library.

- **Not** a configurable template system. A template is just a **static saved table** the
  user starts from instead of a blank one.
- Mechanism: "Save as template" on an existing table → it appears as a starting option
  when creating a new table section.

**Templates the owner uses today (examples / validation cases):**
- **Gantt chart** — the feature/task shows **only in its horizontal bar**; there is **no
  separate duplicate column of feature names down the left**. (i.e. the row label *is* the
  bar, not a label column + bar.)
- **Months split into 2 or 4 columns** — for drawing up roadmaps and/or budgets.
- More to come — the owner will dream up additional ones over time.

### 4b. Export & copy

- **Export to Excel (.xlsx)** and **CSV.**
- **Copy to clipboard as Markdown from the small (card/preview) view** — i.e. the
  copy-as-markdown affordance should be available directly on the section card, not only
  inside the full editor.

**Planning notes (annotation)**:
- This is the feature with the **strongest pull toward React**: spreadsheet-grade grids
  (AG Grid, Handsontable, react-data-grid) are React-first. TanStack Table (headless,
  agnostic) covers logic but not the Excel UX.
- Decide at implementation time how far toward "real spreadsheet" to go vs. a simpler
  editable grid.
- **Templates** = persist a table's structure/content as a reusable starting payload.
  Likely a small `table_templates` store keyed by `user_id` (ties into the broader
  per-user, user-owned data direction in #2/#5). The Gantt example implies the table model
  must support per-row bar/range cells, not just a uniform grid.
- **Export**: SheetJS (`xlsx`) covers both .xlsx and CSV; Markdown export reuses the same
  copy-as-markdown path as #3b, exposed on the card view.
- Storage format reference (salvaged from the retired `paid-features.md`): a simple
  JSON shape like `{ columns: string[], rows: string[][], headerRow: boolean }` is a
  reasonable starting point, but the Gantt template implies the cell model must also
  support per-row bar/range data.

---

## 5. Sharing (highest priority feature)

**What it is**: Open sharing of collections and sections, matching the app's
convenience-first, open-source ethos. **This is the most important feature** — it is both
directly useful and the primary adoption strategy.

**Requirements**:
- **All collections and sections are public by default.**
- Giving someone a **link to a note section or collection** lets them just **open it**.
- Sharing works **by collection or by section** — **not by container** (sharing a
  container would effectively just be a shared collection).
- When a user opens a **collection or section they don't own**, the system **asks if they
  want to import it.**
- This makes both **collection ↔ user** and **section ↔ user** relationships
  **many-to-many** → a **migration must be planned.**
- A user can later choose to make a collection or section **read-only or private**, but
  that is a **separate, later feature.** Open sharing comes first.

**Related, but explicitly separate later features**:
- **Real-time updates via polling**, and **notifying a user when they open a section for
  edit that someone else already has open.**
- The owner notes this **out-of-date / concurrently-edited section** situation behaves
  **similarly to offline mode** (see #6) — i.e. divergent copies that must reconcile.

**Why**: "Try my app" has proven a terrible adoption strategy. Sharing real notes from a
discussion is far more engaging and is expected to drive both adoption and feature
feedback from teammates.

**Planning notes (annotation)**:
- Mostly **backend / data-model / Supabase RLS** work; **framework-neutral.**
- Needs join tables (e.g. `collection_user`, `section_user`, or a unified `shares` table
  with role) + public-by-default read access + an import flow.
- The owner's observation that concurrent-edit == offline reconciliation is the key
  architectural insight linking #5 and #6 — both are "divergent replicas," i.e. CRDT
  territory (see #6).
- Schema reference (salvaged from the retired `paid-features.md`, which had framed
  sharing as paid): an earlier sketch used `collection_shares(collection_id, owner_id,
  shared_with_id, permission)`. Under the new open-by-default model this becomes the
  default rather than an upgrade, but the join-table shape is a useful starting point.

---

## 6. Seamless Offline / Online Mode (big technical takeaway)

**What it is**: Real, seamless offline support. Today there is an offline (demo) mode,
but it is effectively a **separate data set** that the user imports, and the transition is
**not seamless.**

**The problem (real data loss happened here)**: If you're editing a note section and
close your laptop, then reopen it **without internet**, the system tries to save and may
crash — the owner **lost valuable data this way** and has since been editing notes
cautiously. **You should not have to be careful using the app.**

**Requirements**:
- Losing connection should **just kick to offline mode**, then **re-sync when a
  connection is found.**
- **Browser storage and remote storage should work like a caching system, not two
  separate stores** (this is the big technical takeaway).
- Longer term, this also helps sharing: an **out-of-date section being edited can behave
  like offline mode** and reconcile on reconnect.

**Planning notes (annotation)**:
- This is the **highest-risk, highest-value** item and caused **real data loss** — treat
  it as its **own carefully scoped project**, not bundled into the migration.
- The existing `AppDataManager` "cache-as-database" pattern is conceptually aligned with
  local-first; this feature productionizes it.
- Candidate approaches: a sync engine (**PowerSync** or **ElectricSQL**, both
  Supabase/Postgres-friendly) and/or **CRDTs (Yjs)**. Yjs is especially attractive
  because it **unifies offline editing, real-time shared editing (#5), and conflict
  handling** — all the "divergent replica" cases — under one model.
- `types.ts` already contains `SyncEvent`, `PollingConfig`, and a `conflictResolution`
  union — early sketches of this system.

---

## 7. Image Section (clipboard paste)

**What it is**: A new section type that displays images, with the ability to **paste
directly from the clipboard** (e.g. Windows+Shift+S screenshots). _(Salvaged from the
retired `free-enhancements.md`; not raised in the 2026-06-16 session but kept as a valid
backlog item.)_

**Requirements / notes (annotation)**:
- New section type: `image`. Store images in a Supabase Storage bucket.
- Card shows a thumbnail/preview; the editor shows full size (view-only initially).
- Client-side compression before upload; lazy-load for performance.
- Pairs well with the diagram/screenshot-heavy dev workflow.

---

## 8. Advanced Section Picker UI

**What it is**: A categorized picker for adding section types, replacing/augmenting the
current add-section buttons so it scales as more types are added (calendar, table,
markdown, image, …). _(Salvaged from the retired `free-enhancements.md`.)_

**Requirements / notes (annotation)**:
- Suggested categories: Basic (text, code, checklist), Visual (diagram, image),
  Structured (markdown, table, calendar).
- Keep existing keyboard shortcuts working (Alt+T, Alt+K, etc.).
- Low complexity; becomes more valuable as the section-type count grows.

---

## 9. Minor UI Issues (not major features)

There are a handful of small UI issues that crop up but none rise to the level of a major
feature. Capture them here as they're identified; more will surface with daily use.

- _(to be filled in as issues are noticed)_

---

## Priority Summary

| # | Feature | Owner priority | Framework signal | Notes |
|---|---------|----------------|------------------|-------|
| 5 | Sharing | **Highest** | Neutral (backend) | Adoption driver; needs M2M migration |
| 2 | Unparented sections | "Huge" | Neutral (data model) | Foundation for query + sharing |
| 6 | Seamless offline/sync | High (data loss) | Neutral | Own project; CRDT/sync engine |
| 1 | Calendar section | Medium | Mild React | Scrapbook month/week planning |
| 3 | Markdown + rich text | Medium | Mild React | TipTap/Lexical; copy-as-md |
| 4 | Table section | Medium | **Strong React** | Excel-like headroom; user-saved templates; xlsx/csv/markdown export |
| 7 | Image section | Medium | Mild | Clipboard paste; Supabase Storage (salvaged) |
| 8 | Section picker | Low | Neutral | Scales add-section UI (salvaged) |

**Suggested build order after the React migration**: unparented sections (data-model
foundation) → sharing → offline/sync → new section types (table, markdown, calendar,
richer WYSIWYG, image) → section-picker polish. Foundation/data-model parts of #2, #5, and
#6 are framework-neutral and may be designed earlier if desired.

---

**Last Updated**: 2026-06-16
</content>
</invoke>
