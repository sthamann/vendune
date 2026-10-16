#!/usr/bin/env python3
"""Real native directories and read-only model planning in an isolated PostgreSQL database and loopback provider."""
import copy,json,os,socket,subprocess,threading,time,urllib.request,urllib.error,urllib.parse,uuid
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from testing.database import psql
from testing.app_approval import consent
from testing.runtime import ROOT,serve,stop
state={'result':{'supported':True,'criteria':{'customer':'Alex Example'}}};seen=[]
class Model(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_POST(self):
  value=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
  if self.path=='/api/embed':result={'embeddings':[[1.0]+[0.0]*1023 for _ in value['input']]}
  else:
   seen.append(value)
   if state.get('reject'):self.send_response(503);self.end_headers();return
   if self.path=='/v1/responses':
    shape=value['text']['format'];assert shape['strict'] is True
    criteria=shape['schema']['properties']['criteria']
    assert set(criteria['required'])==set(criteria['properties'])
    output=copy.deepcopy(state['result'])
    output['criteria']={**{key:None for key in criteria['properties']},**output['criteria']}
    result={'status':'completed','output':[{'content':[{'type':'output_text','text':json.dumps(output)}]}]}
   else:result={'message':{'content':json.dumps(state['result'])},'done_reason':'stop'}
  self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(result).encode())
model=ThreadingHTTPServer(('127.0.0.1',0),Model);threading.Thread(target=model.serve_forever,daemon=True).start()
url=urllib.parse.urlsplit(os.environ['DATABASE_URL']);suffix=uuid.uuid4().hex[:10];database='grid_contract_'+suffix;user=url.username or 'commerce'
def sql(statement,target='postgres'):subprocess.run(psql(os.getenv('DB_CONTAINER','veyndo-postgres-1'),user,target,'-v','ON_ERROR_STOP=1'),input=statement,text=True,check=True,stdout=subprocess.DEVNULL)
sql(f'CREATE DATABASE "{database}"')
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
base=f'http://127.0.0.1:{port}';env={**os.environ,'DATABASE_URL':urllib.parse.urlunsplit(url._replace(path='/'+database)),'BIND_ADDR':f'127.0.0.1:{port}','OLLAMA_URL':f'http://127.0.0.1:{model.server_port}','OPENAI_API_KEY':'','ANTHROPIC_API_KEY':'','PROCESS_ROLE':'all'}
if os.getenv('GRID_REVIEW_HOLD'):env['COMMERCE_PUBLIC_ORIGIN']=base
(ROOT/'artifacts').mkdir(exist_ok=True);log=(ROOT/'artifacts/grid-directory.log').open('w');process=None
headers={}
def call(path,body=None,h=None,method=None,expected=200):
 req=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(headers if h is None else h)},method=method or ('GET' if body is None else 'POST'))
 try:
  with urllib.request.urlopen(req,timeout=30) as r:status=r.status;v=json.load(r)
 except urllib.error.HTTPError as e:status=e.code;v=json.load(e)
 assert status==expected,(path,status,expected,v);return v
