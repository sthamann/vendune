-- Four native subscriber cursors share the original immutable outbox payload.
-- Failure state belongs to each event/subscriber, never a global cursor. No copied event queue.
-- Sequence IDs are NOT commit order. Exact acknowledgement bits, never a high
-- watermark, decide whether a subscriber still needs this event.
ALTER TABLE outbox ADD COLUMN subscriber_mask smallint NOT NULL DEFAULT 0 CHECK(subscriber_mask BETWEEN 0 AND 15);
ALTER TABLE outbox ADD COLUMN dispatch_not_before timestamptz NOT NULL DEFAULT '-infinity';
ALTER TABLE outbox ADD COLUMN dispatch_requires_retry boolean NOT NULL DEFAULT false;
UPDATE outbox SET subscriber_mask=CASE WHEN delivered_at IS NOT NULL THEN 15 ELSE 0 END,
 dispatch_not_before=available_at,dispatch_requires_retry=delivered_at IS NULL AND dead_letter_at IS NOT NULL;
CREATE INDEX outbox_pending_cognition ON outbox(tenant,id) WHERE delivered_at IS NULL AND payload_retired_at IS NULL AND (subscriber_mask & 1::smallint)=0;
CREATE INDEX outbox_pending_apps ON outbox(tenant,id) WHERE delivered_at IS NULL AND payload_retired_at IS NULL AND (subscriber_mask & 2::smallint)=0;
CREATE INDEX outbox_pending_flows ON outbox(tenant,id) WHERE delivered_at IS NULL AND payload_retired_at IS NULL AND (subscriber_mask & 4::smallint)=0;
CREATE INDEX outbox_pending_audit ON outbox(tenant,id) WHERE delivered_at IS NULL AND payload_retired_at IS NULL AND (subscriber_mask & 8::smallint)=0;
CREATE FUNCTION prepare_outbox_delivery() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 NEW.dispatch_not_before=NEW.available_at;
 NEW.dispatch_requires_retry=NEW.dead_letter_at IS NOT NULL;
 RETURN NEW;
END $$;
CREATE TRIGGER prepare_outbox_delivery BEFORE INSERT ON outbox FOR EACH ROW EXECUTE FUNCTION prepare_outbox_delivery();
CREATE TABLE outbox_checkpoints (
 tenant text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 subscriber text NOT NULL CHECK(subscriber IN ('cognition','apps','flows','audit')),
 last_event_id bigint NOT NULL DEFAULT 0 CHECK(last_event_id>=0),
 served_order bigint NOT NULL DEFAULT 0 CHECK(served_order>=0),
 PRIMARY KEY(tenant,subscriber)
);
ALTER TABLE outbox_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_checkpoints FORCE ROW LEVEL SECURITY;
CREATE POLICY core_tenant_scope ON outbox_checkpoints
 USING(current_setting('rac.system',true)='on' OR tenant=nullif(current_setting('rac.tenant',true),''))
 WITH CHECK(current_setting('rac.system',true)='on' OR tenant=nullif(current_setting('rac.tenant',true),''));
CREATE POLICY authenticated_scope ON outbox_checkpoints AS RESTRICTIVE
 USING(coalesce((SELECT (public.veyndo_scope_guard()->>'system')::boolean),false) OR tenant=(SELECT public.veyndo_scope_guard()->>'tenant'))
 WITH CHECK(coalesce((SELECT (public.veyndo_scope_guard()->>'system')::boolean),false) OR tenant=(SELECT public.veyndo_scope_guard()->>'tenant'));
CREATE INDEX outbox_checkpoint_ready ON outbox_checkpoints(subscriber,served_order,tenant);
-- Retry/quarantine belongs to one event and subscriber; it cannot block later events.
CREATE TABLE outbox_subscriber_failures (
 tenant text NOT NULL,
 event_id bigint NOT NULL,
 subscriber text NOT NULL CHECK(subscriber IN ('cognition','apps','flows','audit')),
 attempts integer NOT NULL DEFAULT 1 CHECK(attempts>=0),
 available_at timestamptz NOT NULL DEFAULT now(),
 dead_letter_at timestamptz,
 PRIMARY KEY(tenant,event_id,subscriber),
 FOREIGN KEY(tenant,event_id) REFERENCES outbox(tenant,id) ON DELETE CASCADE
);
ALTER TABLE outbox_subscriber_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_subscriber_failures FORCE ROW LEVEL SECURITY;
CREATE POLICY core_tenant_scope ON outbox_subscriber_failures
 USING(current_setting('rac.system',true)='on' OR tenant=nullif(current_setting('rac.tenant',true),''))
 WITH CHECK(current_setting('rac.system',true)='on' OR tenant=nullif(current_setting('rac.tenant',true),''));
CREATE POLICY authenticated_scope ON outbox_subscriber_failures AS RESTRICTIVE
 USING(coalesce((SELECT (public.veyndo_scope_guard()->>'system')::boolean),false) OR tenant=(SELECT public.veyndo_scope_guard()->>'tenant'))
 WITH CHECK(coalesce((SELECT (public.veyndo_scope_guard()->>'system')::boolean),false) OR tenant=(SELECT public.veyndo_scope_guard()->>'tenant'));
INSERT INTO outbox_checkpoints(tenant,subscriber)
 SELECT t.id,s FROM tenants t CROSS JOIN unnest(ARRAY['cognition','apps','flows','audit']) s;
-- Create schedules before this tenant can publish commerce events. An outbox
-- producer must never touch scheduler rows held by consumers that lock products.
CREATE FUNCTION register_outbox_subscribers() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 INSERT INTO public.outbox_checkpoints(tenant,subscriber)
  SELECT NEW.id,s FROM unnest(ARRAY['cognition','apps','flows','audit']) s;
 RETURN NEW;
END $$;
CREATE TRIGGER register_outbox_subscribers AFTER INSERT ON tenants FOR EACH ROW EXECUTE FUNCTION register_outbox_subscribers();
DO $$ DECLARE c record; BEGIN
 SELECT * INTO c FROM veyndo_authority.configuration;
 IF c.system_role IS NOT NULL THEN
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON outbox_checkpoints,outbox_subscriber_failures TO %I',c.system_role);
 END IF;
 IF c.tenant_login IS NOT NULL THEN
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON outbox_checkpoints,outbox_subscriber_failures TO %I',c.tenant_login);
 END IF;
END $$;

-- Correlation survives asynchronous handoff; no request body or identity secret is stored.
ALTER TABLE outbox ADD COLUMN trace_id text NOT NULL DEFAULT coalesce(nullif(current_setting('veyndo.trace_id',true),''),replace(gen_random_uuid()::text,'-','')) CHECK(trace_id ~ '^[a-f0-9]{32}$');
ALTER TABLE tasks ADD COLUMN run_trace text NOT NULL DEFAULT coalesce(nullif(current_setting('veyndo.trace_id',true),''),replace(gen_random_uuid()::text,'-','')) CHECK(run_trace ~ '^[a-f0-9]{32}$');
