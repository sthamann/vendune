#!/usr/bin/env python3
"""Real native event, consent, order, graph, MCP and tenant/PII regression; synthetic buyers only."""
import concurrent.futures,json,os,uuid,urllib.request,urllib.error
BASE=os.environ['BASE_URL']
def call(path,body=None,h=None,method=None,expected=200):
 req=urllib.request.Request(BASE+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method)
 try:
  with urllib.request.urlopen(req,timeout=30) as r:code=r.status;v=json.load(r)
 except urllib.error.HTTPError as e:
  code=e.code;raw=e.read();e.close()
  try:v=json.loads(raw)
  except json.JSONDecodeError:v=raw.decode()
 assert code==expected,(path,code,expected,v)
 return v
uid=uuid.uuid4().hex[:9]
def fixture(prefix):
 t=prefix+uid
 a=call('/api/auth/register',{'workspaceId':t,'workspaceName':'Behavior fixture','name':'Owner','email':t+'@example.test','password':'Synthetic-behavior-2026!'})
 return {'x-tenant':t,'Authorization':'Bearer '+a['token']},{'x-tenant':t,'x-commerce-locale':'de-DE','User-Agent':'Chrome/150 Safari/1 Edg/150'}
mh,sh=fixture('behavior-');fh,fs=fixture('behavior-foreign-')
# A private merchant sandbox still must not accept client analytics via direct HTTP.
stage=call('/api/environments',{'name':'Analytics isolation'},mh)['id']
stage_h={**mh,'x-tenant':stage}
stage_cart=call('/store-api/checkout/cart',{},stage_h)
stage_h['sw-context-token']=stage_cart['token']
stage_policy=call('/store-api/legal',h=stage_h)
call('/store-api/privacy/consent',{'policyVersion':stage_policy['policyVersion'],'choices':{'analytics':True}},stage_h,'PUT')
call('/store-api/behavior/events',{'eventId':uuid.uuid4().hex,'kind':'page_view','surface':'collection','viewport':'mobile'},stage_h,expected=403)
c=call('/store-api/checkout/cart',{},sh);h={**sh,'sw-context-token':c['token']};policy=call('/store-api/legal',h=h)
def choices(values):return call('/store-api/privacy/consent',{'policyVersion':policy['policyVersion'],'choices':values},h,'PUT')
def event(kind='page_view',product=None):return {'eventId':uuid.uuid4().hex,'kind':kind,'productId':product,'surface':'product' if product else 'collection','viewport':'mobile','referrerHost':'example.test'}
first=event('product_view','lamp')
call('/store-api/behavior/events',first,h,expected=403)
choices({'analytics':True})
assert call('/store-api/behavior/events',first,h)['stored']
assert call('/store-api/behavior/events',first,h)['duplicate']
call('/store-api/behavior/events',{**first,'kind':'page_view'},h,expected=409)
call('/store-api/behavior/events',{**event(),'kind':'purchase'},h,expected=400)
call('/store-api/behavior/events',{**event(),'customerId':'forged'},h,expected=422)
call('/store-api/behavior/events',event('product_view','foreign-id'),h,expected=404)
call('/store-api/behavior/events',event('cart_add','lamp'),h,expected=400)
call('/store-api/behavior/events',event(),{**h,'x-customer-token':'forged'},expected=401)
call('/store-api/behavior/events',event(),{**h,'x-tenant':fs['x-tenant']},expected=404)
assert not call('/api/knowledge/behavior',{},fh)['totals']['events']
call('/api/knowledge/behavior',{},sh,expected=401)
# Personalization withdrawal must not erase analytics, and analytics withdrawal must not erase personalization.
choices({'analytics':True,'personalization':True})
personal={'eventId':uuid.uuid4().hex,'kind':'view','productId':'lamp'}
call('/store-api/personalization/events',personal,h)
choices({'analytics':True})
assert len(call('/store-api/behavior/events',h=h)['events'])==1
# An ordinary country header is ignored; a provider-specific secret is required and countries are ISO validated.
call('/store-api/behavior/events',event(),{**h,'x-sellm-geo-country':'US','x-sellm-geo-token':'wrong'})
if os.environ.get('TEST_BEHAVIOR_GEO_SECRET'):
 call('/store-api/behavior/events',event(),{**h,'x-sellm-geo-country':'US','x-sellm-geo-token':os.environ['TEST_BEHAVIOR_GEO_SECRET']})
 call('/store-api/behavior/events',event(),{**h,'x-sellm-geo-country':'ZZ','x-sellm-geo-token':os.environ['TEST_BEHAVIOR_GEO_SECRET']})
 report=call('/api/knowledge/behavior',{},mh)
 assert [d for d in report['dimensions'] if d['dimension']=='geoCountry' and d['label']=='US'][0]['contexts']==1
