-- Revoke anonymous access to the GraphQL endpoint to prevent
-- schema introspection by unauthenticated visitors. The app uses
-- the PostgREST API (not GraphQL), so this has no functional impact.
REVOKE USAGE ON SCHEMA graphql_public FROM anon;
REVOKE ALL ON FUNCTION graphql_public.graphql FROM anon;