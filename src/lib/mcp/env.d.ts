// MCP tool files are bundled into a Deno Edge Function where `process.env`
// is available at runtime. Declare the type here so the frontend TS build
// (which doesn't include @types/node) accepts these imports.
declare const process: { env: Record<string, string | undefined> };
