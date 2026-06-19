# Jotter (React)

The React re-platform of Jotter, built side-by-side with the live SvelteKit app.
See [`../docs/initiatives/react-migration.md`](../docs/initiatives/react-migration.md) for
the plan, locked stack decisions, and rollout sequence.

## Stack

- **Vite + React 18 + TypeScript** (strict)
- **TanStack Router** — routing
- **TanStack Query** — primary cache, configured as a _cache-as-database_
  (`staleTime: Infinity`, no auto-refetch) to preserve Jotter's instant, synchronous reads
- **Tailwind v4** — styling
- **Supabase** — backend (unchanged)

## Getting started

```bash
cd jotter-react
npm install
cp .env.example .env.local   # then fill in the DEV Supabase project creds
npm run dev                  # http://localhost:5174
```

The Svelte app (port 5173) and this app (port 5174) run independently against the same
backend, so you can compare behavior during the migration.

## Scripts

| Script                   | What it does                             |
| ------------------------ | ---------------------------------------- |
| `npm run dev`            | Vite dev server (port 5174)              |
| `npm run build`          | Type-check (`tsc -b`) + production build |
| `npm run typecheck`      | Type-check only                          |
| `npm run lint`           | Prettier check + ESLint                  |
| `npm run format`         | Prettier write                           |
| `npm run test:unit`      | Vitest                                   |
| `npm run test:e2e`       | Full Playwright suite (real jotter-dev)  |
| `npm run test:e2e:smoke` | `@smoke`-tagged subset — ~5s fast check  |

For small changes (a button label, a copy tweak) run `test:e2e:smoke` — 4 tests
covering boot+auth+grid, container/section render, the editor, and the header
menu. Run the full `test:e2e` before anything structural or before a commit that
touches behavior. Tag a test into the subset by adding `{ tag: '@smoke' }`.

## Status

**Phase 0 — Scaffold.** The landing page is a throwaway health check proving the stack is
wired (React + Router + Query + Tailwind + Supabase). Real routes/UI land in later phases.
