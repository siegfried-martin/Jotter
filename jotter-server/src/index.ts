import { loadConfig } from './config';
import { createAnonClient } from './supabase';
import { SupabaseTokenVerifier } from './auth/tokenVerifier';
import { createApp, MCP_PATH } from './http/app';

const config = loadConfig();
const app = createApp(config, new SupabaseTokenVerifier(createAnonClient(config)));

app.listen(config.port, config.host, () => {
  console.log(`jotter-server listening on http://${config.host}:${config.port}`);
  console.log(`MCP endpoint: ${config.publicUrl}${MCP_PATH}`);
});
