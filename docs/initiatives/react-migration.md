# Initiative: Migrate Jotter from Svelte to React

**Status**: Planned / Not Started
**Priority**: High (blocks the new feature roadmap)
**Owner decision date**: 2026-06-16
**Goal**: Re-platform the existing, working Jotter app from SvelteKit (Svelte 5) to React,
preserving 100% of current behavior, using the Playwright E2E suite as the acceptance
gate, with **zero disruption to daily production use** during the migration.

---

## Why We're Doing This

The decision was made after evaluating the requested feature set
(`docs/features/requested-features.md`) against each framework:

- **Recurring pain, structural cause.** The hardest parts of this app to build in Svelte
  (cross-container drag-and-drop, the hand-rolled section DnD system) all stem from one
  thing: Svelte's thinner ecosystem for **complex interactive widgets**. Three of the six
  requested features — **table, richer WYSIWYG, calendar** — hit that same wall, and
  React's lead there is wide and durable.
- **The neutral features cost nothing to move.** Unparented sections, sharing, and
  offline/sync are backend/data-model shaped and port either way.
- **AI-assisted velocity** is better in React, and that compounds across four new
  widget-heavy features.
- **Low-risk conditions for a rewrite are all present:** a working app as the spec, a
  framework-agnostic Playwright suite as the correctness oracle, a small surface area, a
  single developer with full context, and daily dogfooding that surfaces regressions
  immediately.

This is a **re-platform of a known-good app**, not a greenfield build. The behavior is
already specified by the running app and the test suite.

### Notable head start
The repo **already depends on `react`, `react-dom`, `@types/react`, and `@dnd-kit/*`**,
and `@excalidraw/excalidraw` is a **React component already running inside the Svelte app**.
So React is literally executing in production today to host the diagram editor.

---

## Guiding Constraints

1. **Production safety first.** The Svelte app stays live and untouched in prod until the
   React app passes the **full Playwright suite** *and* survives **a week of the owner's
   daily use**. Only then do we cut over. Never edit real notes in a half-built app.
2. **Behavior parity is the bar.** No feature changes during the migration. New features
   come *after* cutover. (Exception: trivially unavoidable adjustments, documented.)
3. **Tests are the oracle.** The Playwright E2E suite (DOM/URL-driven, framework-agnostic)
   is the definition of "done" for each area.
4. **Port logic, rewrite UI.** Pure TypeScript (types, services, cache logic, utils) is
   re-hosted with minimal change. Every `.svelte` file is rewritten.

---

## Target Stack (proposed — confirm before Phase 0)

