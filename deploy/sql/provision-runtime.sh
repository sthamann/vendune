#!/bin/sh
# One-shot post-migration role provisioning. Secrets are passed through psql variables, never echoed.
set -eu
export PGPASSWORD="$DB_PASSWORD"
psql -h postgres -U commerce -d commerce -v ON_ERROR_STOP=1 -v runtime_password="$DB_RUNTIME_PASSWORD" -v connector_password="$DB_CONNECTOR_PASSWORD" <<'SQL'
SELECT 'CREATE ROLE veyndo_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS' WHERE NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='veyndo_runtime') \gexec
SELECT 'CREATE ROLE veyndo_runtime_login LOGIN NOSUPERUSER NOBYPASSRLS' WHERE NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='veyndo_runtime_login') \gexec
ALTER ROLE veyndo_runtime_login NOSUPERUSER NOBYPASSRLS NOREPLICATION NOCREATEDB NOCREATEROLE CONNECTION LIMIT 80 PASSWORD :'runtime_password';
GRANT veyndo_runtime TO veyndo_runtime_login;
GRANT CONNECT,CREATE ON DATABASE commerce TO veyndo_runtime;
GRANT USAGE,CREATE ON SCHEMA public TO veyndo_runtime;
SELECT format('GRANT SELECT,INSERT,UPDATE,DELETE,REFERENCES ON public.%I TO veyndo_runtime',tablename) FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'connector_%' \gexec
SELECT format('REVOKE ALL ON public.%I FROM veyndo_runtime',tablename) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'connector_%' \gexec
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM veyndo_runtime;
GRANT SELECT ON public.membership_grants TO veyndo_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO veyndo_runtime;


SELECT format('GRANT veyndo_runtime TO %I',current_user) \gexec
SELECT format('ALTER TABLE public.%I OWNER TO veyndo_runtime',c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname ~ '^app_[a-f0-9]{16}([a-f0-9]{8})?_' AND EXISTS(SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid AND p.polname='tenant_scope') \gexec
SELECT 'CREATE ROLE veyndo_connectors LOGIN NOSUPERUSER NOBYPASSRLS' WHERE NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='veyndo_connectors') \gexec
ALTER ROLE veyndo_connectors NOSUPERUSER NOBYPASSRLS NOREPLICATION NOCREATEDB NOCREATEROLE CONNECTION LIMIT 16 PASSWORD :'connector_password';
GRANT CONNECT ON DATABASE commerce TO veyndo_connectors;
GRANT USAGE ON SCHEMA public TO veyndo_connectors;
GRANT SELECT ON tenants,commerce_migrations TO veyndo_connectors;
GRANT USAGE,SELECT,UPDATE ON connector_changes_seq_seq TO veyndo_connectors;
SELECT format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO veyndo_connectors',tablename) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'connector_%' \gexec
SQL
