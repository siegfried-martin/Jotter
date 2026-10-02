# jotter-server

Jotter's app service. Today it hosts the **Claude MCP connector**, which lets Claude (claude.ai,
Claude Desktop, the mobile app, and Claude Code) search, read, and write your Jotter notes. It's
designed to grow: future server-side features (e.g. editor real-time) mount here too. Design and
decisions: [`docs/initiatives/mcp-connector.md`](../docs/initiatives/mcp-connector.md).

## How it works

- **Auth**: Supabase Auth's OAuth 2.1 server issues the tokens; this service is only a protected
  resource. It publishes `/.well-known/oauth-protected-resource`, answers unauthenticated
  requests with a `401` + `WWW-Authenticate` challenge (which starts Claude's connect flow), and
  verifies bearer tokens with Supabase. The consent screen is the SPA's `/oauth/consent` route.
- **Data access**: every tool runs **as the calling user** (their token on a Supabase client, no
  service role), so RLS and the membership RPCs decide what Claude can see and change.
- **Shared code**: `src/shared.ts` is the one seam to the SPA (`sectionToMarkdown`, the TipTap
  schema, types). esbuild bundles it; npm imports resolve from this package's `node_modules`, so
  keep shared package versions (TipTap, turndown, markdown-it) in step with `jotter-react`.

## Develop

```bash
cp .env.example .env.local   # SUPABASE_URL / SUPABASE_ANON_KEY = the SPA's dev values
npm install
npm run dev                  # http://localhost:8787/mcp
npm test                     # unit tests (offline)
npm run test:int             # integration tests against jotter-dev as the e2e user
npm run lint                 # prettier + tsc
```

To try it from Claude Code against dev (with the SPA running on :5174 for the consent screen):

```bash
claude mcp add --transport http jotter-dev http://localhost:8787/mcp
```

Then run `/mcp` in Claude Code to authenticate. If a re-auth ever fails on a redirect mismatch,
re-add it with `--callback-port 43117` (or any fixed port).

## Supabase setup (per project, in the dashboard)

Authentication → OAuth Server:
1. **Enable** the OAuth 2.1 server.
2. Authorization path: **`/oauth/consent`** (relative to the project's Site URL; dev
   `http://localhost:5174`, prod `https://jotter.marstol.com`).
3. **Enable dynamic client registration** (Claude registers itself).

## Deploy (droplet)

One-time:
```bash
cd /root/Jotter/jotter-server
cp .env.example .env         # prod SUPABASE_URL/KEY, PUBLIC_URL=APP_URL=https://jotter.marstol.com
sudo cp deploy/jotter-server.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable jotter-server
# add deploy/nginx-locations.conf to the site's server block, then:
sudo nginx -t && sudo systemctl reload nginx
```

Each deploy (append to `/root/Jotter/deploy.sh`; esbuild is cheap, so it's fine on the droplet):
```bash
cd /root/Jotter/jotter-server && npm ci && npm run build && npm prune --omit=dev \
  && sudo systemctl restart jotter-server
```

Check: `curl https://jotter.marstol.com/.well-known/oauth-protected-resource/mcp` returns the
metadata, and `curl -i -X POST https://jotter.marstol.com/mcp` returns `401` with a
`WWW-Authenticate` header.

## Connect Claude

- **claude.ai / Desktop / mobile**: Settings → Connectors → Add custom connector →
  `https://jotter.marstol.com/mcp`, then approve on Jotter's consent screen.
- **Claude Code**: `claude mcp add --transport http jotter https://jotter.marstol.com/mcp`,
  then `/mcp` to authenticate.

## Tools

Read: `search_notes`, `recent_notes`, `list_collections`, `list_notebooks`, `list_notes`,
`get_note`. Write: `create_note`, `append_to_note`, `replace_note_body`, `update_checklist`,
`rename_note`, `file_note`. Tool names say "notes"/"notebooks" (sections/containers in the app).
Nothing can be deleted; table/timeline/calendar/drawing bodies are read-only.
