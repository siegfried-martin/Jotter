// Runtime configuration, read once from the environment (see .env.example).

export interface Config {
  host: string;
  port: number;
  /** Public origin of this server, e.g. https://jotter.marstol.com (no trailing slash). */
  publicUrl: string;
  /** Origin of the Jotter SPA, for links back to notes. */
  appUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var ${name} (see .env.example)`);
  return value;
}

const stripSlash = (url: string) => url.replace(/\/+$/, '');

export function loadConfig(): Config {
  return {
    host: process.env.HOST?.trim() || '127.0.0.1',
    port: Number(process.env.PORT) || 8787,
    publicUrl: stripSlash(process.env.PUBLIC_URL?.trim() || 'http://localhost:8787'),
    appUrl: stripSlash(process.env.APP_URL?.trim() || 'http://localhost:5174'),
    supabaseUrl: stripSlash(required('SUPABASE_URL')),
    supabaseAnonKey: required('SUPABASE_ANON_KEY')
  };
}
