# Initiative: Calendar & Timeline Sections

**Status**: Design — awaiting sign-off (2026-06-20).
**Feature**: `docs/features/requested-features.md` #1 (Calendar). Splits into **two** related
section types — **Calendar** (month / week date grid) and **Timeline** (resource-swimlane
roadmap, the layout the owner keeps in Excel today). Same temporal data atom, two renderers.
**Predecessors**: Table (#4, Univer/LWW) shipped; the offline two-track model + the
diagram/table "opaque-ish blob in `content`" pattern are live.
**Decision (build order)**: design both here, then implement **Timeline first**, **Calendar
second**, each as committed, e2e-green slices.

## Why two section types, not one

The owner's real workhorse (see the Excel screenshot in the originating thread) is **not a
gantt chart** and **not a calendar**: it's a **resource-swimlane timeline** —

- rows = **lanes** (teams / resources: "Pulse Dev", "ATS Dev", "Pulse Mumbai 3+1 Team"),
- grouped under **section headers** ("State Rollouts / Phase 1+2", "AI Auto Search + Exam"),
- bars = work items on a continuous time axis with the **label inside the bar**, and
  crucially **no left-hand task+dates table** (the thing every "gantt" tool forces, and the
  exact thing the owner rejects).

That is a different primary axis and data model from a Calendar (a *wrapped* 7-column date
grid keyed by date, with a first-class day/week/month notion but **no lane dimension**).
Forcing both into one "Calendar" section would mean two rendering engines under one type and
a confused UX. So: **two section types.**

They are not unrelated, though — both reduce to *items with a start/end on a time axis*, so
they **share an event atom and the entire LWW + preview + copy/export plumbing**. The pieces
that differ are the renderer library and the lane/grouping dimension.

## The key architectural difference from Table/Diagram

Table (Univer) and Diagram (Excalidraw) store a **library-opaque blob** — the library owns
the document format, we just round-trip it. **Calendar and Timeline are different: the
library only _renders_; we own the data.** `content` is **our own JSON schema**, not a
FullCalendar/vis-timeline-specific format. Three wins fall out:

- **Low lock-in** — swap renderer later with no data migration; the schema is ours.
- **Trivial export** — CSV (like table) and `.ics` later are pure functions over our array,
  no library involved.
- Same persistence as diagram/table otherwise: **LWW track, no Yjs**, optimistic
  compare-and-swap. (Confirmed by the owner: "definitely not … Yjs, just the more rudimentary
  sharing as diagrams and tables.")

## Shared data model

One temporal atom, two envelopes. Lives in `note_section.content` as JSON.

```ts
// The shared atom — a thing with a span on the time axis.
interface ScheduleItem {
  id: string;
  title: string;
  start: string;        // ISO 8601
  end: string;          // ISO 8601
  color?: string;       // optional tint (hex or a small named-palette token)
}

// Calendar envelope: events on a date grid.
interface CalendarDoc {
  events: (ScheduleItem & { allDay: boolean })[]; // allDay → multi-day month bars vs hourly week blocks
  defaultView?: 'month' | 'week';
}

// Timeline envelope: items live in lanes, lanes can nest under headers.
interface TimelineGroup {
  id: string;
  content: string;            // lane label (left gutter) or section-header label
  nestedGroups?: string[];    // present ⇒ this group is a section header over child lane ids
}
interface TimelineDoc {
  groups: TimelineGroup[];
  items: (ScheduleItem & { group: string })[]; // group → which lane the bar sits in
  window?: { start: string; end: string };     // initial visible range (zoom)
}
```

`ScheduleItem` is the only thing the two share at the type level; the renderers, grouping,
and previews diverge. That's honest reuse, not forced unification.

## Library decisions

### Timeline → vis-timeline

Picked **[vis-timeline](https://github.com/visjs/vis-timeline)** (`vis-timeline` +
`vis-data`). It maps onto the Excel screenshot almost one-to-one.

| Why | Detail |
|-----|--------|
| **License** | Apache-2.0 / MIT (dual) — modify freely, ship commercially, no copyleft. Forkable if ever needed. |
| **Exact layout** | `groups` = left-gutter lanes (label only, **no date columns**); `nestedGroups` = the section headers; **range `items`** = bars with the label rendered inside; auto-stacks overlapping items in a lane; continuous **zoomable** axis (months → days/hours). |
| **Editing** | `editable: { add, updateTime, updateGroup, remove }` gives drag-to-move, resize, drag-between-lanes, click-to-add out of the box. |
| **Integration** | Framework-agnostic, imperative (`new Timeline(container, items, groups, options)`) — same mount-in-effect + code-split pattern we already use for Excalidraw and Univer. |

**Rejected**: FullCalendar's *resource-timeline* view is visually identical but is their
**premium/paid** tier. `react-calendar-timeline` is purpose-built for this layout but the
upstream is effectively unmaintained (maintenance risk). `frappe-gantt` / `gantt-task-react`
are classic gantts built around the left task-table the owner is rejecting.

### Calendar → FullCalendar

Picked **[FullCalendar](https://fullcalendar.io/)** (`@fullcalendar/react`,
`@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`).

| Why | Detail |
|-----|--------|
| **License** | The standard month/week/day views are **MIT**. Only gantt/resource-timeline/premium plugins are commercial — **we use none of them**. |
| **Both views** | `dayGridMonth` → month grid with best-in-class **multi-day spanning bars** (the roadmapping read); `timeGridWeek` → **hourly** week (sprint cadence). |
| **Editing** | `editable` + `selectable` + `interaction` plugin → drag/resize/click-to-create. Change surface via `eventsSet` / `eventChange`. |
| **React** | Official first-party React component → clean `React.lazy` code-split. |

**Alternative**: `react-big-calendar` (100% MIT, lighter, no paywall anywhere) is the
fallback if FullCalendar's bundle or licensing posture ever bites; its multi-day month
rendering is slightly less polished. We don't need it for v1.

Both libraries are **desktop-first** and **code-split** into their own lazy chunks (dynamic
`import()` in the editor's mount effect for vis-timeline; `React.lazy` for the FullCalendar
component), keeping them out of the main bundle exactly like Univer/Excalidraw.

## Data model & migrations

No schema change beyond the type enum — `content` already holds arbitrary text. One
migration **per slice** (so each ships independently), mirroring 0010:

`supabase/migrations/0011_timeline_section_type.sql`:

```sql
alter table public.note_section drop constraint if exists note_section_type_check;
alter table public.note_section add constraint note_section_type_check
  check (type = any (array['checklist'::text, 'code'::text, 'wysiwyg'::text,
                           'diagram'::text, 'markdown'::text, 'table'::text,
                           'timeline'::text]));
```

`supabase/migrations/0012_calendar_section_type.sql` adds `'calendar'::text` to the same
array.

Apply to **dev** first (`/usr/lib/postgresql/17/bin/psql`, dev `.pgpass`); **prod manually
at deploy** (prod password never pasted to chat). NB: prod still owes 0009 + 0010 — fold
0011/0012 into that same deploy step. See `prod-owes-migrations` memory.

## Plumbing checklist (per type — `'timeline'`, then `'calendar'`)

Mirror every place `'table'` is registered:

- `src/lib/types.ts` — add the type to the union in `NoteSection`, `CreateNoteSection`,
  `UpdateNoteSection`.
- `src/lib/offline/sectionTrack.ts` — **leave OUT of `CRDT_TYPES`** ⇒ defaults to LWW.
  Update the header comment to mention timeline/calendar alongside diagram/table.
- `src/lib/util/sectionTypeStyle.ts` — add `SECTION_TYPE_META` entries (Timeline: lane/bars
  icon, proposed `cyan`; Calendar: grid-with-date icon, proposed `indigo`) and append to
  `SECTION_TYPE_ORDER` (after `'table'`). The Add button then appears automatically
  (`SectionGrid` iterates these), and `defaultSection()` returns `{ type, content: '',
  meta: {} }`.
- `src/routes/sectionEditor.tsx` — add to `TYPE_TITLE`; **not** `isCrdt`, **not**
  `isPlainText`; add the editor render branch; `buildUpdates` uses the default `content`
  (LWW) path. Escape handling: closes the section as normal **unless** an in-editor
  event-edit popover is open (then Escape cancels the popover first) — decide the exact wire
  during build; not a Univer-style "library owns Escape" case.
- `src/components/sections/SectionCard.tsx` — add a preview case
  (`TimelinePreview` / `CalendarPreview`).
- `src/lib/util/sectionClipboard.ts` — add to the copy matrix (below).
- `tests/e2e/helpers.ts` — add to the seed `SectionType` union; reuse `fetchSectionContent`.

## Editor components

Both mirror `TableEditor.tsx` (props `{ initial: string; onChange: (content: string) =>
void }`, parse-once-on-mount with a graceful empty default, debounced `onChange`, a
`data-testid` + loading/error overlay, and a **DEV-only** facade hook for e2e —
`window.__TIMELINE_API__` / `window.__CALENDAR_API__`, stripped from prod, deleted on
dispose).

- **`src/components/editors/TimelineEditor.tsx`** — dynamic-import `vis-timeline` + `vis-data`
  + its CSS; build a `DataSet` of items/groups from `TimelineDoc`; `new Timeline(...)` with
  `editable` on; listen to the items/groups `DataSet` change events → serialize back to
  `TimelineDoc` JSON → `onChange`. A light toolbar for **add lane / add section header / add
  item / zoom-to-fit** (vis gives move/resize/delete via direct manipulation).
- **`src/components/editors/CalendarEditor.tsx`** — `React.lazy` the FullCalendar component;
  `plugins=[dayGrid, timeGrid, interaction]`, `initialView` from `defaultView`, a
  month/week toggle, `editable`/`selectable`; `select` → create event, `eventClick` → edit/
  delete, `eventsSet` → serialize `CalendarDoc` → `onChange`.

## Floating annotations (Timeline) — added post-sign-off (2026-06-20)

Owner request: lane-independent **annotations** — a labeled band spanning the whole board
over a date range (a phase marker, a multi-team event, the "Existing 2026 Roadmap" block).
Chosen rendering (owner picked "overlay band only"): vis-timeline **`background` items** —
full-height, translucent, behind the bars. `TimelineDoc` gains an `annotations: Annotation[]`
array (still our own JSON, LWW). Because background bands aren't draggable, each is edited via
a **toolbar chip** + the docked panel (title/start/end/color/delete). Exports include them
under an "Annotation" lane. The zoom/pan **window is persisted** on user-driven range changes.

Deferred annotation ideas (not built): per-annotation spanning a *subset* of lanes; richer
styles (icons/markers). Revisit if the owner asks.

## Card previews (static, no library instance)

Like `TablePreview` — parse our own JSON and render plain HTML/SVG; **the heavy library
stays behind the editor's code-split boundary**.

- **`TimelinePreview`** — a small static swimlane: a few lanes × bars positioned by start/end
  over a mini axis (pure CSS/SVG). Empty ⇒ "New timeline" placeholder.
- **`CalendarPreview`** — a compact static mini-month (or next-N-events agenda) with dots/
  bars on days that have events. Empty ⇒ "New calendar" placeholder.

Add `getScheduleItemCount(content)` (mirrors `getTableCellCount`) for the empty-state test.

## Copy / export

Fits the existing `sectionClipboard.ts` matrix. Both types serialize their items to a simple
table of `title / start / end [/ lane]`:

| Action | Behavior |
|--------|----------|
| **Copy** (native) | TSV of items → `text/plain` + an HTML `<table>` → `text/html`. |
| **Copy as Markdown** | GFM pipe table of items. Add the type to `hasMarkdownCopy`. |
| **Download CSV** | RFC-4180 CSV of items, via the existing `downloadCsv` affordance. |

**`.ics` export** (Calendar) and an **image/PNG export** (Timeline) are explicit **follow-up
deferrals**, not v1 — the schema being ours makes both cheap to add later.

## Testing

- `tests/e2e/timeline.spec.ts` / `tests/e2e/calendar.spec.ts` — create → editor opens → add/
  move an item via the DEV facade hook → wait for `draft_<id>` to contain it → Save → card
  preview renders → reopen round-trips. Clipboard: Copy (TSV) + Copy as Markdown (GFM).
  (Same facade-hook + poll-draft-before-Save discipline that made the table edit test stable.)
- `src/lib/util/schedule.test.ts` — unit-test the pure converters
  (`getScheduleItemCount`, item→TSV/CSV/GFM/HTML, the preview grid builder).
- `src/lib/offline/sectionTrack.test.ts` — assert `timeline` and `calendar` classify **LWW**.
- `tests/e2e/sections.spec.ts` — add both to the create loop.
- Run `test:e2e:smoke` during build, full `test:e2e` for behavior slices; kill any stale 5174
  dev server first.

## Build order (slices — each committed + e2e-green)

**Phase A — Timeline (first, the owner's workhorse)**

1. **Plumbing + migration 0011** — type registered everywhere, dev migration, Add button,
   stub editor + preview, LWW classification test. Green skeleton, no vis-timeline yet.
2. **vis-timeline editor** — code-split, load/save `TimelineDoc`, lanes + nested headers +
   range items, drag/resize/delete. Create → edit → save → reopen round-trips.
3. **`TimelinePreview`** static swimlane + empty state.
4. **Copy / CSV export** — TSV native, GFM Copy as Markdown, Download CSV.

**Phase B — Calendar (second)**

5. **Plumbing + migration 0012** — type registered, dev migration, Add button, stub editor +
   preview, LWW test.
6. **FullCalendar editor** — `React.lazy`, month + hourly-week views, create/edit/move.
7. **`CalendarPreview`** static mini-month + empty state.
8. **Copy / CSV export.**

`.ics` export, Timeline image export, capacity/budget numeric rollups, and any mobile-
specific UX are explicit follow-ups, not v1.

## Calendar — as built (2026-06-24, branch `feat/calendar-section`)

The Calendar shipped on **FullCalendar v6 (MIT)**, code-split into `CalendarCanvas` via
`React.lazy` (+ hover prefetch), with `CalendarEditor` owning the `CalendarDoc` data. It
diverged from the original month/week sketch after owner UX feedback:

- **Views (persisted per section):** **Month** = two months side by side (`multiMonth`, pages
  by one month); **5 Week** = a rolling five-week `dayGrid` window where the **scroll wheel
  pages by one week** and the `< >` buttons by five — being one continuous grid, drag-select
  runs across week *and* month boundaries (the cross-month drag the two-month view couldn't
  give); **Week** = hourly `timeGridWeek`. `CalendarView = 'month' | 'fiveWeek' | 'week'`
  (legacy `'twoMonth'` parses to `'month'`).
- **Create is deliberate, not implicit:** selecting days only *highlights* them
  (`unselectAuto: false`); a separate form (Name + Color, date range at the bottom) commits via
  **+ Event**. Clicking an event opens the same form prefilled (Delete, no add). New events
  default to the **last-used color**. Editing Start/End re-draws the highlight (spans months);
  while the form is open, selection echoes are ignored so typed dates stay authoritative.
- **All-day ends are stored exclusively** (FullCalendar convention); the form's End field and
  the exports show the **inclusive** last day.
- **Card preview = a status agenda** (`CalendarPreview.tsx`): events in time order, color-coded
  so the card reads at a glance — **past** events muted grey at the top, **currently-happening**
  highlighted with a "now" tag, **future** in normal text; trims to the most-recent past +
  current + upcoming with "+N earlier / +N more". The idea: the small card is the agenda ("what's
  happening now / next"), open the section for the detailed grid.
  - A second preview style — a **mini-month with spanning event bars** — is implemented and
    **retained unused** in `CalendarMiniMonthPreview.tsx` for a planned **"preview style" user
    preference** (agenda ↔ mini-month). Wire a per-user/per-section toggle when picked up.
- Export columns: **Title | Start | End | All day**.

`.ics` export and richer recurrence remain follow-ups. Migration **0012** applied to dev;
**prod still owes 0011 + 0012** at the next deploy.

## Open questions for sign-off

1. **Two section types** (Timeline + Calendar) sharing a schema, vs. one — recommend two
   (they're genuinely different views). ✅ owner already leaning two via the screenshot.
2. **Libraries** — vis-timeline (Timeline) + FullCalendar standard/MIT (Calendar)? Recommend
   yes; `react-big-calendar` is the no-paywall fallback for Calendar.
3. **Add-button labels & colors** — "Timeline" (cyan) and "Calendar" (indigo)? Easily changed.
4. **Capacity/budget numbers** (numeric value per lane/bucket) — defer to a follow-up on the
   Timeline item model, not v1? Recommend yes.
5. **Mobile** — desktop-first, read-only/simplified on narrow screens for v1 (mirrors
   diagram/table)? Recommend yes.
