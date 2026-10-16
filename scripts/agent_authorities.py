#!/usr/bin/env python3
"""Real HTTP/PostgreSQL agent-key allocations, two replicas, stop, revocation and restart; local model only."""
import concurrent.futures
import json
import os
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from testing.database import psql
from testing.runtime import ROOT, serve, stop

env=dict(os.environ); processes=[]; logs=[]; checks=[]; captured=[]
started=threading.Event(); release=threading.Event(); release.set()
class Model(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def do_POST(self):
        body=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        captured.append(body);started.set();release.wait(20)
        value={'supported':True,'criteria':{'search':'lamp'}}
        result={'done':True,'message':{'content':json.dumps(value)},'eval_count':20,'prompt_eval_count':10}
        try:
            self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(result).encode())
        except (BrokenPipeError,ConnectionResetError):pass
provider=ThreadingHTTPServer(('127.0.0.1',0),Model)
threading.Thread(target=provider.serve_forever,daemon=True).start()
env.update(OLLAMA_URL=f'http://127.0.0.1:{provider.server_address[1]}',OLLAMA_MODEL='fixture-agent',DB_POOL_MAX='4',BOOTSTRAP_MODE='serve',PROCESS_ROLE='http')
def port():
    with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
def start():
    base=f'http://127.0.0.1:{port()}'
    log=(ROOT/'artifacts'/f'agent-authority-{len(logs)}.log').open('w');logs.append(log)
    process=serve({**env,'BIND_ADDR':base.removeprefix('http://')},base,log);processes.append(process)
    return process,base
def call(base,path,body=None,h=None,expected=200,method=None):
    request=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method)
    try:
        with urllib.request.urlopen(request,timeout=25) as response:status=response.status;value=json.load(response)
    except urllib.error.HTTPError as error:
        status=error.code;raw=error.read().decode()
        try:value=json.loads(raw)
        except json.JSONDecodeError:value={'detail':raw}
    if expected is None:return status,value
    assert status==expected,(path,status,expected,value)
    return value
def sql(statement):
    out=subprocess.check_output(psql(env['DB_CONTAINER'],'commerce',env['TEST_DATABASE'],'-XqAt','-v','ON_ERROR_STOP=1'),input="BEGIN; SELECT set_config('rac.system','on',true); "+statement+"; COMMIT;",text=True)
    return out.strip().splitlines()[-1]