# Concurrent retry writes one observation under the same cart lock.
same=event()
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as p:results=list(p.map(lambda _:call('/store-api/behavior/events',same,h),range(2)))
assert sum(r.get('stored',False) for r in results)==1
c=call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'lamp','quantity':1}]},h)
call('/store-api/behavior/events',event('cart_add','lamp'),h)
call('/store-api/behavior/events',event('checkout_start'),h)
o=call('/store-api/checkout/order',{}, {**h,'Idempotency-Key':uuid.uuid4().hex})
r=call('/api/knowledge/behavior',{},mh)
assert r['totals']['contexts']==1 and r['totals']['ordered']==1 and r['totals']['added']==1
assert r['products'][0]['views']==1 and r['products'][0]['adds']==1
assert r['graph']['observations'][0]['source']=='browser:Edge' and r['graph']['semantic']
assert r['modelLearning']==False
session=r['journeys'][0]['session']
j=call('/api/knowledge/behavior/journey',{'session':session},mh)
assert any(e['orderId']==o['id'] for e in j['events'])
call('/api/knowledge/behavior/journey',{'session':session},fh,expected=404)
# Restricted API identity may view totals but neither enumerate nor inspect personal journeys.
integration=call('/api/workspace/integrations',{'name':'Aggregate reader','expiresInDays':1,'permissions':['knowledge.read']},mh)
restricted={**sh,'Authorization':'Bearer '+integration['key']}
aggregate=call('/api/knowledge/behavior',{},restricted)
assert aggregate['journeys']==[] and aggregate['canInspectJourneys']==False
call('/api/knowledge/behavior/journey',{'session':session},restricted,expected=403)
tools=call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/list'},restricted)['result']['tools']
assert 'knowledge.behavior' in [t['name'] for t in tools] and 'knowledge.behavior.journey' not in [t['name'] for t in tools]
m=call('/mcp',{'jsonrpc':'2.0','id':2,'method':'tools/call','params':{'name':'knowledge.behavior','arguments':{}}},mh)['result']['structuredContent']
assert m['totals']==r['totals']
# Revocation remains possible after checkout and removes the derived graph/journey; order remains valid.
choices({})
assert call('/api/knowledge/behavior',{},mh)['totals']['events']==0
call('/api/knowledge/behavior/journey',{'session':session},mh,expected=404)
assert call('/api/merchant/orders/'+o['id'],h=mh)['id']==o['id']
assert call('/store-api/behavior/events',h=h)['events']==[]
print('PASS consent withdrawal, independent purposes, native cart/order, graph, duplicate/concurrent retries, geo spoof denial, API/MCP and foreign-tenant/PII controls',flush=True)
# Actual signed-in identity is derived from the native customer session, never a request ID.
address={'firstName':'Test','lastName':'Buyer','street':'Test Road 1','postalCode':'10115','city':'Berlin','country':'DE'}
account=call('/store-api/account/register',{'email':uid+'@example.test','name':'Buyer','password':'Synthetic-behavior-2026!','billingAddress':address},sh)
ch={**sh,'x-customer-token':account['customerToken']}
c=call('/store-api/checkout/cart',{},ch);ch['sw-context-token']=c['token'];pol=call('/store-api/legal',h=ch)
call('/store-api/privacy/consent',{'policyVersion':pol['policyVersion'],'choices':{'analytics':True,'personalization':True}},ch,'PUT')
call('/store-api/behavior/events',event('product_view','mug'),ch)
r=call('/api/knowledge/behavior',{},mh);assert r['totals']['identified']==1
j=call('/api/knowledge/behavior/journey',{'session':r['journeys'][0]['session']},mh)
customer=call('/api/merchant/customers/'+account['email'],h=mh)
assert j['events'][0]['customerId']==customer['id']
assert j['events'][0]['customerRef']==account['email']
call('/store-api/personalization/events',{'eventId':uuid.uuid4().hex,'kind':'view','productId':'mug'},ch)
call('/store-api/behavior/events',h=ch,method='DELETE');assert call('/api/knowledge/behavior',{},mh)['totals']['events']==0
call('/store-api/personalization/events',{'eventId':uuid.uuid4().hex,'kind':'view','productId':'mug'},ch)
print('PASS native authenticated customer association and independent self export/erase',flush=True)
# Indexed expiration and the per-context cap are exercised on this disposable database.
if os.environ.get('TEST_DATABASE'):
 from testing.database import psql
 import subprocess
 def sql(statement):
  r=subprocess.run(psql(os.environ['TEST_DB_CONTAINER'],'commerce',os.environ['TEST_DATABASE'],'-X','-q','-v','ON_ERROR_STOP=1','-At'),input=statement,text=True,capture_output=True)
  assert r.returncode==0,r.stderr
  return r.stdout.strip()
 import hashlib
 session=hashlib.sha256(c['id'].encode()).hexdigest();t=sh['x-tenant']
 probe=event();call('/store-api/behavior/events',probe,ch)
 sql(f"UPDATE session_signal_events SET expires_at=now()-interval '1 second' WHERE tenant='{t}' AND id='{probe['eventId']}';")
 assert call('/store-api/behavior/events',h=ch)['events']==[]
 assert call('/api/knowledge/behavior',{},mh)['totals']['events']==0
 # Same synthetic owned context, populated without HTTP load; only admission is tested.
 sql(f"INSERT INTO session_signal_events(tenant,id,session,purpose,kind,cart_id,channel_id) SELECT '{t}',md5('cap-'||n::text),'{session}','analytics','page_view','{c['id']}','default' FROM generate_series(1,500) n;")
 call('/store-api/behavior/events',event(),ch,expected=429)
 call('/store-api/behavior/events',h=ch,method='DELETE')
 assert call('/store-api/behavior/events',event(),ch)['stored']
 print('PASS expired events are hidden; bounded context admission recovers after owned erasure',flush=True)

