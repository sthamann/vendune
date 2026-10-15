#!/usr/bin/env python3
"""Actual app APIs prove fixed physical storage, concurrent uniqueness, scoped filters and private preview cleanup."""
import concurrent.futures
import copy
import json
import os
import subprocess
import urllib.error
import urllib.request
import uuid
from testing.app_approval import consent
from testing.database import psql
from testing.runtime import ROOT

base=os.environ['BASE_URL']
def call(path,body=None,h=None,expected=200):
    if path=='/api/apps':body=consent(body)
    req=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})})
    try:
        with urllib.request.urlopen(req,timeout=30) as response:code,value=response.status,json.load(response)
    except urllib.error.HTTPError as error:code,value=error.code,json.load(error)
    assert code==expected,(path,code,expected,value)
    return value
def sql(statement,fail=False):
    result=subprocess.run(psql(os.environ['TEST_DB_CONTAINER'],'commerce',os.environ['TEST_DATABASE'],'-Atq','-v','ON_ERROR_STOP=1'),input=statement,text=True,capture_output=True)
    assert bool(result.returncode)==fail,result.stderr
    return result.stdout.strip()
def objects():
    return sql("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','i')")
def owner():
    t='shared-'+uuid.uuid4().hex[:12]
    user=call('/api/auth/register',{'workspaceId':t,'name':'Shared storage fixture','email':t+'@example.test','password':'Synthetic-shared-store-2026!'})
    return t,{'x-tenant':t,'Authorization':'Bearer '+user['token']}
def manifest(app):
    m=json.loads((ROOT/'extensions/apps/care-studio/manifest.json').read_text())
    m.update(id=app,permissions=['data.read','data.write'],views=[],surfaces=[],slots=[],events=[],apiRoutes=[])
    m.pop('intelligence',None)
    m['entities']=[{'name':'entries','fields':[{'name':'code','kind':'string','unique':True,'required':True},{'name':'number','kind':'integer','indexed':True},{'name':'title','kind':'string'}]}]
    for entity in m['entities']:
        entity['label']=m['name']
        for field in entity['fields']:field['label']=m['name']
    m['actions']=[{'name':op,'handler':op,'entity':'entries','description':op,'public':False,'inputSchema':{'type':'object','properties':{'id':{'type':'string'},'revision':{'type':'integer'},'fields':{'type':'object'}} if op=='save' else {'id':{'type':'string'},'limit':{'type':'integer'},'after':{'type':'string'},'filter':{'type':'object'}},'additionalProperties':False}} for op in ['list','save']]
    return m

before=objects(); owners=[]
for _ in range(8):
    t,h=owner();owners.append((t,h))
    for n in range(4):
        m=manifest('shared_fixture_'+str(n));call('/api/apps',{'manifest':m},h)
        call('/api/apps/'+m['id']+'/actions/save',{'id':'same','fields':{'code':'same','number':n,'title':t}},h)
assert objects()==before,(before,objects())
assert sql("SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relname ~ '^app_[a-f0-9]{24}_'")=='0'
print('PASS 8 shops x 4 app installations, indexed models and records create zero physical tables or indexes')
t,h=owners[0];path='/api/apps/shared_fixture_0/actions/'
rows=call(path+'list',{'filter':{'number':0}},h)['elements'];assert len(rows)==1 and rows[0]['title']==t
assert call(path+'list',{'filter':{'number':1}},h)['elements']==[]
assert call(path+'list',{'after':'same'},h)['elements']==[]
assert set(rows[0])=={'id','revision','code','number','title'}
print('PASS same tenant/app/entity/id namespaces and indexed filters preserve typed wire values without storage metadata')

def race(index):
    req=urllib.request.Request(base+path+'save',data=json.dumps({'id':'race_'+str(index),'fields':{'code':'unique-race','number':42}}).encode(),headers={'Content-Type':'application/json',**h})
    try:
        with urllib.request.urlopen(req,timeout=30) as response:return response.status
    except urllib.error.HTTPError as error:return error.code
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:codes=list(executor.map(race,range(6)))
assert codes.count(200)==1 and codes.count(409)==5,codes
assert len(call(path+'list',{'filter':{'number':42}},h)['elements'])==1
print('PASS concurrent unique=true/indexed=false writes admit one winner and roll back five competitors')

# A shared database reader cannot tamper with the trigger-maintained uniqueness carrier.
role='shared_reader_'+uuid.uuid4().hex[:12]
sql(f'CREATE ROLE {role} NOLOGIN NOSUPERUSER NOBYPASSRLS; GRANT USAGE ON SCHEMA public TO {role}; GRANT SELECT,UPDATE,DELETE ON app_record_indexes TO {role};')
try:
    out=sql(f"BEGIN; SET LOCAL ROLE {role}; SET LOCAL rac.tenant='{t}'; WITH gone AS(DELETE FROM app_record_indexes RETURNING 1) SELECT count(*) FROM gone; ROLLBACK;")
    assert out=='0',out
finally:sql(f'DROP OWNED BY {role}; DROP ROLE {role};')
print('PASS projection write policy prevents direct removal of uniqueness entries by an ordinary role')

# Existing F5 resets only this actor's selected app, even with equal IDs elsewhere.
m=manifest('shared_preview');p=call('/api/developer/preview',{'manifest':m},h);sh={**h,'x-tenant':p['environment']}
call('/api/apps/shared_preview/actions/save',{'id':'private','fields':{'code':'private'}},sh)
changed=copy.deepcopy(m);changed['entities'][0]['fields'].append({'name':'extra','kind':'string','label':m['name']})
call('/api/developer/preview',{'manifest':changed},h)
assert call('/api/apps/shared_preview/actions/list',{},sh)['elements']==[]
assert call(path+'list',{},h)['elements']
assert objects()==before
print('PASS actor-private F5 schema reset deletes scoped rows only; shared tables and live app records survive')
