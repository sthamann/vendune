"""Adversarial SQL uses the actual tenant login, not SET ROLE on a privileged fixture session."""
import hashlib
import hmac
import json
import os
import subprocess
import time
import urllib.parse
import uuid
from testing.database import psql

def configure(sql, env, system_role, system_url):
    tenant_role='tenant_'+uuid.uuid4().hex[:12]
    password=uuid.uuid4().hex
    sql(f"CREATE ROLE {tenant_role} LOGIN PASSWORD '{password}' NOSUPERUSER NOBYPASSRLS NOINHERIT; SELECT public.veyndo_configure_scope('{system_role}','{tenant_role}'); SELECT public.veyndo_activate_scope();")
    url=urllib.parse.urlsplit(system_url)
    tenant_url=urllib.parse.urlunsplit(url._replace(netloc=f'{tenant_role}:{password}@{url.hostname}:{url.port}'))
    env.update(DATABASE_TENANT_URL=tenant_url,DB_SCOPE_REQUIRED='true',DB_POOL_MAX='6')
    return tenant_role,tenant_url

def verify(sql, tenant_url, system_role):
    url=urllib.parse.urlsplit(tenant_url)
    role=url.username
    def probe(statement, fail=False):
        result=subprocess.run(psql(os.environ['TEST_DB_CONTAINER'],role,url.path[1:],'-qAt','-v','ON_ERROR_STOP=1'),
            input=statement,text=True,capture_output=True,env={**os.environ,'PGPASSWORD':url.password})
        assert (result.returncode!=0)==fail,(statement[:100],result.stderr)
        return result.stdout.strip()
    key=json.loads(sql("SELECT json_build_object('id',id,'secret',secret) FROM public.veyndo_scope_key()"))
    def ticket(tenant='',actor='',kind='T',login=role,deadline=None):
        body=f"v1:{key['id']}:{deadline or int(time.time())+300}:{kind}:{tenant}:{actor}:{uuid.uuid4().hex}"
        mac=hmac.new(bytes.fromhex(key['secret']),(body+':'+login).encode(),hashlib.sha256).hexdigest()
        return body+':'+mac
    def scoped(credential,statement,t='atelier',actor=''):
        return probe(f"BEGIN; SET LOCAL rac.system='on'; SET LOCAL rac.tenant='{t}'; SET LOCAL rac.actor='{actor}'; SET LOCAL veyndo.scope_ticket='{credential}'; {statement}; ROLLBACK;")
    assert probe("SET rac.system='on'; SET rac.tenant='workshop'; SELECT count(*) FROM products;")=='0'
    assert scoped(ticket('atelier'),"SELECT count(DISTINCT tenant) FROM products")=='1'
    assert scoped(ticket('atelier'),"SELECT count(*) FROM products WHERE tenant<>'atelier'",t='workshop')=='0'
    assert scoped(ticket(kind='S',login=system_role),"SELECT count(*) FROM products")=='0'
    assert scoped(ticket('atelier',deadline=int(time.time())-1),"SELECT count(*) FROM products")=='0'
    assert scoped(ticket('atelier')[:-1]+'x',"SELECT count(*) FROM products")=='0'
    assert scoped(ticket('atelier'),"WITH changed AS (UPDATE products SET stock=999 WHERE tenant='workshop' RETURNING id) SELECT count(*) FROM changed")=='0'
    for statement in ["SELECT * FROM public.veyndo_scope_key()","SELECT * FROM veyndo_authority.keys",
                      "SELECT * FROM user_sessions","SELECT password_hash FROM merchant_users",
                      "SELECT public.veyndo_activate_scope()","SELECT public.veyndo_rotate_scope_key()",
                      "SELECT public.veyndo_configure_scope(current_user,current_user)",
                      "ALTER TABLE products DISABLE ROW LEVEL SECURITY","TRUNCATE products",
                      "CREATE TABLE public.unauthorized_scope_object(id text)",
                      "CREATE TEMPORARY TABLE products(id text)",
                      "SELECT public.veyndo_guard_app_table('products')"]:
        probe(statement,fail=True)
    assert probe("SELECT count(*) FROM pg_stat_activity WHERE query LIKE '%v1:%' AND pid<>pg_backend_pid()")=='0'
    app_tables=['app_models','app_records','app_record_indexes','app_record_references']
    for table in app_tables:
        assert scoped(ticket('atelier'),f"SELECT count(*) FROM public.{table} WHERE tenant<>'atelier'")=='0'
        probe(f'ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY',fail=True)
    for statement in [
        "INSERT INTO app_models(tenant,app,entity,version,definition) VALUES('atelier','forged','forged','1','{}')",
        "INSERT INTO app_record_indexes(tenant,app,entity,field,record_id,value,is_unique) VALUES('atelier','forged','forged','code','x','\"x\"',true)",
        "INSERT INTO app_record_references(tenant,app,entity,field,record_id,position,target_entity,target_id) VALUES('atelier','forged','forged','parent','x',1,'forged','x')",
    ]:
        # Must reject by the write policy, not merely by an absent parent/constraint.
        scoped(ticket('atelier'),"DO $probe$ BEGIN BEGIN "+statement+"; RAISE EXCEPTION 'Managed app projection accepted a tenant write'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $probe$")
    for suffix in ['one','two']:
        actor='scope-person-'+suffix
        sql(f"INSERT INTO merchant_users(id,email,name,password_hash) VALUES('{actor}','{actor}@example.test','Synthetic scope actor','synthetic-unusable-hash') ON CONFLICT DO NOTHING; INSERT INTO memberships(tenant,user_id,role) VALUES('atelier','{actor}','viewer') ON CONFLICT DO NOTHING; INSERT INTO studio_workspaces(tenant,user_id,revision,data) VALUES('atelier','{actor}',1,'{{}}') ON CONFLICT DO NOTHING;")
    actor='scope-person-one'
    assert scoped(ticket('atelier',actor,'P'),'SELECT count(*) FROM studio_workspaces',actor=actor)=='1'
    assert scoped(ticket('atelier',actor,'P'),'SELECT count(*) FROM studio_workspaces',actor='scope-person-two')=='0'
    assert scoped(ticket('atelier',actor,'A'),'SELECT count(*) FROM studio_workspaces',actor=actor)=='0'
    assert scoped(ticket('atelier'),'SELECT count(*) FROM studio_workspaces',actor=actor)=='0'
    print('PASS actual tenant login cannot forge another shop/system/actor, steal signing keys, read identity secrets, change schema/managed projections or reuse system-role tickets')
    return probe,ticket,scoped
