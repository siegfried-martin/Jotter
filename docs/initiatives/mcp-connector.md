# Initiative: Jotter MCP Connector

**Status**: Signed off 2026-09-24 — building on `feat/mcp-connector`
**Feature**: A remote **MCP server** that lets Claude (claude.ai, Claude Desktop, the Claude
mobile app, and Claude Code) read and write your Jotter notes. You connect it once, alongside
Jira, Gmail, and the code, and "notes" becomes a first-class context source for any project.
**Predecessors**: Sharing (membership RPCs), unparented sections (quick jot), offline/sync (the
CRDT/LWW two-track model), search (0013), and copy-as-Markdown. All of these are live, and
this initiative is mostly a new *surface* over them.

## Why

Jotter already holds the owner's working notes: meeting notes, status, plans. An MCP
connector turns those into something Claude can pull in on demand ("what did we decide about
the deploy window?") and write back to ("jot down the action items from this thread").
Combined with the other connectors, one Claude conversation spans notes, tickets, email, and
code.

## Decisions (locked with owner, 2026-09-24)

- **Hosting: a real app service on the droplet, `jotter-server/`** (Node + Express). MCP is
  its *first* module, not its only one. The owner expects this server to grow: better
  real-time for the editors (the current Supabase-broadcast Yjs provider is not loved) and
  more real-time features that would burn Edge Function usage. Lay it out as a general
  service (`src/http`, `src/auth`, `src/mcp`, later `src/realtime`), not an MCP one-off.
- **Write scope v1: create + append + replace** (plus checklist edits, rename, file). No deletes.
- **New notes default to unfiled** (quick jot). They appear in the home page's recent list.

## How it fits the existing architecture

| Need | Already exists |
|------|----------------|
| Per-user access control | Supabase RLS + membership RPCs. The MCP server calls Supabase **with the user's own access token**, so Claude sees exactly what the user sees, including shares. No new permission logic. |
| "Find my notes" | `search_sections` RPC (0013), `get_recent_sections` (0003), `get_my_collections` |
| LLM-friendly format | `sectionToMarkdown()` (copy-as-Markdown) covers every type except diagram |
| Write without filing | Unparented sections: `note_container_id` is nullable |
| Auth for remote MCP | **Supabase OAuth 2.1 Server** (beta, free on all plans). It implements the MCP auth spec, including discovery metadata and dynamic client registration (DCR). |

⚠️ `SELECT` on `note_section` is **public** under open sharing. So every *listing* must go
through a membership-scoped RPC, never a bare `select`. Fetching one section by id is fine,
because that's the same as opening a shared link.

## Architecture

```
Claude (claude.ai / Desktop / mobile / Code)
   │  Streamable HTTP + Bearer <Supabase OAuth access token>
   ▼
jotter-server  (Node/Express service; MCP mounted at https://jotter.marstol.com/mcp)
   │  • /.well-known/oauth-protected-resource  → points at Supabase Auth
   │  • 401 + WWW-Authenticate when no/invalid token
   │  • verifies token (supabase.auth.getUser), builds a USER-SCOPED supabase client
   ▼
Supabase (Postgres + RLS + RPCs, Realtime)        Supabase Auth OAuth 2.1 server
                                                     │ authorization_url_path
                                                     ▼
                                   Jotter SPA  /oauth/consent  (Approve / Deny)
```

- **Auth flow**: Claude discovers the server's protected-resource metadata. It then
  registers itself with Supabase Auth through DCR and sends the user to Supabase's authorize
  endpoint. Supabase redirects to the **Jotter consent page**. If the user isn't logged in,
  they log in with Google, then click Approve. Claude receives a Supabase access token plus a
  refresh token, and sends it as `Bearer` on every MCP call. Tokens carry a `client_id`
  claim, and RLS already applies to them unchanged.
- **Token validation**: the server calls `supabase.auth.getUser(token)`, which is authoritative
  and works with the current HS256 signing keys. Results are cached for about 60s per token
  so each tool call doesn't make a round trip to Auth. (If we later move to asymmetric
  signing keys, `getClaims` with JWKS does this locally.)
- **Claude Code note**: Claude Code's OAuth callback is `http://localhost:<port>/callback`. DCR
  registers whatever port Claude Code uses, so it works. If a re-auth ever fails on a redirect
  mismatch, use `--callback-port <fixed>` when adding the server.

### Code sharing

