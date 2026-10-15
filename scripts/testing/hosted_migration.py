"""Real pre-055 SQL database upgrades through the native migrator; never rewind one ledger entry on a newer store."""
import hashlib
import json
import os
import re
import subprocess
import urllib.parse
import urllib.error
import urllib.request
import uuid
from testing.database import psql
from testing.runtime import ROOT, serve, stop


def verify(env):
    database='hosted_migration_'+uuid.uuid4().hex
    owner=urllib.parse.urlsplit(env['DATABASE_URL']).username or 'commerce'
    def sql(statement,db=database):
        result=subprocess.run(psql(env['TEST_DB_CONTAINER'],owner,db,'-Atq','-v','ON_ERROR_STOP=1'),input=statement,text=True,capture_output=True)
        assert result.returncode==0,result.stderr
        return result.stdout.strip()
    sql('CREATE DATABASE '+database,db='postgres')
    try:
        sql('CREATE TABLE commerce_migrations(version text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())')
        for source in ['src/migrations/schema.rs','src/migrations/recent_schema.rs']:
            for version,path in re.findall(r'\(\s*"([^"]+)",\s*include_str!\("../../(migrations/[^"]+)"\)',(ROOT/source).read_text()):
                if int(version[:3])>=55:continue
                content=(ROOT/path).read_text()
                digest=hashlib.sha256(content.encode()).hexdigest()
                sql("BEGIN; SET LOCAL rac.system='on'; "+content+f" INSERT INTO commerce_migrations(version,checksum) VALUES('{version}','{digest}'); COMMIT;")
        basis=(ROOT/'fixtures/demo-settings.json').read_text().replace("'","''")
        sql(f"INSERT INTO commerce_settings(tenant,data) VALUES('atelier','{basis}'); INSERT INTO sales_channels(tenant,id,data) VALUES('atelier','default','{{}}'); INSERT INTO hosted_frontends(alias,tenant,channel,origin,experience_alias) VALUES('legacy-hosted-fixture','atelier','default','https://experience.example.test','legacy-hosted-fixture');")
        assert sql("SELECT count(*) FROM information_schema.columns WHERE table_name='hosted_frontends' AND column_name='app_id'")=='0'
        assert sql('SELECT count(*) FROM app_packages')=='0'
        url=urllib.parse.urlsplit(env['DATABASE_URL'])
        child={**env,'DATABASE_URL':urllib.parse.urlunsplit(url._replace(path='/'+database)),
               'BOOTSTRAP_MODE':'migrate','SEED_DEMO':'false','DB_RLS_REQUIRED':'false','DB_SCOPE_REQUIRED':'false'}
        for name in ['DATABASE_RUNTIME_URL','DATABASE_TENANT_URL','DATABASE_LISTENER_URL']:
            child.pop(name,None)
        with (ROOT/'artifacts/hosted-migration.log').open('w') as log:
            subprocess.run([str(ROOT/'target/debug/veyndo')],cwd=ROOT,env=child,stdout=log,stderr=log,check=True)
            assert sql("SELECT active AND revision=1 FROM app_packages WHERE tenant='atelier' AND id='storyfront'")=='t'
            assert sql("SELECT app_id FROM hosted_frontends WHERE alias='legacy-hosted-fixture'")=='storyfront'
            assert sql("SELECT convalidated FROM pg_constraint WHERE conname='hosted_frontends_app_fk'")=='t'
            assert sql("SELECT count(*) FROM commerce_migrations WHERE version IN('055-hosted-apps','101-shared-app-records','102-consolidate-app-tables')")=='3'
            before=sql("SELECT jsonb_agg(to_jsonb(r)) FROM app_versions r WHERE tenant='atelier' AND app='storyfront'")
            for restart in range(2):
                if restart:
                    subprocess.run([str(ROOT/'target/debug/veyndo')],cwd=ROOT,env=child,stdout=log,stderr=log,check=True)
                base='http://'+env['BIND_ADDR']
                server=serve({**child,'BOOTSTRAP_MODE':'serve','PROCESS_ROLE':'http','ALLOW_BOOTSTRAP_AUTH':'true'},base,log)
                try:
                    request=urllib.request.Request(base+'/api/apps',headers={'x-tenant':'atelier','Authorization':'Bearer '+env['MERCHANT_TOKEN']})
                    try:
                        with urllib.request.urlopen(request,timeout=10) as response:packages=json.load(response)['packages']
                    except urllib.error.HTTPError as error:
                        raise AssertionError((error.code,error.read().decode())) from error
                    installed=next(p for p in packages if p['id']=='storyfront')
                    assert installed['active'] and installed['managedBy']=='experience' and installed['connections'][0]['alias']=='legacy-hosted-fixture'
                    assert installed['revision']==1
                finally:stop(server)
                assert sql("SELECT revision FROM app_packages WHERE tenant='atelier' AND id='storyfront'")=='1'
                assert sql("SELECT jsonb_agg(to_jsonb(r)) FROM app_versions r WHERE tenant='atelier' AND app='storyfront'")==before
    finally:
        sql('DROP DATABASE '+database+' WITH (FORCE)',db='postgres')
