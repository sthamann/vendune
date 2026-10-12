"""Real core -> scoped callback -> Rust ERP adapter -> local ERP -> forced-RLS receipt, replay/restart and ambiguous outcome."""
import hashlib,hmac,concurrent.futures, json, os, socket, subprocess, sys, threading, time, urllib.error, urllib.parse, urllib.request, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'scripts'))
from testing.app_approval import pin,consent
from testing.database import psql
from testing.runtime import serve,stop
env=dict(os.environ);suffix=uuid.uuid4().hex[:10];tenant='erp-'+suffix;foreign='erp-other-'+suffix
role='erp_fixture_'+suffix; role_password='synthetic-erp-db-'+suffix; gateway='synthetic-erp-gateway-'+suffix;exports={};attempts=[];mode='accepted'
def port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
core_url=f'http://127.0.0.1:{port()}';erp_url=f'http://127.0.0.1:{port()}'
def call(base,path,body=None,h=None,status=200):
 if path=='/api/apps':body=consent(body)
 req=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})})
 try:
  with urllib.request.urlopen(req,timeout=20) as r:code=r.status;v=json.load(r)
 except urllib.error.HTTPError as e:code=e.code;v=json.load(e)
 assert code==status,(path,code,status,v);return v
def sql(statement,user='commerce'):
 return subprocess.run(psql(env.get('TEST_DB_CONTAINER','unused'),user,env['TEST_DATABASE'],'-qAt','-v','ON_ERROR_STOP=1'),input=statement,text=True,capture_output=True,check=True,env={**env,**({'PGPASSWORD':role_password} if user==role else {})}).stdout.strip()
class ERP(BaseHTTPRequestHandler):
 def do_POST(self):
  assert self.headers['Authorization']=='Bearer synthetic-erp-provider-'+suffix
  value=json.loads(self.rfile.read(int(self.headers['Content-Length'])));key=self.headers['Idempotency-Key'];attempts.append(key)
  assert 'email' not in json.dumps(value) and 'address' not in json.dumps(value)
  if mode=='rejected':self.send_response(422);self.end_headers();self.wfile.write(b'{}');return
  exports.setdefault(key,{'receiptId':'ERP-'+str(len(exports)+1),'orderId':value['order']['id']})
  self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers()
  self.wfile.write(b'not-json' if mode=='ambiguous' else json.dumps(exports[key]).encode())
 def do_GET(self):
  assert self.headers['Authorization']=='Bearer synthetic-erp-provider-'+suffix
  v=exports.get(self.path.rsplit('/',1)[-1]);self.send_response(200 if v else 404);self.end_headers();self.wfile.write(json.dumps(v or {}).encode())
 def log_message(self,*_):pass
