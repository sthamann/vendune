-- Keep data and the original migration ledger; update the active identity contracts.
CREATE OR REPLACE FUNCTION capture_entity_history() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE rowdata jsonb;t text;k text;s jsonb;kind text;
BEGIN
 rowdata:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 t:=rowdata->>'tenant';kind:=TG_ARGV[0];k:=CASE WHEN TG_ARGV[1]='tenant' THEN 'base' ELSE rowdata->>TG_ARGV[1] END;
 IF TG_WHEN='BEFORE' THEN
  IF NOT EXISTS(SELECT 1 FROM entity_history WHERE tenant=t AND entity=kind AND entity_id=k AND transaction_id=txid_current()) THEN
   s:=entity_history_snapshot(kind,t,k);
   INSERT INTO entity_history(tenant,entity,entity_id,transaction_id,actor,source,reason,before_state)
   VALUES(t,kind,k,txid_current(),nullif(current_setting('sellama.actor',true),''),coalesce(nullif(current_setting('sellama.source',true),''),'system'),nullif(current_setting('sellama.reason',true),''),s);
  END IF;
 ELSIF EXISTS(SELECT 1 FROM entity_history WHERE tenant=t AND entity=kind AND entity_id=k AND transaction_id=txid_current() AND NOT finalized) THEN
  s:=entity_history_snapshot(kind,t,k);
  UPDATE entity_history SET after_state=s,finalized=true WHERE tenant=t AND entity=kind AND entity_id=k AND transaction_id=txid_current();
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $fn$;

CREATE OR REPLACE FUNCTION notify_outbox_cache() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_notify('sellama_read_invalidation',json_build_object('tenant',NEW.tenant)::text);
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION notify_work_ready() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' OR coalesce(to_jsonb(NEW)->>'state',to_jsonb(NEW)->>'status')='queued' OR TG_TABLE_NAME='outbox' AND to_jsonb(NEW)->>'delivered_at' IS NULL THEN
  PERFORM pg_notify('sellama_work_ready',TG_TABLE_NAME);
 END IF;
 RETURN NEW;
END $$;

-- Rename the existing diagnostic aggregate without replacing its grants or behavior.
DO $identity$
DECLARE old_name text;
BEGIN
 IF to_regprocedure('public.sellama_merge_http_counts(jsonb,jsonb)') IS NULL THEN
  SELECT p.proname INTO STRICT old_name FROM pg_proc p
   JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname LIKE '%\_merge_http_counts' ESCAPE '\'
     AND p.proargtypes='3802 3802'::oidvector;
  EXECUTE format('ALTER FUNCTION public.%I(jsonb,jsonb) RENAME TO sellama_merge_http_counts',old_name);
 END IF;
END $identity$;
