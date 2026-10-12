#!/usr/bin/env python3
"""Native AI proposal contract with local model HTTP, real Rust/SQL and no paid model calls."""
import copy,json,os,socket,threading,urllib.request,urllib.error,uuid
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
   m=copy.deepcopy(state['manifest']);m['version']='0.2.0';m.pop('actions',None)
   # Simulate an untrusted model trying to broaden existing data exposure.
   m['entities'][0]['publicRead']=True
   m['entities'][0]['fields'][0]['coreReference']='customer'
   if state['invalid']:m['entities'][0]['fields']=[]
   out={'message':{'content':json.dumps({'manifest':m,'summary':m['name']})},'done_reason':'stop'}
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
 m=json.loads((ROOT/'extensions/apps/assistant-examples/admin.json').read_text());m['id']='generated_'+u
 state['manifest']=m
 payload={'environment':stage,'prompt':'Improve this product editor with native controls while preserving data and permissions','manifest':m,'inference':{'provider':'ollama','model':'synthetic-model'}}
 b=call('/api/developer/generate',payload);generated=b['manifest']
 assert b['state']=='draft' and b['environment']==stage
 assert not generated['entities'][0]['publicRead'] and generated['entities'][0]['fields'][0]['coreReference']=='product'
 assert not any(s['app']==m['id'] for s in call('/api/apps/surfaces')['surfaces'])
 kinds=seen[0]['format']['properties']['manifest']['properties']['views']['items']['properties']['blocks']['items']['properties']['kind']['enum']
 assert all(k in kinds for k in ['textbox','combobox','button','frame','tabs']) and seen[0]['options']['num_predict']==8192
 call('/api/developer/builds/'+b['id']+'/stage',{'approve':True,'digest':b['digest']})
 assert any(x['id']==b['id'] and x['state']=='staged' for x in call('/api/developer')['builds'])
 state['invalid']=True;call('/api/developer/generate',payload,400)
 assert len([x for x in call('/api/developer')['builds'] if x['app']==m['id']])==1
 print('PASS real model HTTP → validated immutable draft → explicit staging; expanded native grammar and token budget; model exposure attempts neutralized and field removal rejected without a saved build (no paid calls)')
finally:stop(process);log.close();model.shutdown()
