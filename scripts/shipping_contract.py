#!/usr/bin/env python3
"""Test-only carrier-neutral service: native jobs, package intent, documents and Flow; no external bookings."""
import hashlib,json,os,subprocess,threading,time,urllib.error,urllib.request,uuid
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from testing.runtime import ROOT,serve,stop
from testing.app_approval import consent,pin
from testing.database import psql

env=dict(os.environ);base=env['BASE_URL'];suffix=uuid.uuid4().hex[:10];tenant='shipping-'+suffix
gateway='synthetic-shipping-'+suffix;seen=[];errors=[];mode={'value':'normal'};callback={}
manifest=json.loads((ROOT/'extensions/apps/assistant-examples/shipping.json').read_text());app=manifest['id'];prefix='/api/apps/'+app
pdf=b'%PDF-1.4\n'+b'Synthetic fixture document\n'*5000

def call(path,v=None,h=None,expected=200,method=None):
    raw=v if isinstance(v,bytes) else None if v is None else json.dumps(v).encode()
    request=urllib.request.Request(base+path,data=raw,headers={'Content-Type':'application/json',**(h or {})},method=method)
    try:
        with urllib.request.urlopen(request,timeout=30) as r:code=r.status;raw=r.read()
    except urllib.error.HTTPError as e:code=e.code;raw=e.read()
    assert code==expected,(path,code,expected,raw.decode(errors='replace'))
    return json.loads(raw) if raw.startswith((b'{',b'[')) else raw

def wait(fn):
    deadline=time.monotonic()+20
    while time.monotonic()<deadline:
        assert not errors,errors
        result=fn()
        if result:return result
        time.sleep(.1)
    raise AssertionError('Native shipping contract effect did not arrive')

def sql(statement):
    r=subprocess.run(psql(env['TEST_DB_CONTAINER'],'commerce',env['TEST_DATABASE'],'-qAt','-v','ON_ERROR_STOP=1'),input=statement,text=True,capture_output=True)
    assert not r.returncode,r.stderr
    return r.stdout.strip()

def process(jid):
    try:
        claim=call(prefix+'/core/job_claim',{'id':jid},callback)
    except AssertionError as e:
        # A redelivery, cancelled job or revoked creator must not reach any provider effect.
        if e.args[0][1] in [403,409]:return
        errors.append(str(e));return
    try:
        def progress(**values):return call(prefix+'/core/job_progress',{'id':jid,'lease':claim['lease'],**values},callback)
        if progress(progress=10)['cancelRequested']:progress(status='cancelled');return
        args=claim['input'];snap=call(prefix+'/core/delivery_snapshot',{'id':args['orderId'],'deliveryIndex':args['deliveryIndex']},callback)
        key='fixture-'+hashlib.sha256((snap['orderId']+str(snap['deliveryIndex'])+snap['allocationDigest']).encode()).hexdigest()[:32]
        intent={'id':snap['orderId'],'deliveryIndex':snap['deliveryIndex'],'allocationDigest':snap['allocationDigest'],'requestKey':key}
        if snap['delivery'].get('label'):progress(status='failed');return
        reserved=call(prefix+'/core/delivery_reserve',intent,callback)
        if reserved['reused']:progress(status='failed',message={'en':'Review the original booking','de':'Ursprüngliche Buchung prüfen','fr':'Vérifier la réservation initiale','es':'Revisar la reserva original'});return
        if mode['value']=='reject':
            call(prefix+'/core/delivery_release',intent,callback);progress(status='failed');return
        # Only this test fixture records a synthetic effect. Production providers own their protocols/receipts.
        seen.append(key)
        if mode['value']=='uncertain':progress(progress=50);return
        metadata={'orderId':snap['orderId'],'deliveryIndex':snap['deliveryIndex'],'allocationDigest':snap['allocationDigest'],'requestKey':key,'kind':'shipping_label','trackingCode':'TEST-'+str(len(seen)),'trackingUrl':'https://example.test/tracking/'+key}
        boundary='fixture-'+uuid.uuid4().hex
        raw=(f'--{boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n'+json.dumps(metadata)+f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="fixture.pdf"\r\nContent-Type: application/pdf\r\n\r\n').encode()+pdf+f'\r\n--{boundary}--\r\n'.encode()
        doc=call(prefix+'/core/document_upload',raw,{**callback,'Content-Type':'multipart/form-data; boundary='+boundary})
        progress(status='succeeded',result={'orderId':snap['orderId'],'deliveryIndex':snap['deliveryIndex'],'documentId':doc['id']})
    except BaseException as e:errors.append(str(e))

class Fixture(BaseHTTPRequestHandler):
    def do_POST(self):
        assert self.path=='/events' and self.headers['Authorization']=='Bearer '+gateway and self.headers['x-tenant']==tenant
        envelope=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        events=envelope.get('events',[envelope])
        for event in events:
            assert event['kind']=='app.'+app+'.job_create_label' and set(event['data'])=={'jobId'}
            threading.Thread(target=process,args=(event['data']['jobId'],),daemon=True).start()
        self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b'{"accepted":true}')
    def log_message(self,*_):pass

