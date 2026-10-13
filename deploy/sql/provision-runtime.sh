#!/bin/sh
# One-shot post-migration role provisioning. Secrets are passed through psql variables, never echoed.
set -eu
export PGPASSWORD="$DB_PASSWORD"
psql -h postgres -U commerce -d commerce -v ON_ERROR_STOP=1 -v runtime_password="$DB_RUNTIME_PASSWORD" -v connector_password="$DB_CONNECTOR_PASSWORD" <<'SQL'
SELECT 'CREATE ROLE sellama_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS' WHERE NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='sellama_runtime') \gexec
SELECT 'CREATE ROLE sellama_runtime_login LOGIN NOSUPERUSER NOBYPASSRLS' WHERE NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='sellama_runtime_login') \gexec
ALTER ROLE sellama_runtime_login NOSUPERUSER NOBYPASSRLS NOREPLICATION NOCREATEDB NOCREATEROLE CONNECTION LIMIT 80 PASSWORD :'runtime_password';
GRANT sellama_runtime TO sellama_runtime_login;
GRANT CONNECT,CREATE ON DATABASE commerce TO sellama_runtime;
GRANT USAGE,CREATE ON SCHEMA public TO sellama_runtime;
SELECT format('GRANT SELECT,INSERT,UPDATE,DELETE,REFERENCES ON public.%I TO sellama_runtime',tablename) FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'connector_%' \gexec
SELECT format('REVOKE ALL ON public.%I FROM sellama_runtime',tablename) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'connector_%' \gexec
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM sellama_runtime;
GRANT SELECT ON public.membership_grants TO sellama_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO sellama_runtime;


SELECT format('GRANT sellama_runtime TO %I',current_user) \gexec
SELECT format('ALTER TABLE public.%I OWNER TO sellama_runtime',c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname ~ '^app_[a-f0-9]{16}([a-f0-9]{8})?_' AND EXISTS(SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid AND p.polname='tenant_scope') \gexec
SELECT 'CREATE ROLE sellama_connectors LOGIN NOSUPERUSER NOBYPASSRLS' WHERE NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='sellama_connectors') \gexec
ALTER ROLE sellama_connectors NOSUPERUSER NOBYPASSRLS NOREPLICATION NOCREATEDB NOCREATEROLE CONNECTION LIMIT 16 PASSWORD :'connector_password';
GRANT CONNECT ON DATABASE commerce TO sellama_connectors;
GRANT USAGE ON SCHEMA public TO sellama_connectors;
GRANT SELECT ON tenants,commerce_migrations TO sellama_connectors;
GRANT USAGE,SELECT,UPDATE ON connector_changes_seq_seq TO sellama_connectors;
SELECT format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO sellama_connectors',tablename) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'connector_%' \gexec
SQL
