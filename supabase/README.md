# Supabase migrations & environments

Backend schema is managed as **versioned SQL migrations** in `supabase/migrations/`,
applied with the Supabase CLI. This is the discipline agreed for the React migration
(see `../docs/initiatives/react-migration.md` → "Migration discipline").

## Projects

| Env | Project ref | Notes |
|-----|-------------|-------|
| **dev** (`jotter-dev`) | `poehrpfamclemjyagnqa` | Mirror of prod schema. Migration rehearsal ground. Safe to wipe. |
| **prod** | `__FILL_IN__` | Live app (jotter.marstol.com). **Real data — never push an untested migration here.** |

> Get the prod ref from its Supabase dashboard URL: `…/project/<REF>` (or Settings → General).

## Golden rules

1. `db push` applies migrations to **whichever project is currently linked**. Always run
   `npx supabase projects list` / check `supabase link` before a push.
2. Every schema change rehearses on **dev** first, then — only once verified — on **prod**.
3. Migrations are committed to git. `.env.local` and secrets are not.

## One-time: replicate prod schema onto dev

The goal is `dev schema == prod schema` as the baseline, so later migrations can be tested
on dev before touching prod data.

```bash
# From repo root. `login` is interactive — run it yourself (e.g. `! npx supabase login`).
npx supabase login

# 1. Capture prod's exact schema as the baseline migration (READ-ONLY on prod).
npx supabase link --project-ref <PROD_REF>
npx supabase db pull                 # → supabase/migrations/<ts>_remote_schema.sql

# 2. Replicate that baseline onto the empty dev project.
npx supabase link --project-ref poehrpfamclemjyagnqa
npx supabase db push                 # applies the baseline to jotter-dev
```

After this, dev is a structural clone of prod (no data).

## Per-change workflow (going forward)

```bash
npx supabase migration new <name>    # creates an empty timestamped SQL file
# ...author the SQL (Claude does this; e.g. make note_section.note_container_id nullable)...

npx supabase link --project-ref poehrpfamclemjyagnqa   # dev
npx supabase db push                 # test on dev, exercise the app

# Only after it's verified on dev:
npx supabase link --project-ref <PROD_REF>             # prod
npx supabase db push                 # apply to prod
```

## Status

- [ ] Capture prod baseline (`db pull`) — **needs prod ref + your `supabase login`**.
- [ ] Replicate baseline onto dev.
- [ ] Migration: make `note_section.note_container_id` nullable (unparented-sections
      foundation, #2) — authored after baseline exists, tested on dev.
