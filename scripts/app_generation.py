#!/usr/bin/env python3
"""Native AI proposal contract with local model HTTP, real Rust/SQL and no paid model calls."""
import copy,json,os,socket,subprocess,threading,time,urllib.request,urllib.error,uuid
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from testing.runtime import ROOT,serve,stop
from testing.app_approval import consent
state={'invalid':False};seen=[]
class Model(BaseHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_POST(self):
  v=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
  if self.path=='/api/embed':out={'embeddings':[[1.0]+[0.0]*1023 for _ in v['input']]}
  else:
   assert self.path=='/api/chat';seen.append(v)
   m=copy.deepcopy(state['manifest'])
   control={'id':'ai_title','kind':'textbox','entity':m['entities'][0]['name'],'dataField':m['entities'][0]['fields'][1]['name'],'readAction':'list_'+m['entities'][0]['name'],'title':m['name'],'contextBinding':m['views'][0]['blocks'][0]['contextBinding']}
   edits=[('/views/0/blocks/-',control),('/entities/0/publicRead',True),('/entities/0/fields/0/coreReference','customer')]
   if 'edits' in state:edits=state['edits']
   if state['invalid']:edits=[('/entities/0/fields',[])]
   out={'message':{'content':json.dumps({'patch':[{'op':'add','path':path,'valueJson':json.dumps(value)} for path,value in edits],'summary':m['name']})},'done_reason':'stop'}
  self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(out).encode())
model=ThreadingHTTPServer(('127.0.0.1',0),Model);threading.Thread(target=model.serve_forever,daemon=True).start()
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
base=f'http://127.0.0.1:{port}';env={**os.environ,'BIND_ADDR':f'127.0.0.1:{port}','OLLAMA_URL':f'http://127.0.0.1:{model.server_port}','PROCESS_ROLE':'all'}
(ROOT/'artifacts').mkdir(exist_ok=True);log=(ROOT/'artifacts/app-generation.log').open('w');process=serve(env,base,log);headers={}
def call(path,body=None,expected=200,scope=None):
 r=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(headers if scope is None else scope)})
 try:
  with urllib.request.urlopen(r,timeout=30) as response:status=response.status;value=json.load(response)
 except urllib.error.HTTPError as e:status=e.code;value=json.load(e)
 assert status==expected,(path,status,value);return value