fixture=ThreadingHTTPServer(('127.0.0.1',0),Fixture);threading.Thread(target=fixture.serve_forever,daemon=True).start()
env['APP_SERVICES']=json.dumps(pin({app:{'url':f'http://127.0.0.1:{fixture.server_port}','token':gateway}},app,manifest))
log=(ROOT/'artifacts/shipping-contract.log').open('w');core=serve(env,base,log)
try:
    owner=call('/api/auth/register',{'name':'Shipping contract owner','email':tenant+'@example.test','password':'Synthetic-shipping-contract-2026!','workspaceId':tenant})
    h={'Authorization':'Bearer '+owner['token'],'x-tenant':tenant};public={'x-tenant':tenant}
    call('/api/apps',consent({'manifest':manifest}),h)
    installed=next(p for p in call('/api/apps',h=h)['packages'] if p['id']==app)
    key=call(prefix+'/credentials',{'approve':True,'digest':installed['digest'],'permissions':['orders.read','customers.pii','deliveries.write','documents.create','jobs.write'],'expiresInDays':1},h)
    callback.update({'Authorization':'Bearer '+key['key'],'x-tenant':tenant})
    def order():
        c=call('/store-api/checkout/cart',{'session':uuid.uuid4().hex},public);ch={**public,'sw-context-token':c['token']}
        c=call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'notebook','quantity':2}]},ch)
        address={'name':'Synthetic buyer','street':'Fixture Street 2','postalCode':'10115','city':'Berlin','country':'DE'}
        c=call('/store-api/checkout/context',{'revision':c['revision'],'checkout':{**c['checkout'],'country':'DE','address':address,'billingAddress':address,'customerEmail':'buyer-'+suffix+'@example.test'}},ch,method='PUT')
        return call('/store-api/checkout/order',{}, {**ch,'Idempotency-Key':uuid.uuid4().hex})
    def args(o):return {'orderId':o['id'],'deliveryIndex':0,'account':'fixture','weightGrams':500,'lengthMm':300,'widthMm':200,'heightMm':100}
    def enqueue(o,headers=None,request_key=None):return call(prefix+'/actions/create_label',args(o),{**(headers or h),'Idempotency-Key':request_key or uuid.uuid4().hex})['jobId']
    def job(jid,headers=None):return call(prefix+'/jobs/'+jid,h=headers or h)
    first=order();jid=enqueue(first,request_key='normal-'+suffix)
    wait(lambda:job(jid)['status']=='succeeded');assert len(seen)==1
    assert enqueue(first,request_key='normal-'+suffix)==jid
    current=call('/api/merchant/orders/'+first['id'],h=h);doc=current['deliveries'][0]['label']['id']
    assert current['deliveries'][0]['state']=='open' and call('/api/merchant/receipts/'+doc+'/pdf',h=h)==pdf
    assert 'input' not in job(jid) and 'lease' not in job(jid)
    duplicate=enqueue(first);wait(lambda:job(duplicate)['status']=='failed');assert len(seen)==1
    print('PASS generic shipping assistant -> native leased job -> immutable original PDF and tracking; exact replay and duplicate package have one effect')
    mode['value']='reject';rejected=order();jid=enqueue(rejected);wait(lambda:job(jid)['status']=='failed')
    assert call('/api/merchant/orders/'+rejected['id'],h=h)['deliveries'][0].get('booking') is None and len(seen)==1
    mode['value']='uncertain';unknown=order();jid=enqueue(unknown);wait(lambda:job(jid)['progress']==50)
    assert len(seen)==2
    sql(f"UPDATE app_jobs SET lease_until=now()-interval '1 second' WHERE tenant='{tenant}' AND id='{jid}'")
    assert job(jid)['status']=='uncertain'
    # Restart the actual native server: package intent, not process memory, prevents another effect.
    stop(core);core=serve(env,base,log);mode['value']='normal'
    fresh=enqueue(unknown);wait(lambda:job(fresh)['status']=='failed');assert len(seen)==2
    held=call('/api/merchant/orders/'+unknown['id'],h=h);assert not held['workflow']['shipmentSplits'][0]['enabled']
    call('/api/merchant/orders/'+unknown['id']+'/deliveries/split',{'revision':held['revision'],'deliveryIndex':0,'positions':[{'id':'notebook','quantity':1}],'requestKey':uuid.uuid4().hex},h,409)
    call('/api/merchant/orders/'+unknown['id']+'/transition',{'revision':held['revision'],'kind':'delivery','state':'shipped'},h,409)
    print('PASS explicit no-effect rejection releases intent; unknown effect survives native restart and blocks another booking, split and dispatch')
    invitation=call('/api/workspace/invitations',{'email':'clerk-'+suffix+'@example.test','role':'viewer'},h)
    clerk=call('/api/auth/accept',{'name':'Shipping clerk','password':'Synthetic-shipping-clerk-2026!','invitationToken':invitation['token']})
    clerk_h={'Authorization':'Bearer '+clerk['token'],'x-tenant':tenant};rights=['orders.read','orders.write','customers.pii','documents.create']
    call('/api/workspace/members/'+clerk['user']['id'],{'role':'viewer','active':True,'permissions':rights},h,method='PUT')
    call(prefix+'/jobs/'+fresh,h=clerk_h,expected=404)
    clerk_job=enqueue(order(),clerk_h);wait(lambda:job(clerk_job,clerk_h)['status']=='succeeded');assert len(seen)==3
    call('/api/workspace/members/'+clerk['user']['id'],{'role':'viewer','active':True,'permissions':['orders.read']},h,method='PUT')
    call(prefix+'/jobs/'+clerk_job,h=clerk_h,expected=403)
    call('/api/workspace/members/'+clerk['user']['id'],{'role':'viewer','active':True,'permissions':['apps.read','apps.manage']},h,method='PUT')
    rows=call(prefix+'/jobs',h=clerk_h)['jobs'];assert rows and all(not r['message'] and r['result'] is None for r in rows)
    call(prefix+'/core/delivery_snapshot',{'id':first['id'],'deliveryIndex':0},{**callback,'x-tenant':'foreign'},403)
    print('PASS job ownership, current PII/action rights and tenant binding; app management alone never exposes private results')
    flow_order=order()
    flow={'name':{l:'Synthetic package label' for l in ['en','de','fr','es']},'active':True,'event':'delivery.split','condition':{'type':'alwaysValid'},'action':'app_action','instruction':{l:'Create one synthetic label' for l in ['en','de','fr','es']},'locale':'en-GB','appAction':{'app':app,'action':'create_label','arguments':{**args(flow_order),'deliveryIndex':1}}}
    del flow['appAction']['arguments']['orderId']
    saved=call('/api/automation/flows/shipping_fixture',{'revision':0,'data':flow},h,method='PUT')
    call('/api/merchant/orders/'+flow_order['id']+'/deliveries/split',{'revision':flow_order['revision'],'deliveryIndex':0,'positions':[{'id':'notebook','quantity':1}],'requestKey':'flow-'+suffix},h)
    wait(lambda:call('/api/merchant/orders/'+flow_order['id'],h=h)['deliveries'][1].get('label'));assert len(seen)==4
    flow['active']=False;call('/api/automation/flows/shipping_fixture',{'revision':saved['revision'],'data':flow},h,method='PUT')
    call(prefix+'/credentials/'+key['id'],h=h,method='DELETE')
    blocked=enqueue(order());time.sleep(.4);assert len(seen)==4
    assert job(blocked)['status']=='queued'
    print('PASS real split -> Flow current actor/stable request key -> native app job -> package PDF; revoked callback cannot execute')
    # Optional manual browser acceptance holds only this disposable verified test shop.
    if ready_file:=env.get('SHIPPING_UI_READY_FILE'):
        from pathlib import Path
        preview=order()
        Path(ready_file).write_text(json.dumps({'url':base+'/?shop='+tenant+'&studio=orders&entity='+preview['id']+'#merchant','email':tenant+'@example.test','password':'Synthetic-shipping-contract-2026!','orderId':preview['id']}))
        while not Path(ready_file+'.stop').exists():time.sleep(.5)
finally:
    stop(core);fixture.shutdown();log.close()