try:
 process=serve(env,base,log)
 def register(name):return call('/api/auth/register',{'workspaceId':name+'-'+suffix,'workspaceName':name,'name':'Fixture Owner','email':name+suffix+'@example.test','password':'Synthetic-grid-2026!'},h={})
 owner=register('grid');foreign=register('foreign-grid');headers={'x-tenant':owner['workspace'],'Authorization':'Bearer '+owner['token']};public={'x-tenant':owner['workspace']}
 # Real orders and contacts through the actual Store API, without provider charges.
 def order(name,email,quantity):
  call('/store-api/account/register',{'name':name,'email':email,'password':'Synthetic-grid-buyer-2026!'},h=public)
  cart=call('/store-api/checkout/cart',{'session':uuid.uuid4().hex},h=public);ch={**public,'sw-context-token':cart['token']}
  call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'mug','quantity':quantity}]},h=ch)
  login=call('/store-api/account/login',{'email':email,'password':'Synthetic-grid-buyer-2026!'},h=ch);ch['sw-context-token']=login['token']
  return call('/store-api/checkout/order',{},h={**ch,'Idempotency-Key':'grid-'+uuid.uuid4().hex})
 alex=order('Alex Example','alex'+suffix+'@example.test',1);jamie=order('Jamie Example','jamie'+suffix+'@example.test',2)
 result=call('/api/merchant/orders?customer=Alex%20Example');assert [r['id'] for r in result['elements']]==[alex['id']],result
 filtered=call('/api/merchant/orders?paymentState=authorized&sort=total&direction=desc');assert filtered['elements'][0]['id']==jamie['id']
 assert len(call('/api/merchant/orders?from=2000-01-01&to=2000-01-02')['elements'])==0
 call('/api/merchant/orders?from=wrong',expected=400);call('/api/merchant/orders?sort=id%3BDROP',expected=400);call('/api/merchant/orders?guest=true',expected=400)
 first=call('/api/merchant/orders?sort=total&direction=asc&limit=1');second=call('/api/merchant/orders?sort=total&direction=asc&limit=1&after='+first['nextCursor']);assert first['elements'][0]['id']==alex['id'] and second['elements'][0]['id']==jamie['id']
 mcp=lambda name,args:call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':args}})['result']
 assert mcp('merchant.orders',{'customer':'Alex Example'})['structuredContent']['elements'][0]['id']==alex['id']
 print('PASS customer-name, state/date filters and global order sorting/keyset pagination agree across HTTP and MCP')
 for kind,sort,key in [('products','stock','id'),('customers','name','email')]:
  pages=[];after=''
  for _ in range(20):
   v=call('/api/merchant/'+kind+'?sort='+sort+'&direction=desc&limit=1&after='+urllib.parse.quote(after));pages+=v['elements'];after=v.get('nextCursor') or ''
   if not after:break
  assert len({r[key] for r in pages})==len(pages) and len(pages)>=2,(kind,pages)
  if kind=='products':assert [r['stock'] for r in pages]==sorted([r['stock'] for r in pages],reverse=True)
  else:assert [r['profile']['name'] for r in pages]==sorted([r['profile']['name'] for r in pages],reverse=True)

 for pid,name in [('lamp','Zulu Sort'),('chair','Alpha Sort')]:
  product=call('/api/merchant/products/'+pid);product['translations']['de']['name']=name
  call('/api/merchant/products/'+pid,product,method='PUT')
 localized=call('/api/merchant/products?sort=name&direction=asc',h={**headers,'x-commerce-locale':'de-DE'})['elements']
 assert [r['name'].lower() for r in localized]==sorted(r['name'].lower() for r in localized)
 print('PASS localized product-name sort uses the same native language chain as displayed rows')
 assert not call('/api/merchant/customers?guest=true')['elements']
 assert len(call('/api/merchant/customers?active=true&query='+suffix)['elements'])==2
 assert not call('/api/merchant/customers?query=%27%3BDELETE%20FROM%20orders')['elements']
 print('PASS native product/customer filters and global sort paginate without omissions; SQL-looking text remains a bound value')
 payload={'entity':'orders','instruction':'Zeige alle Bestellungen von Alex Example','locale':'de-DE'}
 plan=call('/api/merchant/grid/plan',payload);assert plan['supported'] and plan['criteria']=={'customer':'Alex Example'}
 assert seen[-1]['format']['properties']['criteria']['additionalProperties'] is False
 assert 'orderNumber' not in json.dumps(seen[-1]) and 'Synthetic-grid' not in json.dumps(seen[-1])
 assert mcp('merchant.grid.plan',payload)['structuredContent']['criteria']==plan['criteria']
 assert len(call('/api/merchant/orders')['elements'])==2
 state['result']={'supported':True,'criteria':{'tenant':foreign['workspace']}};call('/api/merchant/grid/plan',payload,expected=400)
 state['result']={'supported':True,'criteria':{'from':'invalid'}};call('/api/merchant/grid/plan',payload,expected=400)
 state['result']={'supported':False,'criteria':{}};assert not call('/api/merchant/grid/plan',payload)['supported']
 state['reject']=True;call('/api/merchant/grid/plan',payload,expected=502);state['reject']=False
 print('PASS central model wire yields read-only native criteria; unknown identity/date output is rejected, unsupported queries are explicit, failure retains manual APIs')
 invite=call('/api/workspace/invitations',{'email':'clerk'+suffix+'@example.test','role':'viewer'});clerk=call('/api/auth/accept',{'name':'Clerk','password':'Synthetic-grid-2026!','invitationToken':invite['token']},h={});ch={'x-tenant':owner['workspace'],'Authorization':'Bearer '+clerk['token']}
 call('/api/workspace/members/'+clerk['user']['id'],{'role':'viewer','active':True,'permissions':['assistant.use','catalog.read']},method='PUT')
 before=len(seen);call('/api/merchant/grid/plan',payload,h=ch,expected=403);assert len(seen)==before
 call('/api/merchant/orders',h=ch,expected=403)
 fh={'x-tenant':foreign['workspace'],'Authorization':'Bearer '+foreign['token']};assert not call('/api/merchant/orders?after='+alex['id'],h=fh)['elements']
 call('/api/merchant/grid/plan',payload,h={**ch,'x-tenant':foreign['workspace']},expected=403)
 stage=call('/api/environments',{'name':'Grid private preview'})['id'];assert not call('/api/merchant/orders',h={**headers,'x-tenant':stage})['elements']
 print('PASS current native domain/PII rights, foreign tenant/cursors and private environments cannot expose live order rows')
 # Strict OpenAI Responses wire fills unused optional criteria with null. Reuse
 # central platform configuration and restart the native owner, never real keys.
 stop(process);process=None
 env.update({'OPENAI_API_KEY':'grid-fixture-only','OPENAI_BASE_URL':f'http://127.0.0.1:{model.server_port}/v1','OPENAI_PROTOCOL':'responses'})
 sql(f'''UPDATE platform_ai SET data=jsonb_set(jsonb_set(data,'{{defaultProvider}}','"openai"'::jsonb),'{{providers,openai,endpoint}}',to_jsonb('http://127.0.0.1:{model.server_port}/v1'::text))''',database)
 process=serve(env,base,log)
 state['result']={'supported':True,'criteria':{'customer':'Alex Example'}}
 plan=call('/api/merchant/grid/plan',payload);assert plan['provider']=='openai' and plan['criteria']=={'customer':'Alex Example'}
 assert mcp('merchant.grid.plan',payload)['structuredContent']['criteria']==plan['criteria']
 assert 'orderNumber' not in json.dumps(seen[-1]) and 'Synthetic-grid' not in json.dumps(seen[-1])
 state['result']={'supported':True,'criteria':{'active':False}}
 assert call('/api/merchant/grid/plan',{**payload,'entity':'customers'})['criteria']=={'active':False}
 state['result']={'supported':True,'criteria':{'tenant':None}};call('/api/merchant/grid/plan',payload,expected=400)
 state['result']={'supported':True,'criteria':{'customer':''}};call('/api/merchant/grid/plan',payload,expected=400)
 state['result']={'supported':True,'criteria':{}};call('/api/merchant/grid/plan',payload,expected=400)
 state['result']={'supported':False,'criteria':{}};assert not call('/api/merchant/grid/plan',payload)['supported']
 state['reject']=True;call('/api/merchant/grid/plan',payload,expected=502);state['reject']=False
 assert len(call('/api/merchant/orders')['elements'])==2
 print('PASS strict OpenAI wire and native restart normalize only optional known nulls, preserve false, reject null identity, and retain manual reads after failure')

 # The same provider receives only current readable app field definitions and must return a typed exact filter.
 manifest=json.loads((ROOT/'extensions/apps/object-context/manifest.json').read_text())
 call('/api/apps',consent({'manifest':manifest}))
 call('/api/apps/object_context/actions/save_product_context',{'id':'mug-context','revision':0,'fields':{'native_id':'mug','segment':'wholesale','note':{'en-GB':'Private extension note'}}})
 app_filter=json.dumps([{'app':'object_context','entity':'product_context','field':'segment','value':'wholesale'}])
 state['result']={'supported':True,'criteria':{'appFilter':app_filter}}
 app_payload={'entity':'products','locale':'de-DE','instruction':'Show products with segment wholesale'}
 planned=call('/api/merchant/grid/plan',app_payload)
 assert planned['criteria']=={'appFilter':app_filter} and planned['promptId']=='grid-filter@1'
 assert 'registeredAppFields' in json.dumps(seen[-1]) and 'Private extension note' not in json.dumps(seen[-1])
 assert mcp('merchant.products',planned['criteria'])['structuredContent']['elements'][0]['id']=='mug'
 for field in ['note','tenant','not_installed']:
  invalid=json.dumps([{'app':'object_context','entity':'product_context','field':field,'value':'wholesale'}])
  state['result']={'supported':True,'criteria':{'appFilter':invalid}}
  call('/api/merchant/grid/plan',app_payload,expected=400)
 print('PASS versioned grid prompt uses scoped app-field definitions; approved filters reach native MCP reads; injected, undeclared and unindexed fields fail')
 if os.getenv('GRID_REVIEW_HOLD'):
  state['result']={'supported':True,'criteria':{'customer':'Alex Example'}}
  path=ROOT/'artifacts/grid-review-private.json'
  path.write_text(json.dumps({'url':base+'/?shop='+owner['workspace']+'&studio=orders#merchant','email':'grid'+suffix+'@example.test','password':'Synthetic-grid-2026!','tenant':owner['workspace']}))
  print('READY local synthetic grid review; fixture remains isolated',flush=True)
  while True:time.sleep(1)

finally:
 if process:stop(process)
 log.close();model.shutdown();sql(f'DROP DATABASE "{database}" WITH (FORCE)')
