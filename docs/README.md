# Jotter Documentation

Documentation for both human developers and AI agents working on Jotter.

## Current Direction (read this first)

Jotter is **being re-platformed from Svelte to React**. The React migration is the
**absolute first priority** — the correct base is built first, then features and styling
layer on top of it.

- **`ai_project_status.md`** — the canonical, binding direction and sequence. **Start
  here.** (Replaces any notion of an `ai-tasks/backlog.md`.)
- **`initiatives/react-migration.md`** — the migration plan (rationale, target stack,
  file-level reuse-vs-rewrite inventory, phased prod-safe cutover).
- **`features/requested-features.md`** — the canonical feature backlog (what layers on the
  React base, in order).

## Structure

- **`ai_overview.md`** — architecture, code conventions, working instructions (currently
  describes the Svelte codebase; React conventions land at cutover).
- **`project_overview.md`** — what Jotter is, goals, and the database schema (the schema is
  still the source of truth).
- **`functionality/`** — behavioral feature docs (auth, collections, containers, sections,
  editors). These are **framework-neutral** and serve as the **parity spec** for the React
  migration alongside the Playwright suite.
- **`initiatives/`** — focused work plans:
  - `react-migration.md` (active priority)
  - `mobile-deep-dive.md` (planned, blocked on React cutover)
  - `regression-testing.md` (complete — historical)
  - `code-quality-foundation.md` (partially complete / on hold — historical)
- **`features/`** — `requested-features.md` (canonical backlog).
- **`architecture/`** — technical deep-dives (`data-flow.md`, `component-tree.md`,
  `event-log.md`). The Svelte-specific structure here is superseded by
  `react-migration.md` for planning purposes.
- **`cache_architecture.md`** — cache-as-database deep dive. The *concepts* carry forward
  to the React app (re-hosted on a store like Zustand); Svelte-store specifics will change.
- **`bug-tracking/`** — dated session bug logs (historical records).

## For AI Agents

1. Read `ai_overview.md`, `project_overview.md`, and `ai_project_status.md` at session
   start (per `CLAUDE.md`).
2. Treat `ai_project_status.md` as the binding priority list — **React migration first**.
3. Use `functionality/` as the behavioral parity spec when porting an area.
4. Keep `ai_project_status.md` updated as work progresses.

---

**Last Updated**: 2026-06-16
