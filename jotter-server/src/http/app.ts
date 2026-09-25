import express, { type Express, type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import type { OAuthTokenVerifier } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { Config } from '../config';
import { createUserClient } from '../supabase';
import { NotesApi } from '../notes/notesApi';
import { createJotterMcpServer } from '../mcp/server';
import type { JotterAuthExtra } from '../auth/tokenVerifier';

// The HTTP surface. Today: health, OAuth discovery metadata, and the MCP endpoint. This is
// Jotter's general app service, so future server-side features mount here too.
//
// Auth model (docs/initiatives/mcp-connector.md): Supabase Auth is the OAuth 2.1
// authorization server. This service is only a *protected resource*. It publishes RFC 9728
// metadata pointing clients at Supabase, rejects requests without a valid Supabase access
// token (401 + WWW-Authenticate, which starts the client's OAuth flow), and runs every tool
// as the token's user.

export const MCP_PATH = '/mcp';

export function createApp(config: Config, verifier: OAuthTokenVerifier): Express {
  const app = express();
  app.disable('x-powered-by');
  // Behind the droplet's reverse proxy in prod.
  app.set('trust proxy', 'loopback');
  app.use(express.json({ limit: '4mb' }));

  const resource = `${config.publicUrl}${MCP_PATH}`;
  const authServer = `${config.supabaseUrl}/auth/v1`;
  const resourceMetadataPath = `/.well-known/oauth-protected-resource${MCP_PATH}`;

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  // RFC 9728 protected-resource metadata: tells MCP clients which authorization server
  // issues tokens for this resource. Served at the path-suffixed location (the spec's
  // default for /mcp) and at the root, for clients that only probe the root.
  const protectedResource = (_req: Request, res: Response) => {
    res.json({
      resource,
      authorization_servers: [authServer],
      bearer_methods_supported: ['header'],
      resource_name: 'Jotter'
    });
  };
  app.get(resourceMetadataPath, protectedResource);
  app.get('/.well-known/oauth-protected-resource', protectedResource);

  const bearer = requireBearerAuth({
    verifier,
    resourceMetadataUrl: `${config.publicUrl}${resourceMetadataPath}`
  });

  // Stateless Streamable HTTP: a fresh server + transport per request, so there is no
  // session state to lose on restart and nothing shared between users.
  app.post(MCP_PATH, bearer, async (req, res) => {
    const auth = req.auth!;
    const { userId } = auth.extra as JotterAuthExtra;
    const api = new NotesApi(createUserClient(config, auth.token), userId);
    const server = createJotterMcpServer(api, config.appUrl);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      console.error('MCP request failed:', e);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null
        });
      }
    }
  });

  // Stateless mode has no server-initiated stream or session to delete.
  const methodNotAllowed = (_req: Request, res: Response) => {
    res
      .status(405)
      .set('Allow', 'POST')
      .json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
  };
  app.get(MCP_PATH, bearer, methodNotAllowed);
  app.delete(MCP_PATH, bearer, methodNotAllowed);

  return app;
}
