#!/usr/bin/env python3
"""Replay original 001–100 SQL, then verify populated inactive/preview cyclic app tables consolidate losslessly and atomically."""
import hashlib
import json
import os
import re
import subprocess
import time
import uuid
from testing.database import psql
from testing.runtime import ROOT

database='shared_migration_'+uuid.uuid4().hex
runtime_role='migration_probe_'+uuid.uuid4().hex[:12]
tenant_role='migration_tenant_'+uuid.uuid4().hex[:12]
container=os.environ['TEST_DB_CONTAINER']
def sql(statement,db=database,fail=False):
    result=subprocess.run(psql(container,'commerce',db,'-Atq','-v','ON_ERROR_STOP=1'),input=statement,text=True,capture_output=True)
    assert bool(result.returncode)==fail,result.stderr
    return result.stdout.strip()
def literal(value):return "'"+value.replace("'","''")+"'"
def old_table(tenant):return 'app_'+hashlib.sha256((tenant+':legacy_probe').encode()).hexdigest()[:24]+'_nodes'
def old_links(tenant):return 'app_'+hashlib.sha256((tenant+':legacy_probe').encode()).hexdigest()[:24]+'_rel_'+hashlib.sha256(b'nodes:related').hexdigest()[:20]
manifest={'id':'legacy_probe','version':'1.2.3','coreApi':'1','runtime':'declarative','name':{'en':'Historical fixture'},'permissions':['data.read','data.write'],'entities':[{'name':'nodes','fields':[{'name':'code','kind':'string','unique':True},{'name':'quantity','kind':'integer'},{'name':'title','kind':'string','translatable':True},{'name':'related','kind':'relations','references':'nodes'},{'name':'optional','kind':'string'}]}]}
sql('CREATE DATABASE '+database,db='postgres')
try:
    sql('CREATE TABLE commerce_migrations(version text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())')
    # These are the actual unchanged deployed migrations, in their native ledger order.
    for source in ['src/migrations/schema.rs','src/migrations/recent_schema.rs']:
        for path in re.findall(r'include_str!\("../../(migrations/[^\"]+)"\)',(ROOT/source).read_text()):
            if path.split('/')[-1][:3] in ('101','102'):continue
            sql('BEGIN; SET LOCAL rac.system=\'on\'; '+(ROOT/path).read_text()+' COMMIT;')
    sql("INSERT INTO tenants(id,name) VALUES('stage-legacy-probe','Historical preview'); INSERT INTO merchant_users(id,email,name,password_hash) VALUES('legacy-preview-owner','legacy-preview@example.test','Historical preview','unusable-fixture'); INSERT INTO shop_environments(tenant,live_tenant,name,baseline,preview_owner,preview_until) VALUES('stage-legacy-probe','atelier','Historical preview','{}','legacy-preview-owner',now()+interval '1 hour');")
    tenants=['atelier','workshop','stage-legacy-probe']
    for t in tenants:
        name,links=old_table(t),old_links(t)
        sql(f"INSERT INTO app_packages(tenant,id,version,manifest,digest,active) VALUES('{t}','legacy_probe','1.2.3',{literal(json.dumps(manifest))},'immutable-fixture',{str(t!='workshop').lower()}); INSERT INTO app_storage_usage(tenant,app) VALUES('{t}','legacy_probe'); CREATE TABLE {name}(tenant text NOT NULL,id text NOT NULL,revision bigint NOT NULL,code text,quantity bigint,title jsonb,related jsonb,optional text,PRIMARY KEY(tenant,id)); CREATE TABLE {links}(tenant text NOT NULL,source_id text NOT NULL,target_id text NOT NULL,position integer NOT NULL,PRIMARY KEY(tenant,source_id,target_id),FOREIGN KEY(tenant,source_id) REFERENCES {name}(tenant,id),FOREIGN KEY(tenant,target_id) REFERENCES {name}(tenant,id)); INSERT INTO {name} VALUES('{t}','a',7,'A',9007199254740991,'{{\"de-DE\":\"Größe\",\"en-GB\":null}}','[\"b\"]',NULL),('{t}','b',11,NULL,-2,'{{\"de-DE\":\"\"}}','[\"a\"]',''); INSERT INTO {links} VALUES('{t}','a','b',1),('{t}','b','a',1);")
    sql("INSERT INTO sales_channels(tenant,id,data) VALUES('atelier','default','{}'); INSERT INTO carts(id,tenant,token,data) VALUES('legacy-cart','atelier','synthetic-legacy-token','{}'); INSERT INTO orders(id,tenant,cart_id,idempotency_key,fingerprint,data) VALUES('legacy-order','atelier','legacy-cart','legacy-request','fixture','{}'); INSERT INTO order_receipts(id,tenant,order_id,kind,number,locale,snapshot,request_key,fingerprint,content,source_app) VALUES('legacy-document','atelier','legacy-order','shipping_label','L-1','de-DE','{}','label-request','fixture',convert_to('%PDF-fixture','UTF8'),'legacy_probe'); INSERT INTO app_record_versions(tenant,app,entity,record_id,revision,fields,read_scopes,source) VALUES('atelier','legacy_probe','nodes','a',6,'{\"code\":\"old\"}','[\"customers.pii\"]','historical-fixture'); INSERT INTO app_schema_history(tenant,app,to_version,from_version,old_manifest,records) VALUES('atelier','legacy_probe','1.2.3','1.2.2','{}','{\"nodes\":[{\"original\":true}]}');")
    retained=sql("SELECT jsonb_build_object('documents',(SELECT jsonb_agg(to_jsonb(r)) FROM order_receipts r),'versions',(SELECT jsonb_agg(to_jsonb(r)) FROM app_record_versions r),'schema',(SELECT jsonb_agg(to_jsonb(r)) FROM app_schema_history r))")
    before={t:json.loads(sql(f"SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM {old_table(t)} r")) for t in tenants}
    events=sql('SELECT count(*) FROM outbox')
    # Model an already-enforced production database, not only configuration after a fresh install.
    sql(f"CREATE ROLE {runtime_role} LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT; CREATE ROLE {tenant_role} LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT; SELECT public.veyndo_configure_scope('{runtime_role}','{tenant_role}'); SELECT public.veyndo_activate_scope();")
    sql('BEGIN; '+(ROOT/'migrations/101-shared-app-records.sql').read_text()+' COMMIT;')
    for role in [runtime_role,tenant_role]:
        for table in ['app_models','app_records','app_record_indexes','app_record_references']:
            assert sql(f"SELECT has_table_privilege('{role}','{table}','SELECT,INSERT,UPDATE,DELETE,REFERENCES')")=='t'
            assert sql(f"SELECT relowner<>(SELECT oid FROM pg_roles WHERE rolname='{role}') FROM pg_class WHERE oid='{table}'::regclass")=='t'
    # Even an idle old Core pool must prevent a rolling cutover; no copied rows may remain.
    connection=subprocess.Popen(psql(container,runtime_role,database,'-Atq'),stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True)
    try:
        for attempt in range(100):
            if sql(f"SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND usename='{runtime_role}'")=='1':break
            assert connection.poll() is None,'Runtime connection failed'
            time.sleep(.05)
        else:raise AssertionError('Runtime connection did not appear')
        sql('BEGIN; '+(ROOT/'migrations/102-consolidate-app-tables.sql').read_text()+' COMMIT;',fail=True)
        assert sql('SELECT count(*) FROM app_records')=='0'
    finally:
        connection.communicate(timeout=10)
    # Corrupt legacy facts cannot be silently repaired from current data.
    sql(f"UPDATE {old_table('atelier')} SET related='[\"missing\"]' WHERE id='a'")
    sql('BEGIN; '+(ROOT/'migrations/102-consolidate-app-tables.sql').read_text()+' COMMIT;',fail=True)
    assert sql('SELECT count(*) FROM app_records')=='0'
    sql(f"UPDATE {old_table('atelier')} SET related='[\"b\"]' WHERE id='a'")
    # An unknown dependent prevents retirement and must roll back every copied row and quota change.
    sql(f"CREATE VIEW migration_unknown_dependency AS SELECT * FROM {old_table('atelier')};")
    sql('BEGIN; '+(ROOT/'migrations/102-consolidate-app-tables.sql').read_text()+' COMMIT;',fail=True)
    assert sql('SELECT count(*) FROM app_records')=='0'
    assert sql(f"SELECT count(*) FROM {old_table('atelier')}")=='2'
    sql('DROP VIEW migration_unknown_dependency')
    sql('BEGIN; '+(ROOT/'migrations/102-consolidate-app-tables.sql').read_text()+' COMMIT;')
    for t in tenants:
        rows=json.loads(sql(f"SELECT jsonb_agg(fields||jsonb_build_object('tenant',tenant,'id',id,'revision',revision) ORDER BY id) FROM app_records WHERE tenant='{t}' AND app='legacy_probe' AND entity='nodes'"))
        assert rows==before[t],(t,rows,before[t])
        assert sql(f"SELECT count(*) FROM app_record_references WHERE tenant='{t}' AND app='legacy_probe'")=='2'
        assert sql(f"SELECT rows FROM app_storage_usage WHERE tenant='{t}' AND app='legacy_probe'")==('5' if t=='atelier' else '4')
        assert sql(f"SELECT to_regclass('{old_table(t)}') IS NULL AND to_regclass('{old_links(t)}') IS NULL")=='t'
    assert sql("SELECT jsonb_build_object('documents',(SELECT jsonb_agg(to_jsonb(r)) FROM order_receipts r),'versions',(SELECT jsonb_agg(to_jsonb(r)) FROM app_record_versions r),'schema',(SELECT jsonb_agg(to_jsonb(r)) FROM app_schema_history r))")==retained
    assert sql('SELECT count(*) FROM outbox')==events
    assert sql("SELECT active FROM app_packages WHERE tenant='workshop' AND id='legacy_probe'")=='f'
    print('PASS actual historical migrations + populated inactive/personal-preview records preserve IDs, revisions, integer precision, localized NULL/empty values, immutable history, document quotas and cyclic relationships')
    print('PASS exact verified legacy tables retire without CASCADE; unknown dependency rolls back copy/quota/retirement; no invented business events')
    print('PASS a connected idle Core login blocks maintenance consolidation before any record is copied')
    print('PASS expand migration grants existing enforced system/tenant logins fixed-table access without ownership')
finally:
    sql('DROP DATABASE '+database+' WITH (FORCE)',db='postgres')
    sql('DROP ROLE IF EXISTS '+runtime_role,db='postgres')
    sql('DROP ROLE IF EXISTS '+tenant_role,db='postgres')
