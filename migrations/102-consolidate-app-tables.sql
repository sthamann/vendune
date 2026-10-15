-- Maintenance cutover: stop old writers first. All copying, validation and retirement are atomic.
-- Never run native save: original IDs, NULLs, revisions and immutable histories must survive.
SET LOCAL lock_timeout='10s';
DO $fn$
DECLARE p record; e jsonb; f jsonb; n text; links text; names text[]:='{}'; count_before bigint; count_after bigint; mismatch boolean;
BEGIN
 -- Refuse an accidental rolling cutover: idle pools also count as old writers.
 IF EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()
  AND backend_type='client backend' AND usename IN (SELECT system_role FROM veyndo_authority.configuration UNION SELECT tenant_login FROM veyndo_authority.configuration)) THEN
  RAISE EXCEPTION 'Stop and drain Core HTTP/worker database connections before consolidating app storage';
 END IF;
 LOCK TABLE app_packages IN SHARE ROW EXCLUSIVE MODE;
 FOR p IN SELECT tenant,id,version,manifest FROM app_packages ORDER BY tenant,id LOOP
  PERFORM set_config('rac.tenant',p.tenant,true);
  FOR e IN SELECT value FROM jsonb_array_elements(p.manifest->'entities') LOOP
   n:='app_'||substr(encode(sha256(convert_to(p.tenant||':'||p.id,'UTF8')),'hex'),1,24)||'_'||(e->>'name');
   IF to_regclass(format('public.%I',n)) IS NULL THEN RAISE EXCEPTION 'Missing legacy app model; refusing incomplete migration'; END IF;
   names:=array_append(names,n);
   EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE',n);
   INSERT INTO app_models(tenant,app,entity,version,definition) VALUES(p.tenant,p.id,e->>'name',p.version,e);
   FOR f IN SELECT value FROM jsonb_array_elements(e->'fields') WHERE value->>'kind'='relations' LOOP
    links:='app_'||substr(encode(sha256(convert_to(p.tenant||':'||p.id,'UTF8')),'hex'),1,24)||'_rel_'||substr(encode(sha256(convert_to((e->>'name')||':'||(f->>'name'),'UTF8')),'hex'),1,20);
    IF to_regclass(format('public.%I',links)) IS NULL THEN RAISE EXCEPTION 'Missing legacy app relations'; END IF;
    names:=array_append(names,links);
    EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE',links);
   END LOOP;
  END LOOP;
  -- Retained native app documents share the original aggregate quota; reset only the data being moved.
  INSERT INTO app_storage_usage(tenant,app,rows,bytes)
   SELECT p.tenant,p.id,count(*),coalesce(sum(octet_length(content)+octet_length(snapshot::text)+512),0)::bigint
    FROM order_receipts WHERE tenant=p.tenant AND source_app=p.id
   ON CONFLICT(tenant,app) DO UPDATE SET rows=EXCLUDED.rows,bytes=EXCLUDED.bytes;
 END LOOP;
 FOR p IN SELECT tenant,id,manifest FROM app_packages ORDER BY tenant,id LOOP
  PERFORM set_config('rac.tenant',p.tenant,true);
  FOR e IN SELECT value FROM jsonb_array_elements(p.manifest->'entities') LOOP
   n:='app_'||substr(encode(sha256(convert_to(p.tenant||':'||p.id,'UTF8')),'hex'),1,24)||'_'||(e->>'name');
   EXECUTE format('INSERT INTO app_records(tenant,app,entity,id,revision,version,fields) SELECT tenant,$1,$2,id,revision,$3,to_jsonb(x)-''tenant''-''id''-''revision'' FROM public.%I x WHERE tenant=$4',n)
    USING p.id,e->>'name',p.manifest->>'version',p.tenant;
   EXECUTE format('SELECT count(*) FROM public.%I',n) INTO count_before;
   SELECT count(*) INTO count_after FROM app_records WHERE tenant=p.tenant AND app=p.id AND entity=e->>'name';
   IF count_before<>count_after THEN RAISE EXCEPTION 'App record count mismatch'; END IF;
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I x FULL JOIN (SELECT id,revision,fields FROM app_records WHERE tenant=$1 AND app=$2 AND entity=$3) r USING(id) WHERE x.id IS NULL OR r.id IS NULL OR x.tenant<>$1 OR x.revision IS DISTINCT FROM r.revision OR (to_jsonb(x)-''tenant''-''id''-''revision'') IS DISTINCT FROM r.fields)',n)
    INTO mismatch USING p.tenant,p.id,e->>'name';
   IF mismatch THEN RAISE EXCEPTION 'App record content mismatch'; END IF;
  END LOOP;
 END LOOP;
 -- All targets now exist: deferred FKs admit existing cyclic app graphs and reject missing targets.
 SET CONSTRAINTS ALL IMMEDIATE;
 FOR p IN SELECT tenant,id,manifest FROM app_packages ORDER BY tenant,id LOOP
  PERFORM set_config('rac.tenant',p.tenant,true);
  FOR e IN SELECT value FROM jsonb_array_elements(p.manifest->'entities') LOOP
   FOR f IN SELECT value FROM jsonb_array_elements(e->'fields') WHERE value->>'kind'='relations' LOOP
    links:='app_'||substr(encode(sha256(convert_to(p.tenant||':'||p.id,'UTF8')),'hex'),1,24)||'_rel_'||substr(encode(sha256(convert_to((e->>'name')||':'||(f->>'name'),'UTF8')),'hex'),1,20);
    EXECUTE format('SELECT EXISTS((SELECT source_id,target_id,position FROM public.%I WHERE tenant=$1 EXCEPT SELECT record_id,target_id,position FROM app_record_references WHERE tenant=$1 AND app=$2 AND entity=$3 AND field=$4) UNION ALL (SELECT record_id,target_id,position FROM app_record_references WHERE tenant=$1 AND app=$2 AND entity=$3 AND field=$4 EXCEPT SELECT source_id,target_id,position FROM public.%I WHERE tenant=$1))',links,links)
     INTO mismatch USING p.tenant,p.id,e->>'name',f->>'name';
    IF mismatch THEN RAISE EXCEPTION 'App relation content mismatch'; END IF;
   END LOOP;
  END LOOP;
 END LOOP;
 -- One DROP of the exact verified set resolves internal FKs. No CASCADE: unknown dependents abort safely.
 IF cardinality(names)>0 THEN
  EXECUTE 'DROP TABLE '||(SELECT string_agg(format('public.%I',x),',') FROM unnest(names) x);
 END IF;
END $fn$;
