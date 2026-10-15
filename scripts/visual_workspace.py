#!/usr/bin/env python3
"""Actual Rust/PostgreSQL workspace, page publication, form privacy and reviewed AI paths; synthetic model only."""
import copy,json,os,socket,threading,urllib.request,urllib.error,uuid
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from testing.runtime import ROOT,serve,stop
from testing.app_approval import consent

state={}; seen=[]
class Model(BaseHTTPRequestHandler):
 def log_message(self,*args): pass
 def do_POST(self):
  value=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
  if state.get('unavailable'):
   self.send_response(503);self.end_headers();return
  if self.path=='/api/embed': out={'embeddings':[[1.0]+[0.0]*1023 for _ in value['input']]}
  else:
   seen.append(value)
   fields=state['fields']; content=copy.deepcopy(fields['content']); content['blocks'][0]['text']['de-DE']='Vom Agenten vorbereitet'
   for b in content['blocks']:
    if b['kind']=='products': b['productMode']='all'
   if state.get('selected'):content={'blocks':[content['blocks'][0]]}
   out={'message':{'content':json.dumps({'interpretation':'Synthetic reference analysis; no fetched source available.','variants':[{'summary':'Airy blue layout','content_json':json.dumps(content),'theme_json':json.dumps({'accent':'#0877e8','spacing':56})},{'summary':'Editorial layout','content_json':json.dumps(content),'theme_json':json.dumps({'accent':'#14283d','spacing':64})}]})},'done_reason':'stop'}
  self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(out).encode())
model=ThreadingHTTPServer(('127.0.0.1',0),Model);threading.Thread(target=model.serve_forever,daemon=True).start()
with socket.socket() as sock: sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
base=f'http://127.0.0.1:{port}'; env={**os.environ,'BIND_ADDR':f'127.0.0.1:{port}','OLLAMA_URL':f'http://127.0.0.1:{model.server_port}','PROCESS_ROLE':'all'}
(ROOT/'artifacts').mkdir(exist_ok=True);log=(ROOT/'artifacts/visual-workspace.log').open('w');process=serve(env,base,log)
def call(path,body=None,h=None,status=200,method=None):
 if path=='/api/apps' and body is not None: body=consent(body)
 request=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method)
 try:
  with urllib.request.urlopen(request,timeout=60) as response: code=response.status; result=json.load(response)
 except urllib.error.HTTPError as error: code=error.code; result=json.load(error)
 assert code in (status if isinstance(status,tuple) else (status,)),(path,code,status,result)
 return result
def account(label):
 tag=uuid.uuid4().hex[:10];return call('/api/auth/register',{'workspaceId':label+'-'+tag,'workspaceName':label,'name':label,'email':label+'-'+tag+'@example.test','password':'Synthetic-workspace-2026!'})