| Concern | Current (Svelte) | Proposed (React) | Rationale |
|---------|------------------|------------------|-----------|
| Framework | Svelte 5 | React 18/19 | Already a dependency |
| Build/dev | Vite + SvelteKit | **Vite + React** (SPA) | Keep Vite; drop SSR (app is cache-first, auth-gated) |
| Routing | SvelteKit file routes + `+page.ts` loaders | **TanStack Router** (or React Router) | Type-safe; closest mental model to current loaders |
| State / cache | Svelte stores (`writable`/`derived`) | **Zustand** (+ optionally TanStack Query later for sync) | Maps cleanly to `AppDataManager`; minimal ceremony |
| Drag & drop | custom `src/lib/dnd/*` + svelte-dnd-action + sortablejs | **@dnd-kit** (already a dep) | First-class multi-container sortable — the original pain point |
| Styling | Tailwind v4 | Tailwind v4 (unchanged) | Class strings port directly |
| Code editor | CodeMirror 6 (Svelte wrapper) | CodeMirror 6 (React wrapper) | Library is framework-agnostic |
| Rich text | Quill | Quill for parity port; **TipTap later** (feature #3) | Don't change behavior during migration |
| Diagrams | Excalidraw (React-in-Svelte) | Excalidraw (native React) | Becomes first-class |
| Backend | Supabase JS | Supabase JS (unchanged) | No change |
| Unit/component tests | Vitest + @testing-library/svelte | Vitest + @testing-library/react | Rewrite component tests; util tests port |
| E2E | Playwright | Playwright (unchanged) | The acceptance gate |

**Open stack questions** (resolve before starting):
- TanStack Router vs React Router?
- Zustand vs Redux Toolkit vs TanStack Query as the cache primitive? (Leaning Zustand for
  parity now, TanStack Query when we tackle offline/sync.)
- Greenfield React app in a new directory and swap, vs. in-place conversion?

---

## Reuse-vs-Rewrite Inventory (grounded in current `src/`)

### ✅ Port nearly verbatim (pure TypeScript, no Svelte)

| Area | Files | Notes |
|------|-------|-------|
| Types | `src/lib/types.ts`, `src/app.d.ts` | Pure interfaces. Already includes future sync types. |
| Services | `src/lib/services/*.ts` (collection, note, section, user, sequence, navigation, eventLog, migration), `services/localStorage/demoStorageService.ts` | Static classes over Supabase. **Caveat:** they import `isDemoMode` from a Svelte store — abstract that behind a framework-neutral module. |
| Supabase | `src/lib/supabase.ts`, `src/lib/auth.ts` | Client + auth helpers; framework-neutral (keep `window.__SUPABASE_CLIENT__` test hook). |
| Cache logic | `src/lib/stores/core/appData{Core,Operations,Updates,Utils}.ts` | **Logic** ports (deep clone, optimistic update math, preload); the Svelte-store wiring is re-hosted on Zustand. |
| Utils | `src/lib/utils/*.ts`, `src/lib/components/sections/utils/*.ts`, `src/lib/components/containers/utils/*.ts` | Pure functions (sequence, checklist, content, title, error, device, drag math). |
| Config | `src/lib/constants.ts`, `src/lib/config/quill/quill-config.ts` | Port as-is. |

### 🔁 Re-host (logic survives, reactivity primitive changes)

| Area | Files | Approach |
|------|-------|----------|
| App data store | `src/lib/stores/appDataStore.ts` (AppDataManager) + `appStore.ts`, `collectionCacheStore.ts`, `collectionStore.ts`, `noteStore.ts`, `sectionCacheStore.ts`, `demoStore.ts` | Re-express as Zustand store(s) wrapping the ported cache logic. Public API (`ensureCollectionData`, optimistic updaters) kept stable so call sites map 1:1. |
| Composables | `src/lib/composables/use*.ts` (11 files) | Conceptually → React hooks, but rewritten (they use Svelte reactivity/stores). |

### ✍️ Full rewrite (Svelte → React components)

| Area | Files | Notes |
|------|-------|-------|
| Routes/pages | `src/routes/**/*.svelte`, `+layout.svelte`, `+page.ts`, `+layout.ts` | Re-map to TanStack/React Router; `+page.ts` loaders → route loaders or in-component fetch. Includes `/app`, collections, containers, edit, auth (login/register/callback), about, privacy, settings, admin events `+server.ts` (API route → serverless/edge or keep as small server). |
| Layout/components | `src/lib/components/{layout,collections,containers,sections,ui,debug}/**` (~45 components) | Straight UI rewrite; Tailwind classes carry over. |
| Editors | `editors/{CodeEditor,QuillEditor,ExcalidrawEditor,ChecklistEditor,DiagramEditor,WysiwygEditor,SortableChecklist,SortableChecklistItem}.svelte`, plus `CodeMirrorEditor.svelte` | CodeMirror/Quill/Excalidraw = wire library into React; checklist = custom rewrite. Excalidraw becomes native. |
| **DnD system** | `src/lib/dnd/**` (core, behaviors, components), `useNoteContainerDnD.ts`, `useSortable.ts`, `dragUtils.ts`, svelte-dnd-action + sortablejs usages | **Replace entirely with @dnd-kit.** Largest single rewrite; also the biggest payoff. |

### 🗑️ Do **not** port (dead code)
`src/lib/components/sections/SectionItem.DELETE.svelte`,
`src/lib/components/ui/DraggableItem.DELETE.svelte`,
`src/lib/stores/dragStore.DELETE.ts`.

### 🧪 Tests
- **E2E (`tests/e2e/*.spec.ts`, helpers, scripts):** keep as the acceptance gate. Expect
  **selector adjustments** where they rely on Svelte-specific DOM. Re-validate
  drag-and-drop specs against `@dnd-kit` output (the API-bypass pattern via
  `window.__SUPABASE_CLIENT__` still works).
- **Unit (Vitest):** util tests port directly.
- **Component tests:** `demo.spec.ts`, `routes/app/page.svelte.test.ts`,
  `@testing-library/svelte` → rewrite with `@testing-library/react`.

---

## Phased Plan

> Each phase ends with the relevant Playwright specs green. The Svelte app remains the
> production app throughout; the React app is built alongside until cutover (Phase 7).

### Phase 0 — Scaffold & decisions
- [ ] Confirm stack open questions (router, state lib, in-place vs parallel app).
- [ ] Stand up Vite + React + Tailwind v4 + TypeScript strict, ESLint/Prettier parity.
- [ ] Wire Supabase client + auth; port `types.ts`; establish `$lib`-equivalent aliases.
- [ ] Get the Playwright runner pointed at the new app (behind a flag) so specs can run
      against it as areas come online.

### Phase 1 — Data & service layer (no UI)
- [ ] Abstract `isDemoMode()` out of services into a framework-neutral module.
- [ ] Port all services + Supabase/auth/eventLog/migration verbatim; unit-test green.
- [ ] Re-host `AppDataManager` cache logic on Zustand with a parity public API.

### Phase 2 — Routing & auth shell
- [ ] Implement routes: landing, auth (login/register/**callback**), `/app` layout, guard.
- [ ] Demo-mode entry + migration-prompt path.
- [ ] E2E: auth/navigation specs green.

### Phase 3 — Collections + Containers (read + CRUD, no DnD yet)
- [ ] Collections grid, container sidebar/tabs, container page layout.
- [ ] Inline title editing, create/delete, Load More, cache preloading.
- [ ] E2E: collection-crud, container-crud, inline-editing green.

### Phase 4 — Sections + Editors (no DnD yet)
- [ ] Section grid + cards + content previews.
- [ ] Editors: Code (CodeMirror), Rich text (Quill — parity), Diagram (Excalidraw native),
      Checklist (custom).
- [ ] Section CRUD, titles, keyboard shortcuts, delete-empty-on-cancel.
- [ ] E2E: section-crud, checklist green.

### Phase 5 — Drag & drop on @dnd-kit
- [ ] Section reorder, container reorder, cross-container section moves, cross-collection
      container moves.
- [ ] Touch-device disabling parity.
- [ ] E2E: drag-drop spec green (re-validate the 1 currently-skipped case).

### Phase 6 — Parity hardening
- [ ] Full Playwright suite green; full unit suite green.
- [ ] Manual pass against `docs/functionality/` behaviors + edge cases.
- [ ] Mobile-responsive parity check.
- [ ] Performance check (instant navigation, no spinners, no excess re-renders).

### Phase 7 — Cutover
- [ ] Owner dogfoods the React build for **one week** alongside prod.
- [ ] Deploy React app; keep Svelte build reachable as rollback for one cycle.
- [ ] Archive Svelte source; update CLAUDE.md / docs to React conventions.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Data loss during dual-running** | Same Supabase backend, read-heavy testing; never point daily editing at the unfinished app until Phase 7. |
| Editor integration drift (Quill/CodeMirror behavior nuances) | Port for *parity* first (same libs); defer TipTap upgrade to feature work. |
| DnD behavior differences (@dnd-kit vs custom) | Lock behavior to E2E specs; manual drag matrix in Phase 5. |
| Tests encode Svelte-specific DOM | Budget selector cleanup in Phase 0; prefer role/text/test-id selectors. |
| Scope creep (sneaking features in) | Hard rule: parity only until cutover; features tracked separately in `requested-features.md`. |
| SvelteKit server bits (`+server.ts`, loaders) | Inventory server-only code early (admin events API, OAuth callback) and choose React equivalents in Phase 0. |
| Tailwind v4 config nuances | Reuse existing config; visual diff key screens. |

---

## Success Criteria

- ✅ Full Playwright E2E suite passes against the React app.
- ✅ All four editor types + all DnD operations behave identically to today.
- ✅ Cache-as-database behavior preserved (instant nav, optimistic updates, rollback).
- ✅ Demo mode + demo→cloud migration preserved.
- ✅ One week of owner daily use with no regressions or data issues.
- ✅ Clean cutover with a rollback path retained for one cycle.
- ✅ Docs and CLAUDE.md updated to React conventions.

---

## Explicitly Out of Scope (during migration)

- Any feature from `docs/features/requested-features.md` (calendar, unparented sections,
  markdown/richer WYSIWYG, table, sharing, offline/sync). These come **after** cutover.
- TipTap/Lexical editor upgrade (parity-port Quill first).
- The offline/sync re-architecture (its own project; framework-neutral).

---

**Last Updated**: 2026-06-16
</content>
