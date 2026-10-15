-- Fixed-size app storage. Apply with old Core writers stopped; 102 moves and verifies old data.
CREATE TABLE app_models (
 tenant text NOT NULL, app text NOT NULL, entity text NOT NULL,
 version text NOT NULL, definition jsonb NOT NULL,
 PRIMARY KEY(tenant,app,entity),
 FOREIGN KEY(tenant,app) REFERENCES app_packages(tenant,id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE app_records (
 tenant text NOT NULL, app text NOT NULL, entity text NOT NULL, id text NOT NULL,
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>0), version text NOT NULL,
 fields jsonb NOT NULL CHECK(jsonb_typeof(fields)='object'),
 storage_rows bigint NOT NULL DEFAULT 1, storage_bytes bigint NOT NULL DEFAULT 0,
 PRIMARY KEY(tenant,app,entity,id),
 FOREIGN KEY(tenant,app,entity) REFERENCES app_models(tenant,app,entity)
);
CREATE TABLE app_record_indexes (
 tenant text NOT NULL, app text NOT NULL, entity text NOT NULL, field text NOT NULL,
 record_id text NOT NULL, value jsonb NOT NULL,
 value_hash bytea GENERATED ALWAYS AS (sha256(jsonb_send(value))) STORED,
 is_unique boolean NOT NULL,
 PRIMARY KEY(tenant,app,entity,field,record_id),
 FOREIGN KEY(tenant,app,entity,record_id) REFERENCES app_records(tenant,app,entity,id) ON DELETE CASCADE
);
CREATE INDEX app_record_lookup ON app_record_indexes(tenant,app,entity,field,value_hash,record_id);
CREATE UNIQUE INDEX app_record_unique ON app_record_indexes(tenant,app,entity,field,value_hash) WHERE is_unique;
CREATE TABLE app_record_references (
 tenant text NOT NULL, app text NOT NULL, entity text NOT NULL, record_id text NOT NULL,
 field text NOT NULL, position integer NOT NULL CHECK(position BETWEEN 1 AND 100),
 target_entity text, target_id text,
 product_id text, customer_id text, order_id text, channel_id text,
 company_id text, unit_id text, asset_id text,
 PRIMARY KEY(tenant,app,entity,record_id,field,position),
 CHECK(num_nonnulls(target_id,product_id,customer_id,order_id,channel_id,company_id,unit_id,asset_id)=1),
 CHECK((target_entity IS NULL)=(target_id IS NULL)),
 FOREIGN KEY(tenant,app,entity,record_id) REFERENCES app_records(tenant,app,entity,id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(tenant,app,target_entity,target_id) REFERENCES app_records(tenant,app,entity,id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(tenant,product_id) REFERENCES products(tenant,id),
 FOREIGN KEY(tenant,customer_id) REFERENCES customers(tenant,id),
 FOREIGN KEY(tenant,order_id) REFERENCES orders(tenant,id),
 FOREIGN KEY(tenant,channel_id) REFERENCES sales_channels(tenant,id),
 FOREIGN KEY(tenant,company_id) REFERENCES b2b_companies(tenant,id),
 FOREIGN KEY(tenant,unit_id) REFERENCES b2b_units(tenant,id),
 FOREIGN KEY(tenant,asset_id) REFERENCES product_assets(tenant,id)
);
CREATE INDEX app_record_reference_target ON app_record_references(tenant,app,target_entity,target_id);
-- These fixed indexes also keep native parent deletion from scanning every app reference.
CREATE INDEX app_record_reference_product ON app_record_references(tenant,product_id) WHERE product_id IS NOT NULL;
CREATE INDEX app_record_reference_customer ON app_record_references(tenant,customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX app_record_reference_order ON app_record_references(tenant,order_id) WHERE order_id IS NOT NULL;
CREATE INDEX app_record_reference_channel ON app_record_references(tenant,channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX app_record_reference_company ON app_record_references(tenant,company_id) WHERE company_id IS NOT NULL;
CREATE INDEX app_record_reference_unit ON app_record_references(tenant,unit_id) WHERE unit_id IS NOT NULL;
CREATE INDEX app_record_reference_asset ON app_record_references(tenant,asset_id) WHERE asset_id IS NOT NULL;

DO $fn$ DECLARE n text; role_name name; BEGIN
 FOREACH n IN ARRAY ARRAY['app_models','app_records','app_record_indexes','app_record_references'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY; ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',n,n);
  EXECUTE format('CREATE POLICY core_tenant_scope ON public.%I USING(tenant=current_setting(''rac.tenant'',true) OR current_setting(''rac.system'',true)=''on'') WITH CHECK(tenant=current_setting(''rac.tenant'',true) OR current_setting(''rac.system'',true)=''on'')',n);
  EXECUTE format('CREATE POLICY authenticated_scope ON public.%I AS RESTRICTIVE USING(coalesce((SELECT (public.veyndo_scope_guard()->>''system'')::boolean),false) OR tenant=(SELECT public.veyndo_scope_guard()->>''tenant'')) WITH CHECK(coalesce((SELECT (public.veyndo_scope_guard()->>''system'')::boolean),false) OR tenant=(SELECT public.veyndo_scope_guard()->>''tenant''))',n);
  -- Metadata is writable only by the trusted native schema owner. Projections only by triggers.
  IF n<>'app_records' THEN
   FOREACH role_name IN ARRAY ARRAY['INSERT','UPDATE','DELETE']::name[] LOOP
    EXECUTE format('CREATE POLICY managed_write_%s ON public.%I AS RESTRICTIVE FOR %s %s',lower(role_name),n,role_name,
     CASE WHEN role_name<>'INSERT' THEN 'USING('||CASE WHEN n='app_models' THEN 'coalesce((SELECT (public.veyndo_scope_guard()->>''system'')::boolean),false)' ELSE 'pg_trigger_depth()>0' END||') ' ELSE '' END||
     CASE WHEN role_name<>'DELETE' THEN 'WITH CHECK('||CASE WHEN n='app_models' THEN 'coalesce((SELECT (public.veyndo_scope_guard()->>''system'')::boolean),false)' ELSE 'pg_trigger_depth()>0' END||')' ELSE '' END);
   END LOOP;
  END IF;
 END LOOP;
 -- Configure already provisioned serving roles without adding ownership or bypass privileges.
 FOR role_name IN SELECT system_role FROM veyndo_authority.configuration UNION SELECT tenant_login FROM veyndo_authority.configuration LOOP
  IF role_name IS NOT NULL THEN
   EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE,REFERENCES ON app_models,app_records,app_record_indexes,app_record_references TO %I',role_name);
  END IF;
 END LOOP;
END $fn$;

CREATE FUNCTION app_record_prepare() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $fn$
DECLARE model jsonb; f jsonb; v jsonb; normalized jsonb:='{}'; target text; pos integer; relation_bytes bigint:=0; relation_rows bigint:=0;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.tenant,NEW.app,NEW.entity,NEW.id) IS DISTINCT FROM (OLD.tenant,OLD.app,OLD.entity,OLD.id) THEN
  RAISE EXCEPTION 'App record identity cannot change' USING ERRCODE='42501';
 END IF;
 SELECT definition,version INTO STRICT model,NEW.version FROM app_models WHERE tenant=NEW.tenant AND app=NEW.app AND entity=NEW.entity;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(NEW.fields) k WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(model->'fields') AS declared(field_definition) WHERE declared.field_definition->>'name'=k)) THEN
  RAISE EXCEPTION 'Unknown app field' USING ERRCODE='23514';
 END IF;
 FOR f IN SELECT value FROM jsonb_array_elements(model->'fields') LOOP
  v:=coalesce(NEW.fields->(f->>'name'),'null'::jsonb);
  IF v='null' THEN
   IF coalesce((f->>'required')::boolean,false) THEN RAISE EXCEPTION 'Required app field missing' USING ERRCODE='23502'; END IF;
  ELSIF coalesce((f->>'translatable')::boolean,false) THEN
   IF jsonb_typeof(v)<>'object' THEN RAISE EXCEPTION 'Translation object required' USING ERRCODE='23514'; END IF;
  ELSIF f->>'kind'='integer' THEN
   IF jsonb_typeof(v)<>'number' OR v::text!~'^-?[0-9]+$' THEN RAISE EXCEPTION 'Integer required' USING ERRCODE='23514'; END IF;
   PERFORM (v::text)::bigint;
  ELSIF f->>'kind'='boolean' THEN
   IF jsonb_typeof(v)<>'boolean' THEN RAISE EXCEPTION 'Boolean required' USING ERRCODE='23514'; END IF;
  ELSIF f->>'kind'='relations' THEN
   IF jsonb_typeof(v)<>'array' OR jsonb_array_length(v)>100 THEN RAISE EXCEPTION 'Relation list required' USING ERRCODE='23514'; END IF;
   IF (SELECT count(*)<>count(DISTINCT x) FROM jsonb_array_elements(v) x) THEN RAISE EXCEPTION 'Duplicate app relation' USING ERRCODE='23505'; END IF;
   pos:=0;
   FOR target IN SELECT jsonb_array_elements_text(v) LOOP
    pos:=pos+1;
    relation_bytes:=relation_bytes+octet_length(jsonb_build_object('tenant',NEW.tenant,'source_id',NEW.id,'target_id',target,'position',pos)::text);
    relation_rows:=relation_rows+1;
   END LOOP;
  ELSIF f->>'kind' NOT IN ('json','money','richtext') AND jsonb_typeof(v)<>'string' THEN
   RAISE EXCEPTION 'Text required' USING ERRCODE='23514';
  END IF;
  normalized:=normalized||jsonb_build_object(f->>'name',v);
 END LOOP;
 NEW.fields:=normalized;
 NEW.storage_rows:=1+relation_rows;
 NEW.storage_bytes:=octet_length((normalized||jsonb_build_object('tenant',NEW.tenant,'id',NEW.id,'revision',NEW.revision))::text)+relation_bytes;
 RETURN NEW;
END $fn$;

CREATE FUNCTION app_record_project() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $fn$
DECLARE f jsonb; v jsonb; target text; pos integer; shop text; package text; delta_rows bigint; delta_bytes bigint;
BEGIN
 shop:=CASE WHEN TG_OP='DELETE' THEN OLD.tenant ELSE NEW.tenant END;
 package:=CASE WHEN TG_OP='DELETE' THEN OLD.app ELSE NEW.app END;
 delta_rows:=(CASE WHEN TG_OP='DELETE' THEN 0 ELSE NEW.storage_rows END)-(CASE WHEN TG_OP='INSERT' THEN 0 ELSE OLD.storage_rows END);
 delta_bytes:=(CASE WHEN TG_OP='DELETE' THEN 0 ELSE NEW.storage_bytes END)-(CASE WHEN TG_OP='INSERT' THEN 0 ELSE OLD.storage_bytes END);
 UPDATE app_storage_usage SET rows=rows+delta_rows,bytes=bytes+delta_bytes,updated_at=now() WHERE tenant=shop AND app=package;
 IF NOT FOUND THEN RAISE EXCEPTION 'App storage quota is not initialized' USING ERRCODE='42501'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 DELETE FROM app_record_indexes WHERE tenant=NEW.tenant AND app=NEW.app AND entity=NEW.entity AND record_id=NEW.id;
 DELETE FROM app_record_references WHERE tenant=NEW.tenant AND app=NEW.app AND entity=NEW.entity AND record_id=NEW.id;
 FOR f IN SELECT value FROM app_models m,jsonb_array_elements(m.definition->'fields') WHERE m.tenant=NEW.tenant AND m.app=NEW.app AND m.entity=NEW.entity LOOP
  v:=NEW.fields->(f->>'name');
  IF v='null'::jsonb OR v IS NULL THEN CONTINUE; END IF;
  IF coalesce((f->>'indexed')::boolean,false) OR coalesce((f->>'unique')::boolean,false) THEN
   INSERT INTO app_record_indexes(tenant,app,entity,field,record_id,value,is_unique) VALUES(NEW.tenant,NEW.app,NEW.entity,f->>'name',NEW.id,v,coalesce((f->>'unique')::boolean,false));
  END IF;
  IF f->>'kind'='relations' THEN
   pos:=0;
   FOR target IN SELECT jsonb_array_elements_text(v) LOOP
    pos:=pos+1;
    INSERT INTO app_record_references(tenant,app,entity,record_id,field,position,target_entity,target_id) VALUES(NEW.tenant,NEW.app,NEW.entity,NEW.id,f->>'name',pos,f->>'references',target);
   END LOOP;
  ELSIF f->>'references' IS NOT NULL THEN
   INSERT INTO app_record_references(tenant,app,entity,record_id,field,position,target_entity,target_id) VALUES(NEW.tenant,NEW.app,NEW.entity,NEW.id,f->>'name',1,f->>'references',v#>>'{}');
  ELSIF f->>'coreReference' IS NOT NULL OR f->>'kind' IN ('image','file') THEN
   target:=CASE WHEN f->>'kind' IN ('image','file') THEN 'asset' ELSE f->>'coreReference' END;
   INSERT INTO app_record_references(tenant,app,entity,record_id,field,position,product_id,customer_id,order_id,channel_id,company_id,unit_id,asset_id)
    VALUES(NEW.tenant,NEW.app,NEW.entity,NEW.id,f->>'name',1,
     CASE WHEN target='product' THEN v#>>'{}' END,CASE WHEN target='customer' THEN v#>>'{}' END,
     CASE WHEN target='order' THEN v#>>'{}' END,CASE WHEN target='salesChannel' THEN v#>>'{}' END,
     CASE WHEN target='b2bCompany' THEN v#>>'{}' END,CASE WHEN target='b2bUnit' THEN v#>>'{}' END,
     CASE WHEN target='asset' THEN v#>>'{}' END);
  END IF;
 END LOOP;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION app_record_prepare(),app_record_project() FROM PUBLIC;
CREATE TRIGGER app_record_prepare BEFORE INSERT OR UPDATE ON app_records FOR EACH ROW EXECUTE FUNCTION app_record_prepare();
CREATE TRIGGER app_record_project AFTER INSERT OR UPDATE OR DELETE ON app_records FOR EACH ROW EXECUTE FUNCTION app_record_project();
