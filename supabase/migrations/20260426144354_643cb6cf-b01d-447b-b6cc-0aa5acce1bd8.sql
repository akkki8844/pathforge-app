-- Revoke SELECT (and all privileges) from the anon role on every existing
-- table in the public schema so pg_graphql introspection no longer exposes
-- their names/columns to unauthenticated visitors. The application uses
-- authenticated JWTs via supabase-js, so this has no functional impact.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Ensure future tables created in public also don't grant anon access.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;