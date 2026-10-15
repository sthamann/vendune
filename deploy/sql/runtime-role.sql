-- Execute with the migration/DB owner before enabling DB_RLS_REQUIRED=true.
-- This group has no password. Create a separate LOGIN via your secret manager,
-- grant this role to it, and use that login only for DATABASE_RUNTIME_URL.
-- Runtime login must inherit this group, but NEVER the migration owner.
CREATE ROLE veyndo_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT CONNECT ON DATABASE :"DBNAME" TO veyndo_runtime;
GRANT USAGE ON SCHEMA public TO veyndo_runtime;
SELECT format('GRANT SELECT,INSERT,UPDATE,DELETE,REFERENCES ON public.%I TO veyndo_runtime',tablename) FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'connector_%' \gexec
GRANT SELECT ON public.membership_grants TO veyndo_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO veyndo_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM veyndo_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO veyndo_runtime;
-- Shared app records/models/projections stay owned by the migration role.
-- Installation changes logical definitions; serving logins need no CREATE or table ownership.
-- For separate authenticated system/tenant logins use the native database-authority
-- configure command documented in docs/authenticated-database-scope.md.
-- Example, after provisioning the LOGIN separately:
-- GRANT veyndo_runtime TO veyndo_runtime_login;
-- DB_RLS_REQUIRED=true
-- DATABASE_RUNTIME_URL=postgres://veyndo_runtime_login:<secret>@<host>/<database>
-- DATABASE_URL remains the migration owner and is not given to apps/browsers.