try:
 u=uuid.uuid4().hex[:10];a=call('/api/auth/register',{'workspaceId':'generation-'+u,'workspaceName':'Proposal fixture','name':'Fixture','email':u+'@example.test','password':'Synthetic-generation-2026!'})
 headers={'x-tenant':a['workspace'],'Authorization':'Bearer '+a['token']}
 stage=call('/api/environments',{'name':'AI proposal fixture'})['id']
 patterns=json.loads(subprocess.check_output(['node','frontend/scripts/recipe-fixtures.mjs'],cwd=ROOT,text=True))
 for pattern in patterns:
  pattern['id']+='_'+u
  build=call('/api/developer/import',{'environment':stage,'prompt':'Actual visual pattern','manifest':pattern,'summary':pattern['name']})
  assert build['manifest']['id']==pattern['id'] and build['state']=='draft'
  if pattern['runtime']=='declarative':assert call('/api/developer/preview',{'manifest':pattern})['private']
 print('PASS actual frontend patterns validate as immutable server drafts; declarative patterns enter the real private F5 preview')
 m=json.loads((ROOT/'extensions/apps/assistant-examples/admin.json').read_text());m['id']='generated_'+u
 state['manifest']=m
 payload={'environment':stage,'prompt':'Improve this product editor with native controls while preserving data and permissions','manifest':m,'inference':{'provider':'ollama','model':'synthetic-model'}}
 b=call('/api/developer/generate',payload);generated=b['manifest']
 assert b['state']=='draft' and b['environment']==stage
 assert not generated['entities'][0]['publicRead'] and generated['entities'][0]['fields'][0]['coreReference']=='product'
 assert not any(s['app']==m['id'] for s in call('/api/apps/surfaces')['surfaces'])
 assert seen[0]['format']['properties']['patch'] and seen[0]['options']['num_predict']==8192
 assert generated['views'][0]['blocks'][-1]['kind']=='textbox' and generated['views'][0]['blocks'][-1]['contextBinding']==m['views'][0]['blocks'][0]['contextBinding']
 assert generated['version']=='0.1.1' and generated['id']==m['id']
 call('/api/developer/builds/'+b['id']+'/stage',{'approve':True,'digest':b['digest']})
 assert any(x['id']==b['id'] and x['state']=='staged' for x in call('/api/developer')['builds'])
 state['invalid']=True;call('/api/developer/generate',payload,400)
 assert len([x for x in call('/api/developer')['builds'] if x['app']==m['id']])==1
 print('PASS real model HTTP → validated immutable draft → explicit staging; expanded native grammar and token budget; model exposure attempts neutralized and field removal rejected without a saved build (no paid calls)')
 state['invalid']=False
 lifecycle=copy.deepcopy(json.loads((ROOT/'extensions/apps/production-review/manifest.json').read_text())['lifecycles'][0])
 state['edits']=[('/lifecycles',[lifecycle])]
 workflow_build=call('/api/developer/generate',{**payload,'prompt':'Add an order quality review requiring confirmed payment and delivered shipments. Preserve the current app and its data.'})
 assert workflow_build['manifest']['lifecycles']==[lifecycle]
 assert 'commerce.lifecycle' in workflow_build['manifest']['permissions']
 assert seen[-1]['messages'][0]['content'].startswith('[prompt:app-edit@3]\n')
 assert 'lifecycles' in seen[-1]['messages'][0]['content'] and 'delivery.delivered' in seen[-1]['messages'][0]['content']
 assert 'allowedNativeTo' in seen[-1]['messages'][0]['content'] and 'replaceableActions' in seen[-1]['messages'][0]['content']
 call('/api/developer/builds/'+workflow_build['id']+'/stage',{'approve':True,'digest':workflow_build['digest']})
 assert any(x['id']==workflow_build['id'] and x['state']=='staged' for x in call('/api/developer')['builds'])
 print('PASS normal model patch adds a native review workflow, carries explicit capability consent and stages the immutable result through the existing owner')
 current=workflow_build['manifest']; state['manifest']=current
 corpus=json.loads((ROOT/'crates/cognition/evals/app-native-workflows.v2.json').read_text())
 assert corpus['promptId']=='app-edit@3'
 count=len(call('/api/developer')['builds'])
 for case in corpus['cases']:
  # Mix every hostile change with a valid presentation edit: a partial useful edit must not hide a weakened contract.
  state['edits']=[('/name',{'en-GB':'Harmless presentation edit'}),(case['path'],case['value'])]
  refused=call('/api/developer/generate',{**payload,'manifest':current,'prompt':case['id']},400)
  if 'expectedDetail' in case:assert refused['errors'][0]['detail']==case['expectedDetail'],refused
  assert len(call('/api/developer')['builds'])==count,case['id']
 quote=json.loads((ROOT/'extensions/apps/production-review/manifest.json').read_text())['lifecycles'][1]
 state['edits']=[('/lifecycles',[quote])]
 addition=call('/api/developer/generate',{**payload,'manifest':current,'prompt':'Add quote preparation without altering the existing order workflow'})
 assert addition['manifest']['lifecycles']==[quote,lifecycle]
 print('PASS versioned adversarial corpus rejects weakened guards, removed states/rights, identity swaps and invented executable guards without saving partial builds; adding a quote domain preserves the accepted order contract')
 # Installing into the private environment and publishing only this package uses the same owner as visual editing.
 sh={**headers,'x-tenant':stage}
 call('/api/apps',consent({'manifest':current}),scope=sh)
 assert not any(s['app']==m['id'] for s in call('/api/apps/surfaces')['surfaces'])
 changes=call('/api/environments/'+stage+'/diff')['changes']
 selected=next(c for c in changes if c['key']=='app:'+m['id'])
 call('/api/environments/'+stage+'/release',{'approve':True,'selections':[{'key':selected['key'],'digest':selected['digest']}]})
 pub={'x-tenant':headers['x-tenant']}
 cart=call('/store-api/checkout/cart',{},scope=pub);ch={**pub,'sw-context-token':cart['token']}
 call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'mug','quantity':1}]},scope=ch)
 order=call('/store-api/checkout/order',{},scope={**ch,'Idempotency-Key':'generated-workflow-'+u})
 path='/api/merchant/orders/'+order['id']
 for _ in range(150):
  order=call(path)
  if any(a['kind']=='note' for a in order['activity']):break
  time.sleep(.03)
 assert order['nativeLifecycle']['object']=='order'
 order=call(path+'/transition',{'revision':order['revision'],'kind':'order','state':'in_progress'})
 review=next(a for a in order['workflow']['actions'] if a['id'].endswith('_review'))
 order=call(path+'/transition',{'revision':order['revision'],'kind':'order','state':review['state'],'action':review['id']})
 approve=next(a for a in order['workflow']['actions'] if a['id'].endswith('_approve'))
 assert not approve['enabled']
 call(path+'/transition',{'revision':order['revision'],'kind':'order','state':approve['state'],'action':approve['id']},409)
 persisted=call(path)
 assert persisted['state']==order['state'] and persisted['nativeLifecycle']==order['nativeLifecycle']
 print('PASS model proposal → explicit private install → selected package release → native simulated order review; missing delivery blocks completion and the accepted workflow survives reload')
finally:stop(process);log.close();model.shutdown()
