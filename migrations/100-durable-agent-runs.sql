-- Operational continuation belongs to the existing proposal/task ledger, never a release unit.
ALTER TABLE tasks
 ADD COLUMN run_state text CHECK(run_state IN ('queued','running','ready','failed','uncertain','cancelled')),
 ADD COLUMN run_request jsonb,
 ADD COLUMN run_actor text,
 ADD COLUMN run_key text,
 ADD COLUMN run_fingerprint text,
 ADD COLUMN run_scopes jsonb,
 ADD COLUMN run_credential text,
 ADD COLUMN run_personal boolean NOT NULL DEFAULT false,
 ADD COLUMN run_checkpoint jsonb NOT NULL DEFAULT '{}',
 ADD COLUMN run_pending text,
 ADD COLUMN run_lease text,
 ADD COLUMN run_until timestamptz,
 ADD COLUMN run_revision bigint NOT NULL DEFAULT 1,
 ADD COLUMN run_error jsonb,
 ADD COLUMN run_updated timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN conversation_id text,
 ADD CONSTRAINT tasks_conversation_scope FOREIGN KEY(tenant,conversation_id) REFERENCES conversations(tenant,id),
 ADD CONSTRAINT tasks_run_request_limit CHECK(octet_length(run_request::text)<=32768),
 ADD CONSTRAINT tasks_run_checkpoint_limit CHECK(octet_length(run_checkpoint::text)<=1048576);
CREATE INDEX tasks_run_claim ON tasks(run_updated,tenant,id) WHERE run_state IN ('queued','running');
CREATE UNIQUE INDEX tasks_one_conversation_run ON tasks(tenant,conversation_id)
 WHERE conversation_id IS NOT NULL AND run_state IN ('queued','running','uncertain');

ALTER TABLE conversations ADD COLUMN owner_id text;
CREATE INDEX conversations_actor ON conversations(tenant,owner_id,created_at DESC);
CREATE INDEX tasks_actor_recent ON tasks(tenant,run_actor,created_at DESC);
CREATE INDEX tasks_tenant_active_run ON tasks(tenant,run_state) WHERE run_state IN ('queued','running','uncertain');
CREATE UNIQUE INDEX tasks_run_request_key ON tasks(tenant,run_actor,run_key) WHERE run_key IS NOT NULL;

-- The existing transactional outbox is the single progress-event owner for every transition.
CREATE FUNCTION emit_agent_run_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.run_state IS NOT NULL AND (TG_OP='INSERT' OR NEW.run_state IS DISTINCT FROM OLD.run_state) THEN
  INSERT INTO outbox(tenant,kind,data) VALUES(NEW.tenant,'intelligence.run.changed',
   jsonb_build_object('taskId',NEW.id,'state',NEW.run_state,'revision',NEW.run_revision));
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER tasks_run_progress AFTER INSERT OR UPDATE OF run_state ON tasks
 FOR EACH ROW EXECUTE FUNCTION emit_agent_run_state();
