#!/usr/bin/env python3
"""Native AI proposal contract with local model HTTP, real Rust/SQL and no paid model calls."""
import copy,json,os,socket,subprocess,threading,urllib.request,urllib.error,uuid
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from testing.runtime import ROOT,serve,stop
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
   if state['invalid']:edits=[('/entities/0/fields',[])]
   out={'message':{'content':json.dumps({'patch':[{'op':'add','path':path,'valueJson':json.dumps(value)} for path,value in edits],'summary':m['name']})},'done_reason':'stop'}
  self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(out).encode())
model=ThreadingHTTPServer(('127.0.0.1',0),Model);threading.Thread(target=model.serve_forever,daemon=True).start()
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
base=f'http://127.0.0.1:{port}';env={**os.environ,'BIND_ADDR':f'127.0.0.1:{port}','OLLAMA_URL':f'http://127.0.0.1:{model.server_port}','PROCESS_ROLE':'all'}
(ROOT/'artifacts').mkdir(exist_ok=True);log=(ROOT/'artifacts/app-generation.log').open('w');process=serve(env,base,log);headers={}
def call(path,body=None,expected=200):
 r=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**headers})
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
finally:stop(process);log.close();model.shutdown()
