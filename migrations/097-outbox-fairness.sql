-- Scheduling metadata for the existing outbox, not another event queue or payload store.
CREATE TABLE outbox_tenant_dispatch (
 tenant text PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
 served_order bigint NOT NULL DEFAULT 0 CHECK(served_order>=0)
);
ALTER TABLE outbox_tenant_dispatch ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_tenant_dispatch FORCE ROW LEVEL SECURITY;
CREATE POLICY core_tenant_scope ON outbox_tenant_dispatch
 USING(current_setting('rac.system',true)='on' OR tenant=nullif(current_setting('rac.tenant',true),''))
 WITH CHECK(current_setting('rac.system',true)='on' OR tenant=nullif(current_setting('rac.tenant',true),''));
CREATE SEQUENCE outbox_dispatch_sequence AS bigint;
ALTER SEQUENCE outbox_dispatch_sequence OWNED BY outbox_tenant_dispatch.served_order;
CREATE INDEX outbox_tenant_dispatch_order ON outbox_tenant_dispatch(served_order,tenant);
CREATE INDEX outbox_tenant_ready ON outbox(tenant,id) WHERE delivered_at IS NULL AND dead_letter_at IS NULL;
INSERT INTO outbox_tenant_dispatch(tenant) SELECT DISTINCT tenant FROM outbox;
CREATE FUNCTION register_outbox_tenant() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 INSERT INTO public.outbox_tenant_dispatch(tenant) VALUES(NEW.tenant) ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
CREATE TRIGGER register_outbox_tenant AFTER INSERT ON outbox FOR EACH ROW EXECUTE FUNCTION register_outbox_tenant();
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='veyndo_runtime') THEN
  GRANT SELECT,INSERT,UPDATE,DELETE ON outbox_tenant_dispatch TO veyndo_runtime;
  GRANT USAGE,SELECT ON SEQUENCE outbox_dispatch_sequence TO veyndo_runtime;
 END IF;
END $$;
