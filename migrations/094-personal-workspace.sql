-- Personal Studio arrangements are actor-owned operational state, never shop release units.
CREATE TABLE studio_workspaces (
 tenant text NOT NULL, user_id text NOT NULL,
 revision bigint NOT NULL CHECK(revision>0), data jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant,user_id),
 FOREIGN KEY(user_id,tenant) REFERENCES memberships(user_id,tenant) ON DELETE CASCADE,
 CHECK(pg_column_size(data)<=32768)
);
CREATE TABLE studio_workspace_versions (
 tenant text NOT NULL, user_id text NOT NULL, revision bigint NOT NULL,
 data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant,user_id,revision),
 FOREIGN KEY(tenant,user_id) REFERENCES studio_workspaces(tenant,user_id) ON DELETE CASCADE
);
ALTER TABLE studio_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_workspaces FORCE ROW LEVEL SECURITY;
ALTER TABLE studio_workspace_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_workspace_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY personal_workspace ON studio_workspaces
 USING(tenant=nullif(current_setting('rac.tenant',true),'') AND user_id=nullif(current_setting('rac.actor',true),''))
 WITH CHECK(tenant=nullif(current_setting('rac.tenant',true),'') AND user_id=nullif(current_setting('rac.actor',true),''));
CREATE POLICY personal_workspace_version ON studio_workspace_versions
 USING(tenant=nullif(current_setting('rac.tenant',true),'') AND user_id=nullif(current_setting('rac.actor',true),''))
 WITH CHECK(tenant=nullif(current_setting('rac.tenant',true),'') AND user_id=nullif(current_setting('rac.actor',true),''));
DO $fn$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='veyndo_runtime') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON studio_workspaces,studio_workspace_versions TO veyndo_runtime;
 END IF;
END $fn$;