if os.environ.get('TEST_DATABASE'):
 role='behavior_reader_'+uid
 sql(f"CREATE ROLE {role} NOLOGIN NOSUPERUSER NOBYPASSRLS; GRANT USAGE ON SCHEMA public TO {role}; GRANT SELECT,INSERT ON session_signal_events TO {role};")
 try:
  assert sql(f"BEGIN; SET LOCAL ROLE {role}; SELECT count(*) FROM session_signal_events; ROLLBACK;")=='0'
  own=sql(f"BEGIN; SET LOCAL ROLE {role}; SELECT set_config('rac.tenant','{t}',true),set_config('rac.system','off',true); SELECT count(*) FROM session_signal_events WHERE tenant <> '{t}'; ROLLBACK;")
  assert own.splitlines()[-1]=='0',own
  foreign=fs['x-tenant']
  sql(f"BEGIN; SET LOCAL ROLE {role}; SELECT set_config('rac.tenant','{t}',true); DO $probe$ BEGIN BEGIN INSERT INTO session_signal_events(tenant,id,session) VALUES('{foreign}','forged','forged'); RAISE EXCEPTION 'RLS accepted foreign row'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $probe$; ROLLBACK;")
  print('PASS behavior ledger RLS denies absent/foreign scope under NOSUPERUSER NOBYPASSRLS',flush=True)
 finally:sql(f'DROP OWNED BY {role}; DROP ROLE {role};')