def headers(user,tenant=None):return {'x-tenant':tenant or user['workspace'],'Authorization':'Bearer '+user['token']}
def mcp(name,args,h):return call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':args}},h)
def save(fields,id='home',revision=0,h=None):return call('/api/apps/site_builder/actions/save_page',{'id':id,'revision':revision,'fields':fields},h)
def rows(h,public=False):return call(('/store-api' if public else '/api')+'/apps/site_builder/actions/'+('pages' if public else 'editor_pages'),{},h)['elements']
try:
 a=account('visual'); other=account('foreign-visual'); ah=headers(a); bh=headers(other)
 empty=call('/api/studio/workspace',h=ah);assert empty['revision']==0
 layout={'active':'area_1','areas':[{'id':'area_1','name':'Content','cards':['productData','design'],'pins':[]}],'goals':[]}
 saved=call('/api/studio/workspace',{'revision':0,'data':layout},ah,method='PUT');assert saved['revision']==1
 call('/api/studio/workspace',{'revision':0,'data':layout},ah,409,'PUT')
 assert call('/api/studio/workspace',h=bh)['revision']==0
 assert call('/api/studio/workspace',h=ah)['versions'][0]['revision']==1
 unsafe=copy.deepcopy(layout);unsafe['areas'][0]['pins']=[{'title':'Private search','tab':'customers','query':json.dumps({'query':'buyer@example.test'})}]
 call('/api/studio/workspace',{'revision':1,'data':unsafe},ah,400,'PUT')
 key=call('/api/workspace/integrations',{'name':'Synthetic API reader','expiresInDays':1,'permissions':['catalog.read']},ah)['key']
 kh={'x-tenant':a['workspace'],'Authorization':'Bearer '+key}
 call('/api/studio/workspace',h=kh,status=403)
 assert mcp('studio.workspace.read',{},kh)['result']['isError']
 call('/api/studio/workspace',h=headers(other,a['workspace']),status=403)
 print('PASS actor-private workspace, real CAS/history, foreign tenant and integration-key denial across HTTP/MCP')
 for app in ['site_builder','site_forms']:call('/api/apps',{'builtIn':app},ah)
 fields={'channel':'default','slug':'home','title':{'en-GB':'Shop','de-DE':'Unser Shop'},'kind':'landing','status':'draft','starts_at':None,'content':{'blocks':[{'id':'hero','kind':'hero','text':{'en-GB':'New collection','de-DE':'Neue Kollektion'}},{'id':'products','kind':'products','products':['mug'],'productMode':'selected'},{'id':'contact','kind':'form','text':{'de-DE':'Beratung'},'fields':[{'id':'email','kind':'email','required':True,'label':{'en-GB':'Email','de-DE':'E-Mail'}}]}]},'theme':{'accent':'#0877e8'},'seo':None,'author':None,'category':None}
 saved=save(fields,h=ah);assert saved['revision']==1
 public={'x-tenant':a['workspace']};assert not rows(public,True)
 assert not call('/store-api/apps/site_builder/actions/pages',{'filter':{'status':'draft'}},public)['elements']
 fields['status']='published';save(fields,revision=1,h=ah);assert len(rows(public,True))==1
 future=copy.deepcopy(fields);future.update(slug='future',starts_at='2099-01-01T00:00:00Z');save(future,'future',h=ah)
 assert [p['id'] for p in rows(public,True)]==['home']
 foreign=copy.deepcopy(fields);foreign.update(channel='missing',slug='foreign');call('/api/apps/site_builder/actions/save_page',{'id':'foreign','revision':0,'fields':foreign},ah,400)
 call('/api/apps/site_builder/actions/save_page',{'id':'stale','revision':0,'fields':{**fields,'slug':'home'}},ah,409)
 assert call('/api/apps/site_builder/entities/pages/home/history',h=ah)['versions'][0]['actor']==a['user']['id']
 assert not mcp('merchant.app.history',{'app':'site_builder','entity':'pages','id':'home'},ah)['result'].get('isError',False)
 call('/api/apps/site_builder/entities/pages/home/history/1/restore',{'revision':2,'approve':True},ah)
 assert not rows(public,True)
 fields['status']='published';save(fields,revision=3,h=ah)
 print('PASS draft/future/channel projection, duplicate route rejection, same API/MCP history, actor attribution and CAS restore')
 stage=call('/api/environments',{'name':'Visual design'},ah)['id'];sh=headers(a,stage)
 personal=call('/api/studio/workspace',h=ah);assert personal['revision']==1
 staged=copy.deepcopy(fields);staged['title']['de-DE']='Aus der Sandbox';save(staged,revision=1,h=sh)
 diff=call('/api/environments/'+stage+'/diff',h=ah)['changes'];change=next(c for c in diff if c['key']=='appdata:site_builder:pages:home')
 assert rows(ah)[0]['title']['de-DE']=='Unser Shop'
 call('/api/environments/'+stage+'/release',{'approve':True,'selections':[{'key':change['key'],'digest':change['digest']}]},ah)
 assert next(p for p in rows(public,True) if p['id']=='home')['title']['de-DE']=='Aus der Sandbox'
 assert call('/api/studio/workspace',h=ah)['revision']==1
 # Native save and selective release contend on the same package-before-record fence.
 import concurrent.futures
 staged['title']['de-DE']='Parallel sandbox';save(staged,revision=2,h=sh)
 change=next(c for c in call('/api/environments/'+stage+'/diff',h=ah)['changes'] if c['key']=='appdata:site_builder:pages:home')
 live=next(p for p in rows(ah) if p['id']=='home');live_fields={k:v for k,v in live.items() if k not in ['id','revision']};live_fields['title']['de-DE']='Parallel live'
 barrier=threading.Barrier(2)
 def racing_save():
  barrier.wait();return call('/api/apps/site_builder/actions/save_page',{'id':'home','revision':live['revision'],'fields':live_fields},ah,(200,409))
 def racing_release():
  barrier.wait();return call('/api/environments/'+stage+'/release',{'approve':True,'selections':[{'key':change['key'],'digest':change['digest']}]},ah,(200,409))
 with concurrent.futures.ThreadPoolExecutor(2) as pool:
  futures=[pool.submit(racing_save),pool.submit(racing_release)];[f.result(timeout=20) for f in futures]
 # Keep later AI checks independent of which operation won the deliberately concurrent race.
 current_stage=next(p for p in rows(sh) if p['id']=='home');stage_revision=current_stage['revision']
 print('PASS actual sandbox edits and selective publication; personal workspace is not cloned/released')
 cart=call('/store-api/checkout/cart',{'session':uuid.uuid4().hex},public);ch={**public,'sw-context-token':cart['token']}
 flow={'name':{'en-GB':'Form review'},'active':True,'event':'app.site_forms.submitted','condition':{'type':'alwaysValid'},'action':'note','instruction':{'en-GB':'Review the private inbox'},'locale':'en-GB'}
 call('/api/automation/flows/form_review',{'revision':0,'data':flow},ah,method='PUT')
 submission={'fields':{'page':'home','block':'contact','channel':'default','consent':True,'answers':{'email':'buyer@example.test'}}}
 assert call('/store-api/apps/site_forms/actions/submit',submission,ch)['accepted']
 responses=call('/api/apps/site_forms/actions/responses',{},ah)['elements'];assert len(responses)==1
 id=responses[0]['id'];assert call('/api/apps/site_forms/entities/inbox/'+id+'/history',h=ah)['canRestore'] is False
 call('/api/apps/site_forms/entities/inbox/'+id+'/history/1/restore',{'revision':1,'approve':True},ah,403)
 call('/api/apps/site_forms/entities/inbox',{'id':id,'revision':1,'fields':submission['fields']},ah,403)
 call('/store-api/apps/site_forms/actions/submit',{**submission,'fields':{**submission['fields'],'answers':{'injected':'no'}}},ch,400)
 call('/api/workspace/roles/no_pii',{'revision':0,'data':{'name':{'en-GB':'Content editor'},'permissions':['catalog.read','apps.read','apps.manage','channels.read','channels.manage','assistant.use'],'active':True}},ah,method='PUT')
 invitation=call('/api/workspace/invitations',{'role':'no_pii','email':uuid.uuid4().hex+'@example.test'},ah)
 editor=call('/api/auth/accept',{'invitationToken':invitation['token'],'name':'Content editor','password':'Synthetic-workspace-2026!'})
 eh=headers(editor)
 call('/api/apps/site_forms/actions/responses',{},eh,403)
 call('/api/apps/site_forms/entities/inbox/'+id+'/history',h=eh,status=403)
 assert not any('site_forms:inbox:' in c['key'] for c in call('/api/environments/'+stage+'/diff',h=ah)['changes'])
 import time
 for _ in range(100):
  jobs=call('/api/automation',h=ah)['jobs']
  if any(j['flow']=='form_review' and j['state']=='completed' for j in jobs):break
  time.sleep(.05)
 assert any(j['flow']=='form_review' and j['state']=='completed' for j in jobs),jobs
 print('PASS published form → native cart → private append-only app inbox; no public read, PII bypass, mutation or release of operational answers')
 state['fields']=staged
 plan=call('/api/merchant/site/plan',{'id':'home','revision':stage_revision,'instruction':'Make it airier','urls':['http://127.0.0.1/private'],'style':True,'content':True},sh)
 assert len(plan['variants'])==2 and plan['approvalRequired'];assert rows(sh)[0]['content']['blocks'][0]['text']['de-DE']=='Neue Kollektion'
 task=plan['variants'][0]['taskId'];call('/api/merchant/site/apply',{'taskId':task,'approve':True},sh)
 assert next(p for p in rows(sh) if p['id']=='home')['content']['blocks'][0]['text']['de-DE']=='Vom Agenten vorbereitet'
 assert next(p for p in rows(public,True) if p['id']=='home')['content']['blocks'][0]['text']['de-DE']=='Neue Kollektion'
 call('/api/merchant/site/apply',{'taskId':plan['variants'][1]['taskId'],'approve':True},sh,409)
 call('/api/merchant/site/plan',{'id':'home','revision':5,'instruction':'Live changes'},ah,400)
 current=next(p for p in rows(sh) if p['id']=='home');state['fields']=current
 # Deselected content must preserve product selection, text, image and form definitions despite model attempts.
 locked=call('/api/merchant/site/plan',{'id':'home','revision':stage_revision+1,'instruction':'Only change spacing','style':True,'content':False,'structure':False},sh)
 assert all(v['fields']['content']==current['content'] for v in locked['variants'])
 state['selected']=True
 section=call('/api/merchant/site/plan',{'id':'home','revision':stage_revision+1,'selected':'hero','instruction':'Improve this headline','style':True,'content':True},sh)
 assert all(v['fields']['theme']==current['theme'] and len(v['fields']['content']['blocks'])==3 for v in section['variants'])
 state['unavailable']=True
 call('/api/merchant/site/plan',{'id':'home','revision':stage_revision+1,'instruction':'Provider unavailable'},sh,502)
 assert next(p for p in rows(sh) if p['id']=='home')['revision']==stage_revision+1
 assert seen
 print('PASS synthetic model HTTP → validated alternatives → existing review task → explicit sandbox apply; reference SSRF fenced, live untouched and stale alternative rejected')
finally:stop(process);log.close();model.shutdown()
