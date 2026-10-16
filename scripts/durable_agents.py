#!/usr/bin/env python3
"""Actual HTTP/PostgreSQL task continuation, killed Rust workers, current rights and no unapproved mutations; synthetic model only."""
import concurrent.futures
import json
import os
import signal
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request
import uuid
from testing.native_tools import response as native_response
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from testing.runtime import ROOT, serve, stop
from testing.database import psql
from testing.pooler import Pooler

env=dict(os.environ); processes=[]; logs=[]; checks=[]; poolers=[]
started=threading.Event(); release=threading.Event(); captured=[]; mode={'block':True,'price':73.21}
def port():
    with socket.socket() as s:
        s.bind(('127.0.0.1',0)); return s.getsockname()[1]
def sql(statement):
    return subprocess.check_output(psql(env['DB_CONTAINER'],'commerce',env['TEST_DATABASE'],'-XqAt','-v','ON_ERROR_STOP=1'),input="BEGIN; SELECT set_config('rac.system','on',true); "+statement+"; COMMIT;",text=True).strip().splitlines()[-1:][0]
class Model(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def do_POST(self):
        body=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        assert 'ADMINISTRATION' in body['instructions'] and 'CSV' in body['instructions'] and 'sandbox=' in body['instructions']
        read=bool(body.get('tools'))
        captured.append('read' if read else 'final')
        if mode.get('unavailable'):
            self.send_response(503);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b'{"error":"synthetic outage"}');return
        source=mode.get('source')
        source_read=read and source and not any(v.get('type')=='function_call_output' for v in body.get('input',[]) if isinstance(v,dict))
        if read and source and not source_read and mode.get('blockSource'):
            started.set();release.wait(40)
        if not read and mode['block']:
            started.set(); release.wait(40)
        value={'tool_calls':[{'name':'knowledge.source.detail','arguments_json':json.dumps({'id':source})}] if source_read else []} if read else {'summary':'Synthetic durable proposal; not live inference.','changes':[{'product_id':'lamp','price':mode['price']}],'experience':None,'expected_experience_revision':None}
        answer={'status':'completed','output':[{'type':'message','content':[{'type':'output_text','text':json.dumps(value)}]}],'usage':{'input_tokens':10,'output_tokens':20}}
        if read: answer=native_response(body,value)
        try:
            self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(answer).encode())
        except (BrokenPipeError,ConnectionResetError): pass
provider=ThreadingHTTPServer(('127.0.0.1',0),Model)
threading.Thread(target=provider.serve_forever,daemon=True).start()
env.update(OPENAI_API_KEY='synthetic-durable-model',OPENAI_BASE_URL=f'http://127.0.0.1:{provider.server_address[1]}/v1',DB_POOL_MAX='4',BOOTSTRAP_MODE='serve')
def start(role):
    base=f'http://127.0.0.1:{port()}'
    log=(ROOT/'artifacts'/f'durable-agent-{len(logs)}.log').open('w');logs.append(log)
    child={**env,'PROCESS_ROLE':role,'BIND_ADDR':base.removeprefix('http://')}
    if role.endswith('-worker'):
        process=subprocess.Popen([str(ROOT/'target/debug/veyndo')],cwd=ROOT,env=child,stdout=log,stderr=log)
    else:
        process=serve(child,base,log)
    processes.append(process);return process,base
def call(base,path,body=None,h=None,expected=200,method=None):
    req=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method)
    try:
        with urllib.request.urlopen(req,timeout=30) as response: status=response.status;value=json.load(response)
    except urllib.error.HTTPError as error:status=error.code;value=json.load(error)
    assert status==expected,(path,status,expected,value)
    return value