if os.environ.get('TEST_DATABASE'):
 # Observations must not prevent deletion of otherwise unreferenced native entities.
 sql(f"INSERT INTO products(tenant,id,name,category,description,price,tax_rate,stock) VALUES('{t}','behavior-ephemeral','Ephemeral','fixture','fixture',1,19,1);")
 probe=event('product_view','behavior-ephemeral');call('/store-api/behavior/events',probe,ch)
 sql(f"DELETE FROM products WHERE tenant='{t}' AND id='behavior-ephemeral';")
 assert sql(f"SELECT product_id IS NULL FROM session_signal_events WHERE tenant='{t}' AND id='{probe['eventId']}';")=='t'
 # No cart/order/session/profile references; isolate the nullable customer FK itself.
 sql(f"INSERT INTO customers(tenant,email,password_hash,profile) VALUES('{t}','ephemeral-{uid}@example.test','synthetic','{{}}'); UPDATE session_signal_events SET customer_id=(SELECT id FROM customers WHERE tenant='{t}' AND email='ephemeral-{uid}@example.test') WHERE tenant='{t}' AND id='{probe['eventId']}'; DELETE FROM customers WHERE tenant='{t}' AND email='ephemeral-{uid}@example.test';")
 assert sql(f"SELECT customer_id IS NULL FROM session_signal_events WHERE tenant='{t}' AND id='{probe['eventId']}';")=='t'
 print('PASS analytics references release deleted products/customers without removing observations or weakening tenant ownership',flush=True)
# Per-channel privacy settings reuse native revision/inheritance/history and selective publication.
channel={'name':{'en-GB':'Behavior channel'},'kind':'storefront','active':True,'locales':['en-GB','de-DE'],'productIds':[]}
call('/api/automation/channels/behavior_channel',{'revision':0,'data':channel},mh,'PUT')
path='/api/merchant/commerce/channels/behavior_channel'
settings=call(path,h=mh)
settings['data']['legal']['behaviorAnalytics']={'enabled':True,'retentionDays':2,'eventsPerHour':1}
call(path,settings,mh,'PUT')
call(path,settings,mh,'PUT',409)
limited={**sh,'sw-sales-channel-id':'behavior_channel'}
cart=call('/store-api/checkout/cart',{},limited);limited['sw-context-token']=cart['token']
pol=call('/store-api/legal',h=limited)
consent=call('/store-api/privacy/consent',{'policyVersion':pol['policyVersion'],'choices':{'analytics':True}},limited,'PUT');assert consent['behaviorAnalyticsEnabled']
assert call('/store-api/behavior/events',event(),limited)['retentionDays']==2
call('/store-api/behavior/events',event(),limited,expected=429)
r=call('/api/knowledge/behavior',{'days':30,'salesChannelId':'behavior_channel'},mh);assert r['days']==2 and r['eventsPerHour']==1
assert call('/store-api/legal',h=sh)['data']['behaviorAnalytics']['retentionDays']==30
settings=call(path,h=mh);settings['data']['legal']['behaviorAnalytics']['enabled']=False
call(path,settings,mh,'PUT')
pol=call('/store-api/legal',h=limited)
receipt=call('/store-api/privacy/consent',{'policyVersion':pol['policyVersion'],'choices':{'analytics':True}},limited,'PUT');assert not receipt['behaviorAnalyticsEnabled']
call('/store-api/behavior/events',event(),limited,expected=403)
assert not call('/api/knowledge/behavior',{'salesChannelId':'behavior_channel'},mh)['totals']['events']
history=call('/api/history/checkoutChannel/behavior_channel',h=mh);assert history['elements'][0]['actor'] and history['canRestore']
invalid=call(path,h=mh);invalid['data']['legal']['behaviorAnalytics']['retentionDays']=31
call(path,invalid,mh,'PUT',400)
assert call(path,h=mh)['revision']==2
# A staged privacy edit is selectively released through the existing settings aggregate.
stage=call('/api/environments',{'name':'Privacy settings preview'},mh)['id']
staged=call(path,h={**mh,'x-tenant':stage});staged['data']['legal']['behaviorAnalytics']['retentionDays']=1
call(path,staged,{**mh,'x-tenant':stage},'PUT')
diff=call('/api/environments/'+stage+'/diff',h=mh)['changes']
selected=next(c for c in diff if c['key']=='settings-channel:behavior_channel')
call('/api/environments/'+stage+'/release',{'approve':True,'selections':[{'key':selected['key'],'digest':selected['digest']}]},mh)
assert call(path,h=mh)['data']['legal']['behaviorAnalytics']['retentionDays']==1
assert not call('/store-api/legal',h=limited)['data']['behaviorAnalytics']['enabled']
print('PASS inherited channel analytics settings, enforced retention/admission/disable, current consent disclosure, revision/history and selective sandbox publication')
