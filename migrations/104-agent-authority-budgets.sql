-- Agent credentials reuse integration_keys; allocation counters are operational,
-- never sandbox configuration or a rollback/release unit.
ALTER TABLE tenants ADD COLUMN agents_stopped boolean NOT NULL DEFAULT false;
ALTER TABLE tenants ADD COLUMN agents_revision bigint NOT NULL DEFAULT 1 CHECK(agents_revision>0);
-- Original human delegation remains run_actor; immutable request metadata records
-- the distinct authenticated agent principal, including after credential expiry.
DROP INDEX tasks_run_request_key;
CREATE UNIQUE INDEX tasks_run_request_key ON tasks(tenant,run_actor,(coalesce(run_request->>'agentId','')),run_key) WHERE run_key IS NOT NULL;
ALTER TABLE integration_keys ADD COLUMN agent_budget jsonb;
ALTER TABLE integration_keys ADD COLUMN agent_tokens_allocated bigint NOT NULL DEFAULT 0 CHECK(agent_tokens_allocated>=0);
ALTER TABLE integration_keys ADD COLUMN agent_cost_allocated bigint NOT NULL DEFAULT 0 CHECK(agent_cost_allocated>=0);
ALTER TABLE integration_keys ADD CONSTRAINT agent_budget_shape CHECK(agent_budget IS NULL OR (
 jsonb_typeof(agent_budget)='object' AND agent_budget ?& ARRAY['provider','model','tokens','costMicros','pricePerMillionMicros']
 AND agent_budget->>'provider' IN ('openai','anthropic','ollama')
 AND jsonb_typeof(agent_budget->'model')='string' AND length(agent_budget->>'model') BETWEEN 1 AND 128
 AND jsonb_typeof(agent_budget->'tokens')='number'
 AND jsonb_typeof(agent_budget->'costMicros')='number'
 AND jsonb_typeof(agent_budget->'pricePerMillionMicros')='number'
 AND (agent_budget->>'tokens')::bigint BETWEEN 1 AND 1000000000000
 AND (agent_budget->>'costMicros')::bigint BETWEEN 1 AND 1000000000000
 AND (agent_budget->>'pricePerMillionMicros')::bigint BETWEEN 1 AND 1000000000000
 AND app_id IS NULL));
