#!/usr/bin/env python3
"""Protocol flows exercise the same commerce core; model smoke test is opt-in."""
import json,os,pathlib,urllib.request,urllib.error,uuid,time
base=os.environ.get('BASE_URL','http://127.0.0.1:8787');token=os.environ.get('MERCHANT_TOKEN','');checks=[]
def call(path,body=None,h=None,method=None,expected=200):
    req=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method or ('GET' if body is None else 'POST'))
    try:
        with urllib.request.urlopen(req,timeout=200) as r:s=r.status;v=json.load(r)
    except urllib.error.HTTPError as e:s=e.code;v=json.load(e)
    assert s==expected,(s,v);return v
def ok(s):checks.append(s);print('PASS',s)
u=call('/ucp/v1/checkout-sessions',{'line_items':[{'item':{'id':'notebook'},'quantity':1}],'buyer':{'email':'demo@example.test'}})
h={'sw-context-token':u['context_token']};path='/ucp/v1/checkout-sessions/'+u['id'];assert u['line_items'][0]['item']['price']==1250
assert call(path,h=h)['buyer']['email']=='demo@example.test';ok('UCP create/get, currency minor units and context authorization')
u=call(path,{'line_items':[{'item':{'id':'mug'},'quantity':1}]},h,'PUT');assert len(u['line_items'])==1 and u['line_items'][0]['item']['id']=='mug' and 'buyer' not in u;ok('UCP PUT replaces items and buyer atomically')
call(path+'/complete',{}, {**h,'Idempotency-Key':'missing-'+uuid.uuid4().hex},expected=409);ok('UCP incomplete checkout cannot complete')
u=call(path,{'line_items':[{'item':{'id':'mug'},'quantity':1}],'buyer':{'email':'demo@example.test'}},h,'PUT');assert u['status']=='ready_for_complete'
u=call(path+'/complete',{}, {**h,'Idempotency-Key':'ucp-'+uuid.uuid4().hex});assert u['status']=='completed' and u['order']['id'];ok('UCP completes same durable checkout')
call(path+'/cancel',{},h,expected=409);ok('UCP cannot cancel completed order')
v=call('/mcp',{'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2025-11-25'}});assert v['result']['protocolVersion']=='2025-11-25' and v['result']['serverInfo']['name']=='veyndo';ok('MCP compatibility handshake')
call('/mcp',{'jsonrpc':'2.0','id':2,'method':'ping'},{'Origin':'https://evil.example'},expected=403);ok('MCP rejects foreign browser origins')
# Protocol structure errors must not be confused with actionable tool failures.
def rpc(method,params=None,id=90):
    body={'jsonrpc':'2.0','id':id,'method':method}
    if params is not None:body['params']=params
    return call('/mcp',body)
assert rpc('ping',id=None)['result']=={}
assert rpc('unregistered')['error']['code']==-32601
assert rpc('tools/call',{'name':'unregistered','arguments':{}})['error']['code']==-32602
assert rpc('tools/call',{'name':'catalog.search','arguments':[]})['error']['code']==-32602
assert call('/mcp',{'jsonrpc':'2.0','id':{},'method':'ping'})['error']['code']==-32600
for name,arguments,pointer in [
    ('catalog.detail',{'productId':7},'/productId'),
    ('catalog.search',{'query':'x'*201},'/query'),
    ('catalog.search',{'extra':True},'/extra'),
    ('checkout.select',{'revision':1,'checkout':{'customerEmail':True}},'/checkout/customerEmail'),
]:
    result=rpc('tools/call',{'name':name,'arguments':arguments})['result']
    assert result['isError'] and result['structuredContent']['errors'][0]['pointer']==pointer,result
    assert result['structuredContent']['errors'][0]['kind']=='validation_error'
tools=rpc('tools/list')['result']['tools'];assert len({t['name']for t in tools})==len(tools)
assert next(t for t in tools if t['name']=='catalog.search')['annotations']['readOnlyHint'] is True
assert next(t for t in tools if t['name']=='checkout.complete')['annotations']['readOnlyHint'] is False
ok('MCP validates native schemas and nullable values, reports JSON pointers, separates protocol failures and exposes unique conservative operation hints')
if token:
    ah={'Authorization':'Bearer '+token}
    call('/api/search/product',{},expected=401);ok('Admin catalog endpoint requires merchant authority')
    source=(pathlib.Path(__file__).resolve().parents[1]/'extensions/company-limit.wat').read_text()
    result=call('/api/extensions/activate',{'wat':source},ah);assert result['activated'];ok('Wasm source compiled at activation and persisted')
    call('/api/extensions/activate',{'wat':'(module (import "env" "fs" (func)) (func (export "approve") (param i64 i64) (result i32) i32.const 1))'},ah,expected=400);ok('extension host imports rejected')
    # Observe eventual consumption rather than assuming a worker tick within 300 ms.
    deadline=time.monotonic()+5
    while True:
        r=call('/api/runtime',h=ah)
        if r['eventsConsumed']>0 and r['outboxPending']==0:break
        assert time.monotonic()<deadline,r
        time.sleep(.05)
    ok('durable outbox has a working consumer')
    if os.environ.get('TEST_MODEL')=='1':
        before=next(p for p in call('/store-api/product',{})['elements'] if p['id']=='lamp')['price']
        target=74.9 if before!=74.9 else 79.9
        task=call('/api/agent/plan',{'instruction':f'Setze ausschließlich den Bruttopreis von lamp / Arc Desk Light auf {target} EUR. Ändere sonst nichts.'},ah)
        p=task['preview']['proposal'];assert len(p['changes'])==1 and p['changes'][0]['product_id']=='lamp' and abs(p['changes'][0]['price']-target)<1e-9
        assert task['preview']['evalCount']>0;ok('real LLM produces correct typed merchant plan')
        call('/api/agent/tasks/'+task['taskId']+'/apply',{'approve':False},ah,expected=400)
        call('/api/agent/tasks/'+task['taskId']+'/apply',{'approve':True},ah)
        replay=call('/api/agent/tasks/'+task['taskId']+'/apply',{'approve':True},ah);assert replay['replayed'];ok('explicit approval applies plan once')
        ps=call('/store-api/product',{})['elements'];assert next(p for p in ps if p['id']=='lamp')['price']==target;ok('agent change affects customer catalog')
        advice=call('/api/concierge',{'request':'Ich brauche eine warme Leselampe für weniger als 100 Euro.'});assert 'lamp' in advice['answer']['recommended_ids'] and advice['evalCount']>0;ok('real customer inference selects existing product')
report={'passed':len(checks),'checks':checks,'modelTested':os.environ.get('TEST_MODEL')=='1'}
print(json.dumps(report,indent=2))
if os.environ.get('REPORT_PATH'):pathlib.Path(os.environ['REPORT_PATH']).write_text(json.dumps(report,indent=2)+'\n')