fixture=ThreadingHTTPServer(('127.0.0.1',0),ERP);threading.Thread(target=fixture.serve_forever,daemon=True).start()
package=json.loads((ROOT/'extensions/apps/erp-handoff/manifest.json').read_text())
core_env={**env,'BIND_ADDR':core_url.removeprefix('http://'),'BASE_URL':core_url,'PROCESS_ROLE':'all','APP_SERVICES':json.dumps(pin({'erp_handoff':{'url':erp_url,'token':gateway}},'erp_handoff',package))}
core=adapter=None;log=(ROOT/'artifacts/erp-handoff.log').open('w')
try:
 sql((ROOT/'extensions/apps/erp-handoff/service/schema.sql').read_text())
 sql(f"CREATE ROLE {role} LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '{role_password}'; GRANT USAGE ON SCHEMA public TO {role}; GRANT SELECT,INSERT,UPDATE ON erp_handoff_receipts TO {role};")
 core=serve(core_env,core_url,log);configs={};owners={}
 for t in [tenant,foreign]:
  u=call(core_url,'/api/auth/register',{'workspaceId':t,'name':'Synthetic ERP owner','email':t+'@example.test','password':'Synthetic-ERP-fixture-2026!'})
  h={'x-tenant':t,'Authorization':'Bearer '+u['token']};owners[t]=h
  call(core_url,'/api/apps',{'manifest':package},h)
  digest=call(core_url,'/api/apps/erp_handoff/credentials',h=h)['digest']
  k=call(core_url,'/api/apps/erp_handoff/credentials',{'digest':digest,'approve':True,'permissions':['orders.read'],'expiresInDays':1},h)
  configs[t]={'callbackToken':k['key'],'erpUrl':f'http://127.0.0.1:{fixture.server_port}/orders','erpToken':'synthetic-erp-provider-'+suffix,'webhookSecret':'synthetic-erp-signing-secret-'+suffix}
 url=urllib.parse.urlsplit(env['DATABASE_URL']);app_dsn=urllib.parse.urlunsplit(url._replace(netloc=f'{role}:{role_password}@{url.hostname}:{url.port}'))
 app_env={**env,'APP_DATABASE_URL':app_dsn,'APP_TOKEN':gateway,'APP_ID':'erp_handoff','APP_BIND_ADDR':erp_url.removeprefix('http://'),'APP_CORE_URL':core_url,'APP_TENANTS':json.dumps(configs),'ALLOW_LOOPBACK_FIXTURES':'true'}
 def start_adapter():
  p=subprocess.Popen([str(ROOT/'target/debug/erp-handoff')],env=app_env,stdout=log,stderr=log)
  for _ in range(100):
   if p.poll() is not None:raise AssertionError('ERP adapter failed startup; see its local log')
   try:call(erp_url,'/health');return p
   except OSError:time.sleep(.05)
  raise AssertionError('ERP adapter was not ready')
 adapter=start_adapter()
 def order(t):
  h={'x-tenant':t};c=call(core_url,'/store-api/checkout/cart',{'session':'erp-'+uuid.uuid4().hex},h);h['sw-context-token']=c['token']
  call(core_url,'/store-api/checkout/cart/line-item',{'items':[{'referencedId':'mug','quantity':1}]},h)
  return call(core_url,'/store-api/checkout/order',{}, {**h,'Idempotency-Key':'erp-order-'+uuid.uuid4().hex})['id']
 def sync(t,id):return call(core_url,'/api/apps/erp_handoff/actions/synchronize',{'payload':{'orderId':id}},owners[t])
 id=order(tenant)
 quote=call(core_url,"/api/apps/erp_handoff/core/order",{"id":id},{"x-tenant":tenant,"Authorization":"Bearer "+configs[tenant]["callbackToken"]})
 assert isinstance(quote.get("totalMinor"),int),quote
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(lambda _:sync(tenant,id),range(4)))
 for _ in range(100):
  rows=call(core_url,'/api/apps/erp_handoff/actions/receipts',{},owners[tenant])['elements']
  if any(r['orderId']==id and r['state']=='accepted' for r in rows):break
  time.sleep(.1)
 else:raise AssertionError('Expected confirmed ERP receipt')
 assert len(exports)==1 and len(attempts)==1
 assert all(r['orderId']==id for r in results)
 call(core_url,'/api/apps/erp_handoff/actions/synchronize',{'payload':{'orderId':id}},owners[foreign],502)
 call(erp_url,'/actions/receipts',{}, {'x-tenant':tenant},401)
 assert call(core_url,'/api/apps/erp_handoff/actions/receipts',{},owners[foreign])['elements']==[]
 assert sql(f"BEGIN; SELECT set_config('app.tenant','{foreign}',true); SELECT count(*) FROM erp_handoff_receipts WHERE tenant='{tenant}'; COMMIT;",role).splitlines()[-1]=='0'
 denied=subprocess.run(psql(env.get('TEST_DB_CONTAINER','unused'),role,env['TEST_DATABASE'],'-c','SELECT * FROM orders LIMIT 1'),text=True,capture_output=True,env={**env,'PGPASSWORD':role_password})
 assert denied.returncode!=0
 print('PASS real order callback, minimized ERP export, concurrent action/event deduplication, tenant RLS and app-only DB role')
 stop(adapter);adapter=start_adapter();assert sync(tenant,id)['state']=='accepted';assert len(attempts)==1
 print('PASS adapter cold restart preserves receipt and never repeats a confirmed export')
 mode='ambiguous';ambiguous=order(tenant);r=sync(tenant,ambiguous)
 for _ in range(100):
  r=sync(tenant,ambiguous)
  if r['state']=='uncertain':break
  time.sleep(.05)
 else:raise AssertionError('Expected uncertain receipt')
 before=len(attempts);assert sync(tenant,ambiguous)['state']=='uncertain';assert len(attempts)==before
 assert call(core_url,'/api/apps/erp_handoff/actions/reconcile',{'payload':{'orderId':ambiguous}},owners[tenant])['state']=='accepted'
 assert len(attempts)==before
 mode='rejected';rejected=order(tenant)
 for _ in range(100):
  r=sync(tenant,rejected)
  if r['state']=='failed':break
  time.sleep(.05)
 assert r['state']=='failed';before=len(attempts);assert sync(tenant,rejected)['state']=='failed';assert len(attempts)==before
 event={'eventId':1,'tenant':tenant,'idempotencyKey':tenant+':erp_handoff:1','kind':'order.placed','data':{'orderId':id}}
 call(erp_url,'/events',{'apiVersion':'1','tenant':tenant,'app':'erp_handoff','events':[event,{**event,'tenant':foreign}]},{'x-tenant':tenant,'Authorization':'Bearer '+gateway},400)
 assert len(attempts)==before
 raw=json.dumps(event,separators=(',',':')).encode();stamp=str(int(time.time()));event_key=hashlib.sha256((tenant+':erp_handoff:'+raw.hex()).encode()).hexdigest()
 canonical='\n'.join([tenant,'erp_handoff',stamp,event_key,hashlib.sha256(raw).hexdigest()]);signature=hmac.new(configs[tenant]['webhookSecret'].encode(),canonical.encode(),hashlib.sha256).hexdigest()
 def signed(sig=signature,payload=raw):
  req=urllib.request.Request(erp_url+'/signed-events',data=payload,headers={'Content-Type':'application/json','x-tenant':tenant,'x-app-id':'erp_handoff','x-app-timestamp':stamp,'x-app-event-id':event_key,'x-app-signature':sig})
  try:
   with urllib.request.urlopen(req) as out:return out.status,json.load(out)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 assert signed()[0]==200;assert signed()[0]==200;assert signed('0'*64)[0]==401;assert signed(payload=raw+b' ')[0]==401;assert len(attempts)==before
 print('PASS signed public event replay uses the same receipt; altered bodies and bad HMAC have no ERP effect')
 print('PASS ambiguous receipt is explicitly reconciled without another export; rejected exports and invalid batch tails have no duplicate effect')
finally:
 if adapter:stop(adapter)
 if core:stop(core)
 fixture.shutdown();log.close()
 sql(f'DROP OWNED BY {role}; DROP ROLE IF EXISTS {role};')