`jotter-server/` is a sibling package to `jotter-react/`. The pure conversion code
(`sectionToMarkdown`, `table.ts`, `schedule.ts`) is imported from `jotter-react/src/lib/util`
and bundled with esbuild, so it isn't forked. `sectionClipboard.ts` mixes pure conversion with
browser clipboard APIs, so the pure half moves to a new `sectionMarkdown.ts` that both
packages import. (Turndown's Node build carries its own DOM, so it runs server-side as is.)

## Tools (v1)

Every result includes the section's **Jotter URL** (`/app/sections/<id>`) so Claude can link
the user straight to it.

**Read**
| Tool | Backed by |
|------|-----------|
| `search_notes(query, limit?)` | `search_sections` RPC |
| `recent_notes(limit?)` | `get_recent_sections` RPC |
| `list_collections()` | `get_my_collections` RPC |
| `list_notebooks(collection_id)` | containers of a collection the user is a member of |
| `list_notes(container_id)` | sections in a container (membership checked) |
| `get_note(id)` | one section → metadata + **Markdown** body (diagram → element count only) |

**Write**
| Tool | Types | Mechanism |
|------|-------|-----------|
| `create_note(type, title, body, container_id?)` | markdown, wysiwyg ("text"), code, checklist | Insert. **Unfiled by default** (appears in the home "recent" list). A new section has no ydoc, so the editor seeds from `content` on first open. Safe for every type. |
| `append_to_note(id, body)` | markdown, wysiwyg, code, checklist | CRDT types: server-side Yjs op (below). Checklist: add items (LWW). |
| `update_checklist(id, ops[])` | checklist | check / uncheck / add / edit / remove items, LWW with compare-and-swap |
| `replace_note_body(id, body)` | markdown, wysiwyg, code | Full overwrite as a CRDT op (delete all + insert), so it merges cleanly with live editors |
| `rename_note(id, title)` / `file_note(id, container_id \| null)` | all | Plain column updates |

**Deliberately not in v1**: deleting anything; writing table / timeline / calendar / diagram
bodies (they're read-only through the connector); collection or container creation.

Tool naming: Jotter's UI says "collections / containers / sections". For Claude, the tools use
**notes** and **notebooks**, which read naturally in a prompt ("find my notes about X"). Tool
descriptions map these back to the app's terms.

## The hard part: writing to CRDT sections safely

For `code` / `wysiwyg` / `markdown`, the source of truth is the **Yjs document** (`ydoc`),
and `content` is only a mirror. Writing `content` alone is useless, because the next editor
save overwrites it from the ydoc. So a server-side edit must be a real Yjs op:

1. Load `content, ydoc, updated_at`.
2. Rebuild the `Y.Doc` from `ydoc`. If there is no ydoc yet, seed it the way the editor does:
   `Y.Text('content')` from `content` for code/markdown, or `Y.XmlFragment('richtext')` from
   the HTML for wysiwyg.
3. Apply the edit. Code/markdown insert into the `Y.Text`. Wysiwyg converts Markdown → HTML
   (markdown-it) → ProseMirror JSON (TipTap schema, same extension set as `YTipTapEditor`)
   → nodes appended into the fragment (y-prosemirror).
4. Write `ydoc` plus the re-materialized `content`, using **compare-and-swap on `updated_at`**
   and retrying on a lost race.
5. **Broadcast the delta** on the section's Realtime channel (`yjs:<id>`, the protocol
   `SupabaseYjsProvider` already speaks), so an editor open in a browser merges it live.

### Pre-existing gap this exposes (fix first: slice 0)

The editor's save writes `encodeStateAsUpdate(its local doc)` as the new `ydoc`. It **never
merges the server's current ydoc first**, and the query cache never goes stale
(`staleTime: Infinity`). Now suppose an editor was *not* live when an external edit landed:
the tab was open for hours, or the editor was closed and reopened from cache. Its local doc
lacks those ops, and its save **silently overwrites them**. This is already a latent
multi-user bug; MCP writes would make it routine.

**Fix**: on CRDT save, fetch the row's current `ydoc`, `Y.applyUpdate` it into the local doc
(idempotent, CRDT merge), *then* encode and materialize. Also merge the fresh server ydoc
when the editor opens, so the user sees Claude's edits right away. This is small, contained,
and unit-testable.

## Hosting

**Node service on the droplet** (chosen). A small systemd unit (`jotter-server.service`,
roughly 100 MB RSS), reverse-proxied by the existing web server at `/mcp` and
`/.well-known/oauth-protected-resource` on `jotter.marstol.com`. It's built off-box (it's a
single esbuild bundle), so it adds nothing to the droplet's build-memory problem.

*Alternative*: a Supabase Edge Function (Deno). This is the documented path and needs zero
droplet ops. But sharing code with `jotter-react` (`@/` aliases, npm-only Yjs/TipTap/turndown
under Deno) is awkward, and a Deno-specific test harness is extra work. It's not worth it for
a single-owner deployment.

## Owner actions (dashboard, can't be done from code)

1. **jotter-dev** → Authentication → OAuth Server: **enable**. Set the authorization path to
   `/oauth/consent`, **enable dynamic client registration**, and make sure the Site URL points
   at the dev SPA (`http://localhost:5174`).
2. Later, the same on **prod** (Site URL `https://jotter.marstol.com`).
3. At deploy: reverse-proxy entries for whatever serves the SPA on the droplet, plus the systemd unit (I'll provide both, and the
   `deploy.sh` addition).

No schema migration is expected. Everything goes through existing RPCs and RLS.

## Slice plan

Each slice is a commit with tests green (the cadence the owner likes).

0. **CRDT merge-on-save** in the app (the fix above), with unit tests and the existing e2e
   suite.
1. **`jotter-server` scaffold + MCP read tools**: MCP SDK over Streamable HTTP, bearer auth, the
   user-scoped client, the shared `sectionMarkdown.ts` extraction, and the six read tools.
   Tests run against jotter-dev with the e2e user's password-grant token.
2. **OAuth**: protected-resource metadata, the 401 challenge, and the `/oauth/consent` route
   in the SPA. Verified end to end with Claude Code against localhost and jotter-dev (needs
   owner action 1).
3. **Simple writes**: `create_note`, `update_checklist`, `rename_note`, `file_note`, and
   checklist append.
4. **CRDT writes**: `append_to_note` / `replace_note_body` for code, markdown, and wysiwyg.
   Includes server-side Yjs, CAS, and the Realtime broadcast. Tests include "an editor open in
   Playwright receives Claude's append live".
5. **Deploy**: bundle, systemd, nginx, prod OAuth enable, and adding the connector in
   claude.ai. The owner does the manual end-to-end check.