def passed(name):checks.append(name);print('PASS',name,flush=True)
def stop_while_commerce_holds_reference(base,h,status,tenant):
    # A native worker can already hold a task row while its outbox insert takes
    # the tenant FK's KEY SHARE. Stop must not invert that order by taking a
    # conflicting tenant UPDATE lock before cancelling tasks.
    app='agent-reference-'+uuid.uuid4().hex
    guard=subprocess.Popen(psql(env['DB_CONTAINER'],'commerce',env['TEST_DATABASE'],'-XqAt','-v','ON_ERROR_STOP=1','-c',f"BEGIN; SELECT set_config('rac.system','on',true),set_config('application_name','{app}',true); SELECT id FROM tenants WHERE id='{tenant}' FOR KEY SHARE; SELECT pg_sleep(30); COMMIT;"),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    executor=concurrent.futures.ThreadPoolExecutor(max_workers=1)
    try:
        for _ in range(100):
            if sql(f"SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='{app}' AND wait_event='PgSleep')")=='t':break
            assert guard.poll() is None,'Reference-lock fixture exited early'
            time.sleep(.02)
        else:raise AssertionError('Reference lock was not acquired')
        return executor.submit(call,base,'/api/agent/control',{'stopped':True,'revision':status['revision'],'approve':True},h).result(timeout=8)
    finally:
        sql(f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=current_database() AND application_name='{app}'")
        if guard.poll() is None:guard.terminate()
        guard.wait(timeout=5)
        executor.shutdown(wait=True)
try:
    http,base=start();other,base2=start()
    suffix=uuid.uuid4().hex[:12]
    account=call(base,'/api/auth/register',{'name':'Agent control fixture','email':suffix+'@example.test','password':'Synthetic-agent-control-2026!','workspaceId':'agents-'+suffix})
    tenant='agents-'+suffix
    # Own fresh shop: neither its daily quota nor active-key count depends on
    # earlier suites. Only this fixture's isolated shop allowance is configured.
    sql(f"INSERT INTO tenant_resource_limits(tenant,daily_ai) VALUES('{tenant}',1000) ON CONFLICT(tenant) DO UPDATE SET daily_ai=1000")
    h={'Authorization':'Bearer '+account['token'],'x-tenant':tenant}
    scopes=['assistant.use','catalog.read','orders.read','knowledge.read']
    budget={'provider':'ollama','model':'fixture-agent','tokens':1_000_000,'costMicros':1_000_000,'pricePerMillionMicros':1000}
    def key(**changes):
        b={**budget,**changes}
        return call(base,'/api/workspace/integrations',{'name':'Synthetic bounded agent','permissions':scopes,'expiresInDays':1,'agentBudget':b},h)
    def headers(k):return {'Authorization':'Bearer '+k['key'],'x-tenant':tenant}
    def run(k,expected=200):return call(base,'/api/agent/runs',{'instruction':'Read the lamp, never apply changes.','inference':{'provider':'ollama','model':'fixture-agent'}},headers(k),expected)
    def grid(url,k,expected=200):return call(url,'/api/merchant/grid/plan',{'entity':'products','instruction':'Find lamp','locale':'en-GB'},headers(k),expected)
    for invalid in [0,-1,1.5,1_000_000_000_001]:
        call(base,'/api/workspace/integrations',{'name':'Invalid budget','permissions':scopes,'expiresInDays':1,'agentBudget':{**budget,'tokens':invalid}},h,400 if invalid>=0 and isinstance(invalid,int) else 422)
    legacy=call(base,'/api/workspace/integrations',{'name':'Ordinary API','permissions':scopes,'expiresInDays':1},h)
    run(legacy,403)
    call(base,'/api/workspace/integrations',{'name':'Unsafe planning delegation','permissions':['catalog.write'],'expiresInDays':1,'agentBudget':budget},h,403)
    k=key();kh=headers(k)
    call(base,'/store-api/checkout/order',{},kh,403)
    call(base,'/api/workspace/integrations',{'name':'No credential delegation'},kh,403)
    discovery=call(base,'/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/list'},kh)['result']['tools']
    assert not any(t['name']=='checkout.complete' or t['name'].startswith('app.') for t in discovery)
    denied=call(base,'/mcp',{'jsonrpc':'2.0','id':2,'method':'tools/call','params':{'name':'checkout.complete','arguments':{}}},kh)
    assert 'error' in denied or denied.get('result',{}).get('isError'),denied
    passed('Planning-only scope rejects commerce writes and credential delegation consistently through HTTP and MCP discovery/invocation')
    grid(base,k)
    listing=call(base,'/api/workspace/integrations',h=h)['elements'];saved=next(x for x in listing if x['id']==k['id'])
    assert saved['agentBudget']==budget and 'key' not in saved
    allocated=saved['agentUsage']['tokensAllocated'];assert allocated>6096
    assert sql(f"SELECT count(*) FROM outbox WHERE tenant='{tenant}' AND kind='intelligence.agent.allocated' AND data->>'agentId'='{k['id']}'")=='1'
    passed('Named agent identity reuses key ownership; explicit provider/model/budgets and durable audit precede actual model egress')
    # Leave exactly one request envelope. Two HTTP replicas race while the admitted
    # provider request stays blocked; the other must fail before provider egress.
    sql(f"UPDATE integration_keys SET agent_tokens_allocated={budget['tokens']-allocated} WHERE tenant='{tenant}' AND id='{k['id']}'")
    before=len(captured);release.clear();started.clear()
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        a=executor.submit(grid,base,k,None);b=executor.submit(grid,base2,k,None)
        assert started.wait(10)
        # Either replica may win. Collect statuses without assuming scheduling order.
        release.set()
        outcomes=[f.result() for f in (a,b)]
        assert sorted(status for status,_ in outcomes)==[200,429],outcomes
    assert len(captured)==before+1,captured
    assert sql(f"SELECT agent_tokens_allocated FROM integration_keys WHERE tenant='{tenant}' AND id='{k['id']}'")==str(budget['tokens'])
    passed('Two Rust HTTP replicas share one locked allowance; at most one actual provider request consumes the final envelope')
    stop(http);http,base=start();grid(base,k,429)
    assert len(captured)==before+1
    passed('Restart preserves an exhausted allocation and refuses further provider calls')
    cheap=key(costMicros=1);before=len(captured);grid(base,cheap,429);assert len(captured)==before
    mismatch=key(model='not-approved');run(mismatch,403);assert len(captured)==before
    passed('Independent money allocation and exact-model mismatch fail before provider egress')
    active=key();queued=run(active);sibling=key()
    assert queued['agentId']==active['id']
    assert call(base,'/api/agent/runs/'+queued['taskId'],h=headers(active))['agentId']==active['id']
    call(base,'/api/agent/runs/'+queued['taskId'],h=headers(sibling),expected=403)
    call(base,'/api/agent/runs/'+queued['taskId'],h=headers(legacy),expected=403)
    replay_body={'requestId':uuid.uuid4().hex,'instruction':'Same request ID belongs to each agent independently'}
    first=call(base,'/api/agent/runs',replay_body,headers(active))
    second=call(base,'/api/agent/runs',replay_body,headers(sibling))
    assert first['taskId']!=second['taskId']
    assert call(base,'/api/agent/runs',replay_body,headers(active))['taskId']==first['taskId']
    chat=call(base,'/api/agent/chat',{'message':'Private agent conversation','background':True},headers(active))
    own=call(base,'/api/agent/conversations/'+chat['conversationId'],h=headers(active))
    assert 'Private agent conversation' in json.dumps(own)
    call(base,'/api/agent/conversations/'+chat['conversationId'],h=headers(sibling),expected=404)
    passed('Two agent identities sharing a human creator cannot read each other’s tasks or conversations; request IDs deduplicate only their own work')
    status=call(base,'/api/agent/control',h=h)
    stage=call(base,'/api/environments',{'name':'Agent stop fixture'},h)['id']
    call(base,'/api/workspace/integrations',{'name':'No sandbox credential','permissions':scopes,'expiresInDays':1,'agentBudget':budget},dict(h,**{'x-tenant':stage}),403)
    assert sql(f"SELECT count(*) FROM integration_keys WHERE tenant='{stage}' AND agent_budget IS NOT NULL")=='0'
    queued_stage=call(base,'/api/agent/runs',{'instruction':'Read only in the private test'},dict(h,**{'x-tenant':stage}))
    call(base,'/api/agent/control',h=kh,expected=403)
    call(base,'/api/agent/control',{'stopped':True,'revision':status['revision'],'approve':False},h,400)
    paused=stop_while_commerce_holds_reference(base,h,status,tenant)
    assert paused['stopped'] and paused['cancelled']>=2
    passed('Native stop commits while a commerce foreign-key reference is held; no tenant/task lock inversion')
    assert call(base,'/api/agent/runs/'+queued['taskId'],h=h)['state']=='cancelled'
    assert call(base,'/api/agent/runs/'+queued_stage['taskId'],h=dict(h,**{'x-tenant':stage}))['state']=='cancelled'
    call(base,'/api/merchant/products',h=headers(active),expected=403)
    call(base,'/api/agent/runs',{'instruction':'New work is stopped'},h,403)
    call(base,'/api/agent/control',{'stopped':False,'revision':status['revision'],'approve':True},h,409)
    call(base,'/api/agent/control',{'stopped':False,'revision':paused['revision'],'approve':True},h)
    assert call(base,'/api/agent/runs/'+queued['taskId'],h=h)['state']=='cancelled'
    passed('Personal CAS/approval stop spans live and private tasks; agent keys cannot lift it and cancelled work never restarts on enable')
    foreign=call(base,'/api/auth/register',{'name':'Foreign fixture','email':'foreign-'+suffix+'@example.test','password':'Synthetic-agent-control-2026!','workspaceId':'foreign-'+suffix})
    call(base,'/api/agent/control',h={'Authorization':'Bearer '+foreign['token'],'x-tenant':tenant},expected=403)
    call(base,'/api/workspace/integrations/'+active['id'],h=h,method='DELETE')
    call(base,'/api/merchant/products',h=headers(active),expected=401)
    assert sql(f"SELECT count(*) FROM integration_keys WHERE tenant='{tenant}' AND id='{active['id']}' AND expires_at<=now()")=='1'
    passed('Foreign-shop control is denied; revocation stops credentials while retaining bounded-agent accounting identity')
    (ROOT/'artifacts/agent-authorities.json').write_text(json.dumps({'checks':checks,'realProvider':False,'billingBoundary':'Conservative model allocations at an approved tariff, not actual provider invoices'},indent=2)+'\n')
finally:
    release.set()
    for p in processes:stop(p)
    for log in logs:log.close()
    provider.shutdown()
