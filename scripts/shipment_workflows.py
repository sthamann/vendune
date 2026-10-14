#!/usr/bin/env python3
"""Real isolated PostgreSQL/HTTP package conservation, replay, current rights, customer projection and flow effects."""
import concurrent.futures,json,os,time,uuid,urllib.error,urllib.request,pathlib,subprocess
from testing.database import psql
from testing.app_approval import consent
base=os.getenv('BASE_URL','http://127.0.0.1:8787');suffix=uuid.uuid4().hex[:10]
password='Synthetic-packages-2026!'
def call(path,body=None,h=None,expected=200,method=None):
    req=urllib.request.Request(base+path,data=None if body is None else body if isinstance(body,bytes) else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method or ('GET' if body is None else 'POST'))
    try:
        with urllib.request.urlopen(req,timeout=30) as r:status=r.status;raw=r.read()
    except urllib.error.HTTPError as e:status=e.code;raw=e.read()
    assert status==expected,(path,status,expected,raw.decode(errors='replace'))
    return raw if not raw.startswith((b'{',b'[')) else json.loads(raw)
def register(label):
    return call('/api/auth/register',{'name':label,'email':label+suffix+'@example.test','password':password,'workspaceId':label+'-'+suffix,'workspaceName':label})
def headers(s):return {'Authorization':'Bearer '+s['token'],'x-tenant':s['workspace']}
def tool(name,v,h):return call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':v}},h)['result']
owner=register('packages');foreign=register('packagesforeign');h=headers(owner);public={'x-tenant':owner['workspace']}
email='buyer-'+suffix+'@example.test'
call('/store-api/account/register',{'name':'Package buyer','email':email,'password':password},public)
cart=call('/store-api/checkout/cart',{'session':'packages-'+suffix},public);ch={**public,'sw-context-token':cart['token']}
cart=call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'notebook','quantity':3},{'referencedId':'lamp','quantity':2}]},ch)
login=call('/store-api/account/login',{'email':email,'password':password},ch);ch['sw-context-token']=login['token']
customer={**public,'x-customer-token':login['customerToken']}
order=call('/store-api/checkout/order',{}, {**ch,'Idempotency-Key':'order-'+suffix});id=order['id'];path='/api/merchant/orders/'+id
for _ in range(100):
    jobs=call('/api/automation/executions',h=h)['jobs']
    if any(j['flow']=='default_order_received' and j['state']=='completed' for j in jobs):break
    time.sleep(.1)
else:raise AssertionError('Default order flow did not complete')
before=call(path,h=h);money=before['money'];price=before['cart']['price'];stock=call('/store-api/product/notebook',h=public)['product']['stock']
assert before['workflow']['shipmentSplits'][0]['enabled']
flow={'name':{l:'Package split audit' for l in ['en','de','fr','es']},'active':True,'event':'delivery.split','condition':{'type':'alwaysValid'},'action':'note','instruction':{l:'Package split confirmed' for l in ['en','de','fr','es']},'locale':'en-GB'}
call('/api/automation/flows/package_split',{'revision':0,'data':flow},h,method='PUT')
body={'revision':before['revision'],'deliveryIndex':0,'positions':[{'id':'notebook','quantity':1}],'requestKey':'split-'+suffix}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as workers:
    results=list(workers.map(lambda _:call(path+'/deliveries/split',body,h),range(5)))
assert all(r==results[0] for r in results)
after=results[0];assert len(after['deliveries'])==2 and after['money']==money and after['cart']['price']==price and 'token' not in after['cart']
quantities={}
for parcel in after['deliveries']:
    for p in parcel['positions']:quantities[p['id']]=quantities.get(p['id'],0)+p['quantity']
assert quantities=={'notebook':3,'lamp':2}
assert after['deliveries'][1]['shippingCosts']['totalPrice']==0
assert after['deliveries'][0]['shippingCosts']==before['deliveries'][0]['shippingCosts']
assert call('/store-api/product/notebook',h=public)['product']['stock']==stock
for _ in range(100):
    jobs=call('/api/automation/executions',h=h)['jobs'];matches=[j for j in jobs if j['flow']=='package_split']
    if matches and matches[0]['state']=='completed':break
    time.sleep(.1)
