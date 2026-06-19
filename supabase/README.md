# Supabase migrations & environments

Backend schema is managed as **versioned SQL migrations** in `supabase/migrations/`,
applied with the Supabase CLI. This is the discipline agreed for the React migration
(see `../docs/initiatives/react-migration.md` → "Migration discipline").

## Projects

| Env | Project ref | Notes |
|-----|-------------|-------|
| **dev** (`jotter-dev`) | `poehrpfamclemjyagnqa` | Mirror of prod schema. Migration rehearsal ground. Safe to wipe. |
| **prod** (`jotter-prod`) | `wccmdhtjckzwywffvnsp` | Live app (jotter.marstol.com). **Real data — never apply an untested migration here.** |

> The older `cfryekoikwicltltflrc` ("Jotter") project is INACTIVE/lapsed and unused.

## Tooling (this machine)

No Docker here, so the Supabase CLI's `db pull`/`db push` (which run pg_dump in a
container) aren't usable. We use the PostgreSQL 17 client directly instead:

- **pg_dump 17**: `/usr/lib/postgresql/17/bin/pg_dump` (the `/usr/bin` wrapper defaults to v16 — use the full path)
- **psql 17**: `/usr/lib/postgresql/17/bin/psql`
- **Dev auth**: a `~/.pgpass` entry (chmod 600) for `db.poehrpfamclemjyagnqa.supabase.co` lets psql connect to dev without a prompt. **Prod is deliberately NOT in `~/.pgpass`** — prod always requires a manual password.

## Golden rules

1. `db push` applies migrations to **whichever project is currently linked**. Always run
   `npx supabase projects list` / check `supabase link` before a push.
2. Every schema change rehearses on **dev** first, then — only once verified — on **prod**.
3. Migrations are committed to git. `.env.local` and secrets are not.

## One-time: how the baseline was captured (done 2026-06-16)

`0000_prod_baseline.sql` is prod's `public` schema. It was produced by:

```bash
# 1. Dump prod (READ-ONLY), schema only. -W prompts for the prod DB password (hidden).
/usr/lib/postgresql/17/bin/pg_dump --schema-only --no-owner --no-privileges \
  -h db.wccmdhtjckzwywffvnsp.supabase.co -p 5432 -U postgres -d postgres -W \
  -f /tmp/prod_full.sql

# 2. Filter to the public schema + the two auth.users onboarding triggers
#    (auth/storage/realtime/etc. are Supabase-managed — present on every project).
#    -> supabase/migrations/0000_prod_baseline.sql
```

It was then applied to the empty dev project:

```bash
/usr/lib/postgresql/17/bin/psql -w -h db.poehrpfamclemjyagnqa.supabase.co -p 5432 \
  -U postgres -d postgres -v ON_ERROR_STOP=1 --single-transaction \
  -f supabase/migrations/0000_prod_baseline.sql
```

dev is now a structural clone of prod (no data).

## Per-change workflow (going forward)

```bash
PSQL=/usr/lib/postgresql/17/bin/psql

# 1. Author supabase/migrations/NNNN_<name>.sql

# 2. Test on DEV (auth via ~/.pgpass — no password needed):
$PSQL -w -h db.poehrpfamclemjyagnqa.supabase.co -p 5432 -U postgres -d postgres \
  -v ON_ERROR_STOP=1 --single-transaction -f supabase/migrations/NNNN_<name>.sql
# ...exercise the app against dev...

# 3. ONLY after it's verified on dev, apply to PROD (manual password, -W):
$PSQL -h db.wccmdhtjckzwywffvnsp.supabase.co -p 5432 -U postgres -d postgres -W \
  -v ON_ERROR_STOP=1 --single-transaction -f supabase/migrations/NNNN_<name>.sql
```

> Migrations are plain idempotent-where-possible SQL, numbered in order, committed to git.
> Always `--single-transaction` + `ON_ERROR_STOP=1` so a bad migration rolls back cleanly.

## Status

- [x] Capture prod baseline → `0000_prod_baseline.sql` (public: 11 tables, 15 functions, 17 policies, 14 triggers).
- [x] Replicate baseline onto dev (applied clean, verified).
- [x] `0001_nullable_note_container_id.sql` — `note_section.note_container_id` now nullable; tested on dev, FKs intact.
- [ ] Apply accumulated migrations to **prod** — only at the step-3 cutover, after dev/UAT sign-off.
