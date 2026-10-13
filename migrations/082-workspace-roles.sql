-- Tenant-owned editable role definitions. Identity, API keys and asynchronous actors use current grants.
CREATE TABLE workspace_roles (
 tenant text NOT NULL REFERENCES tenants(id), id text NOT NULL CHECK(id ~ '^[a-z][a-z0-9_]{0,31}$'),
 data jsonb NOT NULL, builtin boolean NOT NULL DEFAULT false, revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),
 PRIMARY KEY(tenant,id)
);
ALTER TABLE workspace_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY core_tenant_scope ON workspace_roles
 USING(current_setting('rac.system',true)='on' OR tenant=nullif(current_setting('rac.tenant',true),''))
 WITH CHECK(current_setting('rac.system',true)='on' OR tenant=nullif(current_setting('rac.tenant',true),''));
CREATE FUNCTION seed_workspace_roles(t text) RETURNS void LANGUAGE sql AS $fn$
 INSERT INTO workspace_roles(tenant,id,data,builtin) VALUES
(t,'owner',jsonb_build_object('name',jsonb_build_object('en-GB','Owner','de-DE','Inhaber','es-ES','Propietario','fr-FR','Propriétaire'),'permissions','["overview.read", "assistant.use", "automation.read", "automation.manage", "channels.read", "channels.manage", "developer.read", "developer.manage", "environments.read", "environments.manage", "knowledge.write", "ai.manage", "apps.read", "pos.use", "b2b.read", "b2b.manage", "catalog.read", "catalog.write", "orders.read", "orders.write", "customers.read", "customers.pii", "customers.write", "documents.read", "documents.create", "payments.read", "payments.manage", "team.manage", "settings.read", "settings.write", "apps.manage", "knowledge.read"]'::jsonb,'active',true),true),
(t,'admin',jsonb_build_object('name',jsonb_build_object('en-GB','Admin','de-DE','Administrator','es-ES','Administrador','fr-FR','Administrateur'),'permissions','["overview.read", "assistant.use", "automation.read", "automation.manage", "channels.read", "channels.manage", "developer.read", "developer.manage", "environments.read", "environments.manage", "knowledge.write", "ai.manage", "apps.read", "pos.use", "b2b.read", "b2b.manage", "catalog.read", "catalog.write", "orders.read", "orders.write", "customers.read", "customers.pii", "customers.write", "documents.read", "documents.create", "payments.read", "payments.manage", "team.manage", "settings.read", "settings.write", "apps.manage", "knowledge.read"]'::jsonb,'active',true),true),
(t,'editor',jsonb_build_object('name',jsonb_build_object('en-GB','Editor','de-DE','Redakteur','es-ES','Editor','fr-FR','Éditeur'),'permissions','["catalog.read", "orders.read", "payments.read", "settings.read", "knowledge.read", "overview.read", "assistant.use", "automation.read", "channels.read", "environments.read", "apps.read", "catalog.write", "knowledge.write"]'::jsonb,'active',true),true),
(t,'viewer',jsonb_build_object('name',jsonb_build_object('en-GB','Viewer','de-DE','Leser','es-ES','Lector','fr-FR','Lecteur'),'permissions','["catalog.read", "orders.read", "payments.read", "settings.read", "knowledge.read", "overview.read", "assistant.use", "automation.read", "channels.read", "environments.read", "apps.read"]'::jsonb,'active',true),true) ON CONFLICT DO NOTHING;
$fn$;
SELECT seed_workspace_roles(id) FROM tenants;
CREATE FUNCTION initialize_workspace_roles() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN PERFORM seed_workspace_roles(NEW.id); RETURN NEW; END $fn$;
CREATE TRIGGER workspace_role_defaults AFTER INSERT ON tenants FOR EACH ROW EXECUTE FUNCTION initialize_workspace_roles();
ALTER TABLE memberships DROP CONSTRAINT memberships_role_check;
ALTER TABLE user_invites DROP CONSTRAINT user_invites_role_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_role_tenant_fk FOREIGN KEY(tenant,role) REFERENCES workspace_roles(tenant,id);
ALTER TABLE user_invites ADD CONSTRAINT user_invites_role_tenant_fk FOREIGN KEY(tenant,role) REFERENCES workspace_roles(tenant,id);
-- security_invoker preserves the underlying table's forced RLS and current actor. Missing/paused roles deny, including explicit overrides.
CREATE VIEW membership_grants WITH (security_invoker=true) AS
 SELECT m.user_id,m.tenant,m.role,m.active AND coalesce((r.data->>'active')::boolean,false) AS active,
 CASE WHEN m.role='owner' THEN 'null'::jsonb ELSE coalesce(nullif(m.permissions,'null'::jsonb),r.data->'permissions','[]'::jsonb) END AS permissions
 FROM memberships m JOIN workspace_roles r ON r.tenant=m.tenant AND r.id=m.role;
-- Roles use the same append-only history owner. Restoring re-runs current delegation checks.
ALTER FUNCTION entity_history_snapshot(text,text,text) RENAME TO entity_history_snapshot_before_roles;
CREATE FUNCTION entity_history_snapshot(kind text,t text,k text) RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE s jsonb;
BEGIN
 IF kind='role' THEN SELECT to_jsonb(r)-'tenant' INTO s FROM workspace_roles r WHERE tenant=t AND id=k; RETURN s; END IF;
 RETURN entity_history_snapshot_before_roles(kind,t,k);
END $fn$;
CREATE TRIGGER history_before BEFORE INSERT OR UPDATE OR DELETE ON workspace_roles FOR EACH ROW EXECUTE FUNCTION capture_entity_history('role','id');
CREATE TRIGGER history_after AFTER INSERT OR UPDATE OR DELETE ON workspace_roles FOR EACH ROW EXECUTE FUNCTION capture_entity_history('role','id');

DO $fn$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='vendune_runtime') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE,REFERENCES ON workspace_roles TO vendune_runtime;
  GRANT SELECT ON membership_grants TO vendune_runtime;
 END IF;
END $fn$;