else:raise AssertionError('Package split event did not reach its flow')
current=call(path,h=h)
assert len([a for a in current['activity'] if a['kind']=='delivery.split'])==1
assert len([a for a in current['activity'] if a['kind']=='flow' and a['data']['event']=='delivery.split'])==1
assert call('/store-api/account/orders/'+id,h=customer)['deliveries']==current['deliveries']
assert call(path+'/deliveries/split',body,h)==after
print('PASS concurrent replay conserves quantities, price, stock, customer projection and one flow effect')

for positions in [[],[{'id':'notebook','quantity':99}],[{'id':'missing','quantity':1}],[{'id':'notebook','quantity':1},{'id':'notebook','quantity':1}],[{'id':'notebook','quantity':0}],[{'id':'notebook','quantity':1.5}]]:
    call(path+'/deliveries/split',{**body,'revision':current['revision'],'positions':positions,'requestKey':uuid.uuid4().hex},h,400)
call(path+'/deliveries/split',{**body,'positions':[{'id':'lamp','quantity':1}]},h,409)
call(path+'/deliveries/split',{**body,'requestKey':uuid.uuid4().hex},h,409)
call(path+'/deliveries/split',{**body,'revision':current['revision'],'positions':[{'id':'notebook','quantity':2},{'id':'lamp','quantity':2}],'requestKey':uuid.uuid4().hex},h,409)
assert call(path,h=h)['revision']==current['revision']
call(path+'/deliveries/split',{**body,'revision':current['revision']},headers(foreign),404)
call(path+'/deliveries/split',body,expected=401)
invite=call('/api/workspace/invitations',{'email':'reader-'+suffix+'@example.test','role':'viewer'},h)
reader=call('/api/auth/accept',{'name':'Reader','password':password,'invitationToken':invite['token']});rh=headers(reader)
assert not any(t['name']=='merchant.delivery.split' for t in call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/list'},rh)['result']['tools'])
call(path+'/deliveries/split',body,rh,403);assert tool('merchant.delivery.split',{'id':id,**body},rh)['isError']
call('/api/workspace/members/'+reader['user']['id'],{'role':'viewer','active':True,'permissions':['orders.read','orders.write']},h,method='PUT')
call(path+'/deliveries/split',body,rh,403)
print('PASS anonymous foreign stale invalid allocation and missing PII mutations leave the order untouched')

current=call(path,h=h)
result=tool('merchant.delivery.split',{'id':id,'revision':current['revision'],'deliveryIndex':0,'positions':[{'id':'lamp','quantity':1}],'requestKey':'mcp-split-'+suffix},h)
assert not result.get('isError'),result
# One physical package produces one immutable delivery note, not another full-order note.
current=call(path,h=h)
seller=call('/api/merchant/receipts/settings',h=h)
call('/api/merchant/receipts/settings',{'revision':seller['revision'],'data':{**seller['data'],'name':'Synthetic package warehouse','address':'Test Street 1, Berlin','taxId':'TEST-ONLY'}},h,method='PUT')
note_body={'revision':current['revision'],'kind':'delivery_note','locale':'en','deliveryIndex':1,'requestKey':'note-'+suffix}
note=call(path+'/receipts',note_body,h);assert call(path+'/receipts',note_body,h)['id']==note['id']
note_pdf=call('/api/merchant/receipts/'+note['id']+'/pdf',h=h)
assert b'1 x ' in note_pdf and b'[notebook]' in note_pdf and b'[lamp]' not in note_pdf
call(path+'/receipts',{**note_body,'deliveryIndex':0},h,409)
call(path+'/receipts',{**note_body,'kind':'invoice','requestKey':uuid.uuid4().hex},h,400)
call(path+'/receipts',{**note_body,'deliveryIndex':99,'requestKey':uuid.uuid4().hex},h,400)
print('PASS delivery-note PDF contains only its selected package and keeps stable replay/fiscal boundaries')
# Generic private document callback: no carrier secrets, actual PDF bytes and app-specific consent.
root=pathlib.Path(__file__).resolve().parents[1]
manifest=json.loads((root/'extensions/apps/care-studio/manifest.json').read_text());manifest['id']='shipdoc_'+suffix
manifest['permissions']+=['orders.read','customers.pii','documents.create','deliveries.write']
call('/api/apps',consent({'manifest':manifest}),h)
installed=next(p for p in call('/api/apps',h=h)['packages'] if p['id']==manifest['id']);prefix='/api/apps/'+manifest['id']
key=call(prefix+'/credentials',{'digest':installed['digest'],'approve':True,'permissions':['orders.read','customers.pii','documents.create','deliveries.write'],'expiresInDays':1},h)
apph={'Authorization':'Bearer '+key['key'],'x-tenant':owner['workspace']}
shipment=call(prefix+'/core/delivery_snapshot',{'id':id,'deliveryIndex':0},apph)
metadata={'orderId':id,'deliveryIndex':0,'allocationDigest':shipment['allocationDigest'],'kind':'shipping_label','requestKey':'pdf-'+suffix,'trackingCode':'SYNTHETIC-PARCEL','trackingUrl':'https://example.com/tracking/synthetic'}
pdf=b'%PDF-1.4\n'+b'x'*100_000

def upload(meta,auth=apph,expected=200,content=pdf):
    boundary='doc-'+uuid.uuid4().hex
    raw=(f'--{boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n'+json.dumps(meta)+f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="carrier.pdf"\r\nContent-Type: application/pdf\r\n\r\n').encode()+content+f'\r\n--{boundary}--\r\n'.encode()
    return call(prefix+'/core/document_upload',raw,{**auth,'Content-Type':'multipart/form-data; boundary='+boundary},expected)
# Lost-response retry returns the same immutable document; it never buys another label.
intent={'id':id,'deliveryIndex':0,'allocationDigest':shipment['allocationDigest'],'requestKey':metadata['requestKey']}
upload(metadata,expected=409)
upload(metadata,auth=h,expected=403)
assert call(prefix+'/core/delivery_reserve',intent,apph)['reserved']
assert call(prefix+'/core/delivery_reserve',intent,apph)['reserved']
call(prefix+'/core/delivery_reserve',intent,h,403)
other_manifest={**manifest,'id':'shipother_'+suffix}
call('/api/apps',consent({'manifest':other_manifest}),h)
other_package=next(p for p in call('/api/apps',h=h)['packages'] if p['id']==other_manifest['id']);other_prefix='/api/apps/'+other_manifest['id']
other_key=call(other_prefix+'/credentials',{'digest':other_package['digest'],'approve':True,'permissions':['orders.read','customers.pii','documents.create','deliveries.write'],'expiresInDays':1},h)
other_h={'Authorization':'Bearer '+other_key['key'],'x-tenant':tenant if 'tenant' in globals() else owner['workspace']}
call(other_prefix+'/core/delivery_reserve',intent,other_h,409)
call(other_prefix+'/core/delivery_release',intent,other_h,409)

held=call(path,h=h);assert not held['workflow']['shipmentSplits'][0]['enabled']
call(path+'/deliveries/split',{'revision':held['revision'],'deliveryIndex':0,'positions':[{'id':'notebook','quantity':1}],'requestKey':uuid.uuid4().hex},h,409)
upload({**metadata,'requestKey':uuid.uuid4().hex},expected=409)
doc=upload(metadata);assert upload(metadata)==doc
assert call(path,h=h)['deliveries'][0].get('booking') is None
assert call('/api/merchant/receipts/'+doc['id']+'/pdf',h=h)==pdf
call('/api/merchant/receipts/'+doc['id']+'/pdf',h=headers(foreign),expected=404)
call('/store-api/account/orders/'+id+'/receipts/'+doc['id']+'/pdf',h=customer,expected=404)
assert not any(r['id']==doc['id'] for r in call('/store-api/account/orders/'+id,h=customer)['receipts'])
assert call(path,h=h)['deliveries'][0]['state']=='open'
current=call(path,h=h)
call(path+'/deliveries/split',{'revision':current['revision'],'deliveryIndex':0,'positions':[{'id':'notebook','quantity':1}],'requestKey':uuid.uuid4().hex},h,409)
# Return document is visible only to the owning registered account.
returned=upload({**metadata,'kind':'return_label','requestKey':'return-'+suffix})
assert call('/store-api/account/orders/'+id+'/receipts/'+returned['id']+'/pdf',h=customer)==pdf
upload({**metadata,'requestKey':uuid.uuid4().hex,'allocationDigest':'0'*64},expected=409)
upload({**metadata,'requestKey':uuid.uuid4().hex},expected=400,content=b'not-pdf')
call(prefix+'/core/delivery_snapshot',{'id':id,'deliveryIndex':0},{**apph,'x-tenant':foreign['workspace']},expected=403)
# The native database accounting includes retained binary documents across app reinstall.
def sql(statement,ok=True):
    result=subprocess.run(psql(os.environ['TEST_DB_CONTAINER'],'commerce',os.environ['TEST_DATABASE'],'-qAt','-v','ON_ERROR_STOP=1'),input=statement,text=True,capture_output=True)
    assert (result.returncode==0)==ok,result.stderr
    return result.stdout.strip()
tenant=owner['workspace'];app=manifest['id']
usage_query=f"SELECT rows||':'||bytes FROM app_storage_usage WHERE tenant='{tenant}' AND app='{app}'"
usage=sql(usage_query);assert int(usage.split(':')[1])>2*len(pdf)
call('/api/apps',consent({'manifest':manifest}),h);assert sql(usage_query)==usage
sql(f"UPDATE order_receipts SET content='changed'::bytea WHERE tenant='{tenant}' AND id='{doc['id']}'",ok=False)
assert call('/api/merchant/receipts/'+doc['id']+'/pdf',h=h)==pdf
# Forced quota saturation rejects the whole native document/order/audit transaction.
original_bytes=usage.split(':')[1]
sql(f"UPDATE app_storage_usage SET bytes=67108860 WHERE tenant='{tenant}' AND app='{app}'")
revision_before=call(path,h=h)['revision']
upload({**metadata,'kind':'return_label','requestKey':'quota-'+suffix},expected=413)
assert call(path,h=h)['revision']==revision_before
sql(f"UPDATE app_storage_usage SET bytes={original_bytes} WHERE tenant='{tenant}' AND app='{app}'")
print('PASS binary receipts remain immutable, survive quota recount and reject saturated storage atomically')
print('PASS immutable 100 KiB PDF uses native receipt storage; outbound privacy, owned return download, package fence and exact retry')
# A shipped package is immutable, and completion waits for every package.
for _ in range(100):
    jobs=call("/api/automation/executions",h=h)["jobs"]
    if len([j for j in jobs if j["flow"]=="package_split" and j["state"]=="completed"])==2:break
    time.sleep(.1)
else:raise AssertionError("Second split flow did not complete")
current=call(path,h=h)
current=call(path+"/transition",{"revision":current["revision"],"kind":"order","state":"in_progress"},h)
for index in range(len(current['deliveries'])):
    current=call(path+'/transition',{'revision':current['revision'],'kind':'delivery','state':'shipped','deliveryIndex':index,'trackingCode':'TEST-'+str(index),'trackingUrl':'https://example.com/tracking/'+str(index),'requestKey':'ship-'+str(index)+suffix},h)
    call(path+'/deliveries/split',{'revision':current['revision'],'deliveryIndex':index,'positions':[{'id':'notebook','quantity':1}],'requestKey':uuid.uuid4().hex},h,400 if index==2 else 409)
current=call(path+'/transition',{'revision':current['revision'],'kind':'payment','state':'paid'},h)
call(path+'/transition',{'revision':current['revision'],'kind':'order','state':'completed'},h,409)
for index in range(len(current['deliveries'])):
    current=call(path+'/transition',{'revision':current['revision'],'kind':'delivery','state':'delivered','deliveryIndex':index},h)
current=call(path+'/transition',{'revision':current['revision'],'kind':'order','state':'completed'},h)
assert current['state']=='completed' and len(current['deliveries'])==3
assert call('/store-api/account/orders/'+id,h=customer)['state']=='completed'
call(path+'/deliveries/split',{'revision':current['revision'],'deliveryIndex':0,'positions':[{'id':'notebook','quantity':1}],'requestKey':uuid.uuid4().hex},h,409)
assert call('/store-api/product/notebook',h=public)['product']['stock']==stock
print('PASS HTTP and MCP share package lifecycle; completion waits for all deliveries and never resells inventory')
