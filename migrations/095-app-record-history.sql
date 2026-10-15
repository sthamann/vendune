-- Shared immutable app record versions; page editors and existing apps use this same owner.
CREATE TABLE app_record_versions (
 tenant text NOT NULL, app text NOT NULL, entity text NOT NULL, record_id text NOT NULL,
 revision bigint NOT NULL, fields jsonb NOT NULL, read_scopes jsonb NOT NULL, actor text, source text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant,app,entity,record_id,revision),
 FOREIGN KEY(tenant,app) REFERENCES app_packages(tenant,id) ON DELETE CASCADE
);
ALTER TABLE app_record_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_record_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY app_record_version_scope ON app_record_versions
 USING(tenant=nullif(current_setting('rac.tenant',true),''))
 WITH CHECK(tenant=nullif(current_setting('rac.tenant',true),''));
CREATE INDEX app_record_versions_retention ON app_record_versions(tenant,app,created_at);
DO $fn$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='veyndo_runtime') THEN
  GRANT SELECT,INSERT,DELETE ON app_record_versions TO veyndo_runtime;
 END IF;
END $fn$;