def passed(name):checks.append(name); print('PASS',name,flush=True)
try:
    if env.get('TEST_TRANSACTION_POOLING') == '1' and not env.get('DATABASE_RUNTIME_URL'):
        direct = env['DATABASE_URL']; pooler = Pooler(direct); poolers.append(pooler)
        env.update(DATABASE_URL=pooler.url, DATABASE_LISTENER_URL=direct, DB_POOLER_MODE='transaction')
    http,base=start('http'); worker,_=start('agent-worker')
    # Personal identity is real. Give this synthetic fixture an existing isolated catalog through native membership.
    suffix=uuid.uuid4().hex[:12]
    account=call(base,'/api/auth/register',{'name':'Durable fixture','email':suffix+'@example.test','password':'Synthetic-agent-2026!','workspaceId':'durable-'+suffix})
    actor=account['user']['id']; tenant='workshop'
    sql(f"INSERT INTO memberships(tenant,user_id,role) VALUES('{tenant}','{actor}','owner')")
    h={'Authorization':'Bearer '+account['token'],'x-tenant':tenant}
    before=call(base,'/api/merchant/products/lamp',h=h)['commerce']['price']
    turn={'message':'Prepare lamp price; do not apply.','background':True,'requestId':uuid.uuid4().hex,'inference':{'provider':'openai'}}
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        repeated=list(executor.map(lambda _:call(base,'/api/agent/chat',turn,h),range(2)))
    queued=repeated[0]
    run_id=queued['run']['taskId']; conversation=queued['conversationId']
    assert repeated[1]['run']['taskId']==run_id and repeated[1]['conversationId']==conversation,repeated
    assert sql(f"SELECT count(*) FROM tasks WHERE tenant='{tenant}' AND run_key='{turn['requestId']}'")=='1'
    assert sql(f"SELECT count(*) FROM chat_messages WHERE tenant='{tenant}' AND conversation_id='{conversation}' AND role='user'")=='1'
    call(base,'/api/agent/chat',{**turn,'message':'Changed input must not reuse the same key'},h,409)
    assert sql(f"SELECT count(*) FROM conversations WHERE tenant='{tenant}' AND owner_id='{actor}'")=='1'
    passed('Concurrent transport retries reuse one native task, conversation and user turn; a changed request cannot reuse its ID')
    assert queued['messages'][-1]['data']['runId']==run_id
    assert started.wait(15),'worker never reached final inference'
    checkpoint=json.loads(sql(f"SELECT run_checkpoint::text FROM tasks WHERE tenant='{tenant}' AND id='{run_id}'"))
    assert 'context' in checkpoint and sum(k.startswith('model-') for k in checkpoint)==1
    passed('Native chat is durably queued and its first completed model step is stored before final inference')
    dead_model_lease=sql(f"SELECT id FROM resource_leases WHERE tenant='{tenant}' AND class='model' ORDER BY expires_at DESC LIMIT 1")
    worker.kill();worker.wait(timeout=10)
    # Advance only this disposable job and its killed process's model lease clocks.
    sql(f"UPDATE resource_leases SET expires_at=now()-interval '1 second' WHERE id='{dead_model_lease}'")
    sql(f"UPDATE tasks SET run_until=now()-interval '1 second' WHERE tenant='{tenant}' AND id='{run_id}'")
    worker2,_=start('agent-worker')
    def status():return call(base,f'/api/agent/runs/{run_id}',h=h)
    def until(state):
        for _ in range(120):
            value=status()
            if value['state']==state:return value
            time.sleep(.1)
        raise AssertionError(value)
    uncertain=until('uncertain')
    time.sleep(.3);assert captured==['read','final'],captured
    assert 'run_checkpoint' not in json.dumps(uncertain) and 'synthetic-durable-model' not in json.dumps(uncertain)
    passed('A killed worker becomes explicitly uncertain; another worker does not repeat an ambiguous paid call or expose checkpoints')
    stop(http);http,base=start('http')
    restored=call(base,f'/api/agent/conversations/{conversation}',h=h)
    assert restored['run']['state']=='uncertain' and restored['messages'][0]['data']['runId']==run_id
    call(base,f'/api/agent/runs/{run_id}/resume',{'revision':uncertain['revision'],'approve':False},h,409)
    call(base,f'/api/agent/runs/{run_id}/resume',{'revision':1,'approve':True},h,409)
    mode['block']=False;release.set()
    call(base,f'/api/agent/runs/{run_id}/resume',{'revision':uncertain['revision'],'approve':True},h)
    ready=until('ready');assert captured==['read','final','final'],captured
    assert ready['completedModelSteps']==2 and ready['preview']['proposal']['changes'][0]['expected_revision']>0
    assert call(base,'/api/merchant/products/lamp',h=h)['commerce']['price']==before
    assert call(base,f'/api/agent/tasks/{run_id}/apply',{'approve':True},h)['applied']
    assert call(base,'/api/merchant/products/lamp',h=h)['commerce']['price']==mode['price']
    progress=json.loads(sql(f"SELECT json_agg(data->>'state' ORDER BY id) FROM outbox WHERE tenant='{tenant}' AND kind='intelligence.run.changed' AND data->>'taskId'='{run_id}'"))
    assert progress==['queued','running','uncertain','queued','running','ready'],progress
    passed('After HTTP and worker restart, explicit continuation reuses the completed call and only original native approval changes price')
    other=call(base,'/api/auth/register',{'name':'Other actor','email':'other-'+suffix+'@example.test','password':'Synthetic-agent-2026!','workspaceId':'other-'+suffix})
    other_h={'Authorization':'Bearer '+other['token'],'x-tenant':other['workspace']}
    call(base,f'/api/agent/runs/{run_id}',h=other_h,expected=404)
    sql(f"INSERT INTO memberships(tenant,user_id,role) VALUES('{tenant}','{other['user']['id']}','owner')")
    call(base,f'/api/agent/runs/{run_id}',h={**other_h,'x-tenant':tenant},expected=403)
    call(base,f'/api/agent/conversations/{conversation}',h={**other_h,'x-tenant':tenant},expected=404)
    passed('Run progress, private evidence and conversations reject both foreign tenants and another actor in the same shop')
    # Hold final inference, revoke the initiating credential, then let the original result arrive.
    mode['block']=True;release.clear();started.clear()
    revoked=call(base,'/api/agent/chat',{'message':'Revoke during a model call','background':True,'inference':{'provider':'openai'}},h)
    revoked_id=revoked['run']['taskId'];assert started.wait(15)
    call(base,'/api/auth/logout',{},h)
    release.set();mode['block']=False
    for _ in range(120):
        state=sql(f"SELECT run_state FROM tasks WHERE tenant='{tenant}' AND id='{revoked_id}'")
        if state not in ['queued','running']:break
        time.sleep(.1)
    assert state=='uncertain',state
    assert sql(f"SELECT proposal='{{}}'::jsonb FROM tasks WHERE tenant='{tenant}' AND id='{revoked_id}'")=='t'
    passed('Revocation during inference fences the late result and produces no executable proposal')
    session=call(base,'/api/auth/login',{'email':account['user']['email'],'password':'Synthetic-agent-2026!'})
    h['Authorization']='Bearer '+session['token']
    old=call(base,f'/api/agent/runs/{revoked_id}',h=h)
    call(base,f'/api/agent/runs/{revoked_id}/cancel',{'revision':old['revision'],'approve':True},h)
    call(base,f'/api/agent/runs/{revoked_id}/resume',{'revision':old['revision']+1,'approve':True},h,409)
    assert call(base,f'/api/agent/runs/{revoked_id}',h=h)['state']=='cancelled'
    passed('A renewed personal session can explicitly cancel its saved run; cancellation cannot be resumed or published')
    minimal=call(base,'/api/workspace/integrations',{'name':'Durable minimal key','expiresInDays':1,'permissions':['assistant.use','catalog.read','orders.read','knowledge.read']},h)
    kh={'Authorization':'Bearer '+minimal['key'],'x-tenant':tenant}
    key_run=call(base,'/api/agent/runs',{'instruction':'Prepare a bounded proposal','inference':{'provider':'openai'}},kh)
    for _ in range(150):
        key_status=call(base,'/api/agent/runs/'+key_run['taskId'],h=kh)
        if key_status['state'] not in ['queued','running']:break
        time.sleep(.1)
    assert key_status['state']=='ready',key_status
    call(base,'/api/workspace/integrations/'+minimal['id'],h=h,method='DELETE')
    call(base,'/api/agent/runs/'+key_run['taskId'],h=kh,expected=401)
    passed('An unchanged minimal integration key reaches inference with inherited read aliases; key revocation remains authoritative')
    # A role change must close both GET and POST history consumers before either can return prior evidence.
    sql(f"UPDATE memberships SET role='viewer',permissions='[\"assistant.use\",\"catalog.read\",\"orders.read\",\"knowledge.read\"]'::jsonb WHERE tenant='{tenant}' AND user_id='{actor}'")
    call(base,f'/api/agent/conversations/{conversation}',h=h,expected=403)
    count=sql(f"SELECT count(*) FROM tasks WHERE tenant='{tenant}'")
    call(base,'/api/agent/chat',{'conversationId':conversation,'message':'Do not disclose earlier evidence','background':True},h,403)
    assert sql(f"SELECT count(*) FROM tasks WHERE tenant='{tenant}'")==count
    sql(f"UPDATE memberships SET role='owner',permissions='null'::jsonb WHERE tenant='{tenant}' AND user_id='{actor}'")
    passed('Withdrawing permissions blocks both conversation reads and new turns before history disclosure or another queued run')
    # The source is deliberately absent from the initial search and discovered only through a model-selected read.
    doc=call(base,'/api/knowledge/documents',{'title':'XylophonicEvidence','content':'UnrelatedReferenceMarker confidential historical evidence.','locale':'en-GB','kind':'manual'},h)
    mode.update(source=doc['id'],blockSource=True,block=False);started.clear();release.clear()
    discovered=call(base,'/api/agent/chat',{'message':'Prepare a bounded proposal','background':True,'inference':{'provider':'openai'}},h)
    source_run=discovered['run']['taskId'];assert started.wait(15)
    frozen=json.loads(sql(f"SELECT run_checkpoint::text FROM tasks WHERE tenant='{tenant}' AND id='{source_run}'"))
    assert doc['id'] not in json.dumps(frozen['context']['documentSources'])
    assert any(k.startswith('read-') for k in frozen)
    dead_model_lease=sql(f"SELECT id FROM resource_leases WHERE tenant='{tenant}' AND class='model' ORDER BY expires_at DESC LIMIT 1")
    worker2.kill();worker2.wait(timeout=10)
    sql(f"UPDATE resource_leases SET expires_at=now()-interval '1 second' WHERE id='{dead_model_lease}'")
    sql(f"UPDATE tasks SET run_until=now()-interval '1 second' WHERE tenant='{tenant}' AND id='{source_run}'")
    worker3,_=start('agent-worker')
    for _ in range(150):
        frozen_status=call(base,'/api/agent/runs/'+source_run,h=h)
        if frozen_status['state']=='uncertain':break
        time.sleep(.1)
    assert frozen_status['state']=='uncertain'
    source_tool={'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'knowledge.source.archive','arguments':{'id':doc['id'],'revision':1,'archived':True,'approve':True}}}
    assert not call(base,'/mcp',source_tool,h).get('result',{}).get('isError')
    calls_before=len(captured);mode['blockSource']=False;release.set()
    call(base,'/api/agent/runs/'+source_run+'/resume',{'revision':frozen_status['revision'],'approve':True},h)
    for _ in range(150):
        stopped=call(base,'/api/agent/runs/'+source_run,h=h)
        if stopped['state']=='failed':break
        time.sleep(.1)
    assert stopped['state']=='failed' and stopped['error']['status']==409 and len(captured)==calls_before,(stopped,captured)
    assert sql(f"SELECT proposal='{{}}'::jsonb FROM tasks WHERE tenant='{tenant}' AND id='{source_run}'")=='t'
    mode.pop('source');
    passed('A separately discovered source is reauthorized on continuation; archiving it stops before any further model call')
    # Also fence evidence supplied in the initial prompt under the real worker's SQL authority.
    pinned=call(base,'/api/knowledge/documents',{'title':'PinnedNativeEvidence','content':'PinnedNativeEvidenceMarker confidential source.','locale':'en-GB','kind':'manual'},h)
    mode['block']=True;started.clear();release.clear()
    queued=call(base,'/api/agent/runs',{'instruction':'Use PinnedNativeEvidenceMarker for a bounded proposal','inference':{'provider':'openai'}},h)
    assert started.wait(15)
    frozen=json.loads(sql(f"SELECT run_checkpoint::text FROM tasks WHERE tenant='{tenant}' AND id='{queued['taskId']}'"))
    assert any(s.get('documentId')==pinned['id'] for s in frozen['context']['documentSources'])
    call(base,'/api/knowledge/documents/'+pinned['id']+'/lifecycle',{'revision':1,'archived':True,'approve':True},h)
    mode['block']=False;release.set()
    for _ in range(150):
        stopped=call(base,'/api/agent/runs/'+queued['taskId'],h=h)
        if stopped['state'] not in ['queued','running']:break
        time.sleep(.1)
    # The provider was called but its output cannot be checkpointed after withdrawal.
    # Preserve the native uncertain-call boundary instead of making it automatically retryable.
    assert stopped['state']=='uncertain' and stopped['error']['status']==409 and stopped['preview'] is None,stopped
    assert sql(f"SELECT proposal='{{}}'::jsonb FROM tasks WHERE tenant='{tenant}' AND id='{queued['taskId']}'")=='t'
    calls_before=len(captured);time.sleep(.3);assert len(captured)==calls_before
    passed('An archived prompt source fences proposal persistence and leaves its uncheckpointed provider call explicitly uncertain without replay')
    wire={'jsonrpc':'2.0','id':1,'method':'tools/list'}
    tools=call(base,'/mcp',wire,h)['result']['tools']
    assert {'merchant.run.create','merchant.run.status','merchant.run.cancel','merchant.run.resume'} <= {t['name'] for t in tools}
    assert next(t for t in tools if t['name']=='merchant.run.status')['annotations']['readOnlyHint']
    passed('The same native run contract is discoverable through MCP with conservative read/write metadata')
    mode['unavailable']=True
    call(base,'/api/agent/plan',{'instruction':'Synthetic unavailable provider','inference':{'provider':'openai'}},h,502)
    result=call(base,'/mcp',{'jsonrpc':'2.0','id':2,'method':'tools/call','params':{'name':'merchant.plan','arguments':{'instruction':'Synthetic unavailable provider'}}},h)
    assert result['result']['isError'],result
    mode['unavailable']=False
    passed('Synchronous HTTP planning and MCP retain failure responses while the stopped native run remains saved')
    # A lost response must remain recoverable after the committed request consumes the final daily attempt.
    sql(f"INSERT INTO tenant_resource_limits(tenant,daily_ai) VALUES('{tenant}',1) ON CONFLICT(tenant) DO UPDATE SET daily_ai=1")
    for path,body in [('/api/agent/chat',{'message':'At most one budgeted turn','background':True,'inference':{'provider':'openai'}}),('/api/agent/runs',{'instruction':'At most one budgeted run','inference':{'provider':'openai'}})]:
        sql(f"DELETE FROM tenant_ai_usage WHERE tenant='{tenant}'")
        body={**body,'requestId':uuid.uuid4().hex}
        first=call(base,path,body,h);replay=call(base,path,body,h)
        assert (first.get('run',first))['taskId']==(replay.get('run',replay))['taskId']
        assert sql(f"SELECT attempts FROM tenant_ai_usage WHERE tenant='{tenant}' AND day=(now() AT TIME ZONE 'UTC')::date")=='1'
        call(base,path,{**body,'requestId':uuid.uuid4().hex},h,429)
    passed('At the final daily quota, accepted chat/API retries return the original run without another attempt; new work is rejected')
    def streamed(body):
        request=urllib.request.Request(base+'/api/agent/chat/stream',data=json.dumps(body).encode(),headers={'Content-Type':'application/json',**h})
        try:
            with urllib.request.urlopen(request,timeout=30) as response:
                frames=response.read().decode();assert response.headers['content-type'].startswith('text/event-stream')
        except urllib.error.HTTPError as error:
            assert error.code==429;return json.load(error)
        terminal=[frame for frame in frames.split('\n\n') if 'event: complete' in frame or 'event: error' in frame][-1]
        return json.loads(next(line.removeprefix('data: ') for line in terminal.splitlines() if line.startswith('data: ')))
    sql(f"DELETE FROM tenant_ai_usage WHERE tenant='{tenant}'")
    body={'message':'One SSE attempt','background':True,'inference':{'provider':'openai'},'requestId':uuid.uuid4().hex}
    first=streamed(body);replay=streamed(body)
    assert first['run']['taskId']==replay['run']['taskId']
    assert sql(f"SELECT attempts FROM tenant_ai_usage WHERE tenant='{tenant}' AND day=(now() AT TIME ZONE 'UTC')::date")=='1'
    assert streamed({**body,'requestId':uuid.uuid4().hex})['errors'][0]['status']==429
    passed('The retained SSE adapter shares replay-before-quota admission and never double-counts the queued run')
    print(json.dumps({'suite':'durable_agents','passed':len(checks),'checks':checks,'realPostgreSQL':True,'actualWorkerKilled':True,'acceleratedDisposableLeaseClock':True,'paidCalls':0,'liveModel':False},indent=2))
finally:
    release.set()
    for process in reversed(processes):stop(process)
    for log in logs:log.close()
    for pooler in poolers:pooler.close()
    provider.shutdown()
