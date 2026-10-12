#!/usr/bin/env python3
"""Real isolated PostgreSQL/HTTP POS sales reuse catalog, checkout, receipts, events and permissions; no PSP or mail calls."""
import concurrent.futures, copy, json, os, time, urllib.error, urllib.request, uuid
from testing.app_approval import consent
BASE=os.environ['BASE_URL']; suffix=uuid.uuid4().hex[:8]
def call(path,body=None,h=None,method=None,status=200,raw=False):
    if path=='/api/apps' and isinstance(body,dict):body=consent(body)
    request=urllib.request.Request(BASE+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method)
    try: response=urllib.request.urlopen(request,timeout=30)
    except urllib.error.HTTPError as e:response=e
    data=response.read();assert response.status==status,(path,response.status,status,data[:700])
    return data if raw else json.loads(data)
def register(label):
    a=call('/api/auth/register',{'workspaceId':label+'-'+suffix,'workspaceName':'POS fixture','name':'Cashier test owner','email':label+suffix+'@example.test','password':'Synthetic-POS-fixture-2026!'})
    return a,{'x-tenant':a['workspace'],'Authorization':'Bearer '+a['token'],'x-commerce-locale':'de-DE'}
a,h=register('pos');b,bh=register('foreign-pos'); public={'x-tenant':a['workspace'],'sw-sales-channel-id':'register','x-commerce-locale':'de-DE'}
data={'name':{'en-GB':'Register','de-DE':'Kasse'},'kind':'pos','active':True,'locales':['en-GB','de-DE'],'productIds':[],'pos':{'country':'DE','columns':4,'compact':False,'receiptMessage':{'en-GB':'Thank you for your visit','de-DE':'Danke für deinen Besuch'}}}
ch=call('/api/automation/channels/register',{'revision':0,'data':data},h,'PUT')
def command(op,body=None,headers=h,status=200):return call('/api/pos/register/'+op,body or {},headers,status=status)
assert call('/api/pos/channels',h=h)['channels'][0]['data']['kind']=='pos'
assert call('/api/pos/channels',h=bh)['channels']==[]
command('create',headers=public,status=401)
call('/store-api/product',{},public,status=403)
call('/store-api/checkout/cart',{},public,status=403)
context=command('context');assert any(p['id']=='pos-cash' and p['mode']=='cash' for p in context['options']['payments'])
c=command('create')['cart'];assert c['checkout']['paymentMethodId']=='pos-cash' and c['checkout']['country']=='DE'
command('cart',{'cartToken':c['token']},bh,status=404)
products=command('catalog')['elements'];assert products
p=next(p for p in products if p['id']=='lamp');stock=p['stock']
assert command('catalog',{'barcode':p['product_number']})['elements'][0]['id']==p['id']
command('catalog',{'barcode':'unknown-barcode'},status=400)
assert command('detail',{'productId':p['id']})['product']['id']==p['id']
c=command('replace',{'cartToken':c['token'],'revision':c['revision'],'items':[{'id':p['id'],'quantity':1}]})
assert c['shippingCosts']['totalPrice']==0 and c['price']['totalMinor']
assert any(v['token']==c['token'] for v in command('held')['elements'])
command('replace',{'cartToken':c['token'],'revision':0,'items':[]},status=409)
# Native coupons reuse promotion pricing; public coupon writes cannot borrow a POS token.
promotion={'name':{'en-GB':'Register discount','de-DE':'Kassenrabatt'},'active':True,'code':'REGISTER','kind':'absolute','amount':1,'rule':{'type':'alwaysValid'},'exclusive':False,'priority':0,'maxUses':None,'start':None,'end':None}
call('/api/automation/promotions/register_discount',{'revision':0,'data':promotion},h,'PUT')
c=command('coupons',{'cartToken':c['token'],'revision':c['revision'],'codes':['REGISTER']});assert c['discountTotal']==1
call('/store-api/checkout/coupons',{'revision':c['revision'],'codes':[]},{**public,'sw-context-token':c['token']},'PUT',403)
c=command('coupons',{'cartToken':c['token'],'revision':c['revision'],'codes':[]})
c=command('currency',{'cartToken':c['token'],'revision':c['revision'],'currency':'EUR'});assert c['price']['currency']=='EUR'
# A POS token alone or forged cashier headers never authorize reads/settlement through Store API.
call('/store-api/checkout/cart',h={**public,'sw-context-token':c['token']},status=403)
call('/store-api/checkout/cart',h={**public,'sw-context-token':c['token'],'x-rac-role':'owner','x-rac-user':a['user']['id']},status=403)
# Explicit cashier role works without settings/automation permissions; another cashier cannot resume this cart.
inv=call('/api/workspace/invitations',{'email':'cashier'+suffix+'@example.test','role':'viewer'},h)
s=call('/api/auth/accept',{'name':'Cashier','password':'Synthetic-POS-fixture-2026!','invitationToken':inv['token']})
call('/api/workspace/members/'+s['user']['id'],{'role':'viewer','active':True,'permissions':['pos.use','catalog.read','orders.write','orders.read','payments.manage','documents.read','documents.create']},h,'PUT')
sh={**h,'Authorization':'Bearer '+s['token']};assert call('/api/pos/channels',h=sh)['channels']
command('cart',{'cartToken':c['token']},sh,status=403)
call('/api/automation',h=sh,status=403)
# Authenticated generic MCP cart calls still cannot bypass the POS adapter boundary.
m=call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/list'},h)['result']['tools'];assert any(t['name']=='pos.complete' for t in m)
m=call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'pos.cart','arguments':{'channelId':'register','cartToken':c['token']}}},h)['result'];assert not m.get('isError')
m=call('/mcp',{'jsonrpc':'2.0','id':2,'method':'tools/call','params':{'name':'pos.channels','arguments':{}}},sh)['result'];assert not m.get('isError') and 'register' in json.dumps(m)
# Cashier CRM/card lookup uses existing accounts and active tenant-scoped customer numbers.
address={'firstName':'Ada','lastName':'Cashier','street':'Register Road 1','postalCode':'10115','city':'Berlin','country':'DE'}
account=call('/store-api/account/register',{'name':'Ada Cashier','email':'posbuyer'+suffix+'@example.test','password':'Synthetic-POS-fixture-2026!','billingAddress':address},{'x-tenant':a['workspace']})
profile=call('/store-api/account/profile',h={'x-tenant':a['workspace'],'x-customer-token':account['customerToken']})
found=command('customers',{'query':'Ada Cashier'})['elements'];assert found[0]['id']==profile['id']
assert command('customers',{'barcode':profile['customerNumber']})['elements'][0]['id']==profile['id']
assert command('customers',{'barcode':'unknown-card'})['elements']==[]
command('customers',{'query':'Ada'},sh,status=403)
foreign=call('/store-api/account/register',{'name':'Foreign Card Holder','email':'foreignbuyer'+suffix+'@example.test','password':'Synthetic-POS-fixture-2026!'},{'x-tenant':b['workspace']})
foreign_profile=call('/store-api/account/profile',h={'x-tenant':b['workspace'],'x-customer-token':foreign['customerToken']})
assert command('customers',{'barcode':foreign_profile['customerNumber']})['elements']==[]
command('customer',{'cartToken':c['token'],'revision':c['revision'],'customerId':foreign_profile['id']},status=404)

command('customer',{'cartToken':c['token'],'revision':c['revision']},status=400)
command('customer',{'cartToken':c['token'],'revision':c['revision'],'customerId':'foreign-customer'},status=404)
c=command('customer',{'cartToken':c['token'],'revision':c['revision'],'customerId':profile['id']})
assert c['customerId']==profile['id'] and c['checkout']['billingAddress']['street']==address['street']
command('customer',{'cartToken':c['token'],'revision':c['revision']-1,'customerId':None},status=409)

# Existing role revocation takes effect even on an already selected cashier cart.
rights=['pos.use','catalog.read','orders.write','orders.read','payments.manage','customers.read','customers.pii']
call('/api/workspace/members/'+s['user']['id'],{'role':'viewer','active':True,'permissions':rights},h,'PUT')
sc=command('create',headers=sh)['cart']
sc=command('customer',{'cartToken':sc['token'],'revision':sc['revision'],'customerId':profile['id']},sh)
call('/api/workspace/members/'+s['user']['id'],{'role':'viewer','active':True,'permissions':[r for r in rights if r!='customers.pii']},h,'PUT')
command('cart',{'cartToken':sc['token']},sh,status=403)
# A pre-order discount event is consumed by the same durable Flow worker.
flow={'name':{'en-GB':'Cashier adjustment audit'},'event':'pos.discount_changed','active':True,'condition':{'type':'alwaysValid'},'action':'note','instruction':{'en-GB':'Discount reviewed'},'locale':'en-GB'}
call('/api/automation/flows/discount_audit',{'revision':0,'data':flow},h,'PUT')
# Exact percent/fixed reductions use the same native allocator; rejection leaves the authoritative revision intact.
base=int(c['price']['totalMinor']);discount={'kind':'percent','value':1000,'currency':'EUR','reason':'Damaged packaging'}
command('discount',{'cartToken':c['token'],'revision':c['revision']},status=400)
for invalid in [True,[],1,'invalid',{**discount,'reason':''},{**discount,'value':10001},{**discount,'currency':'JPY'},{**discount,'kind':'fixed','value':base+1}]:
    command('discount',{'cartToken':c['token'],'revision':c['revision'],'discount':invalid},status=400)
assert command('cart',{'cartToken':c['token']})['revision']==c['revision']
c=command('discount',{'cartToken':c['token'],'revision':c['revision'],'discount':discount})
reduction=(base*1000+5000)//10000
assert int(c['price']['totalMinor'])==base-reduction and c['posDiscount']['minor']==str(reduction)
assert c['posDiscount']['actor']==a['user']['id']
command('discount',{'cartToken':c['token'],'revision':c['revision']-1,'discount':None},status=409)
c=command('discount',{'cartToken':c['token'],'revision':c['revision'],'discount':{**discount,'kind':'fixed','value':123}})
assert int(c['price']['totalMinor'])==base-123
c=command('discount',{'cartToken':c['token'],'revision':c['revision'],'discount':None})
assert int(c['price']['totalMinor'])==base
c=command('discount',{'cartToken':c['token'],'revision':c['revision'],'discount':discount})
# Underpayment and stale review must not create an order or deduct inventory.
body={'cartToken':c['token'],'revision':c['revision'],'requestKey':'pos-'+c['id'],'totalMinor':c['price']['totalMinor'],'tenderMinor':str(int(c['price']['totalMinor'])-1)}
command('complete',body,status=400)
command('complete',{**body,'totalMinor':'0','tenderMinor':'100000'},status=409)
assert command('catalog',{'barcode':p['product_number']})['elements'][0]['stock']==stock
assert command('sales')['elements']==[]
# Pausing a register blocks writes; settings changes preserve optimistic channel revision.
paused={**data,'active':False};pause=call('/api/automation/channels/register',{'revision':ch['revision'],'data':paused},h,'PUT')
command('complete',{**body,'tenderMinor':'100000'},status=403)
ch=call('/api/automation/channels/register',{'revision':pause['revision'],'data':data},h,'PUT')
# Shared durable Flow Builder consumes the new event, not a separate POS worker.
flow={'name':{'en-GB':'POS audit'},'event':'pos.sale_completed','active':True,'condition':{'type':'alwaysValid'},'action':'note','instruction':{'en-GB':'POS completed','de-DE':'Kasse abgeschlossen'},'locale':'de-DE'}
call('/api/automation/flows/pos_audit',{'revision':0,'data':flow},h,'PUT')
# Concurrent repeated submission has exactly one order/stock deduction and cash change is exact.
body['tenderMinor']=str(int(body['totalMinor'])+1000)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:orders=list(pool.map(lambda _:command('complete',body),range(2)))
o=orders[0];assert o['id']==orders[1]['id'];assert o['payment']['state']=='paid' and o['payment']['cashReceived']
assert o['pos']['cash']['changeMinor']=='1000' and o['pos']['cash']['receivedMinor']==body['totalMinor']
assert o['salesChannelId']=='register' and o['channel']=='pos' and 'Schreibtisch' in o['cart']['lineItems'][0]['label']
assert len(command('sales')['elements'])==1
assert command('catalog',{'barcode':p['product_number']})['elements'][0]['stock']==stock-1
assert command('cart',{'cartToken':c['token']})['order']['id']==o['id']
for _ in range(100):
    jobs=call('/api/automation/executions',h=h)['jobs']
    completed=next((j for j in jobs if j['flow']=='pos_audit' and j['state']=='completed'),None)
    if completed:break
    time.sleep(.1)
assert completed and completed['result']['orderId']==o['id'] and completed['result']['note']=='Kasse abgeschlossen'
# Receipt uses the existing immutable invoice/PDF owner; presentation is an order snapshot.
call('/api/settings/master-data',{'revision':0,'data':{'name':'POS Test Seller','address':'Fixture street','taxId':'TEST'}},h,'PUT')
receipt=call('/api/merchant/orders/'+o['id']+'/receipts',{'revision':o['revision'],'kind':'invoice','locale':'de','requestKey':'pos-receipt-'+o['id']},h)
pdf=call(receipt['pdfPath'],h=h,raw=True);assert pdf.startswith(b'%PDF') and b'Danke' in pdf
assert o['orderCustomer']['customerId']==profile['id'] and o['billingAddress']['street']==address['street']
assert int(o['money']['minor'])==base-reduction and o['cart']['posDiscount']['reason']==discount['reason']
projection=command('receipt',{'orderId':o['id'],'receiptId':receipt['id']})
assert projection['number']==receipt['number'] and any('Danke' in line for line in projection['lines'])
command('receipt',{'orderId':o['id'],'receiptId':receipt['id']},sh,status=403)
command('receipt',{'orderId':o['id'],'receiptId':receipt['id']},bh,status=404)
assert 'pos.discount_changed' in call('/api/automation/catalog',h=h)['events']
assert 'pos.customer_selected' in call('/api/automation/catalog',h=h)['events']
for _ in range(100):
    jobs=call('/api/automation/executions',h=h)['jobs']
    if any(j['flow']=='discount_audit' and j['state']=='completed' and j['result']['note']=='Discount reviewed' for j in jobs):break
    time.sleep(.1)
else:raise AssertionError('POS adjustment event did not reach the shared Flow consumer')

call(receipt['pdfPath'],h=bh,status=404,raw=True)
call('/api/automation/channels/register',{'revision':ch['revision']},h,'DELETE',409)
# POS event is selectable in the same Flow Builder and executes a standard note on this order.
flow={'name':{'en-GB':'POS audit'},'event':'pos.sale_completed','active':True,'steps':[{'type':'note','message':{'en-GB':'POS completed'}}]}
# Use the shared event catalog here; actual pipeline fixture covers the producer/consumer below.
assert 'pos.sale_completed' in call('/api/automation/catalog',h=h)['events']
# A generic native app can mount all POS slots; owned models stay in its canonical package.
manifest={'id':'pos_helper','version':'0.1.0','name':{'en-GB':'POS helper','de-DE':'Kassenhelfer'},'runtime':'declarative','coreApi':'1','permissions':['data.read','data.write','admin.slot'],'events':[],'entities':[],'surfaces':[{'id':'catalog','location':'admin.pos.catalog','label':{'en-GB':'POS help'},'uiPath':'native/catalog','actions':[]}],'views':[{'id':'catalog','layout':'stack','blocks':[{'id':'hint','kind':'text','title':{'en-GB':'POS help'},'text':{'en-GB':'Gift wrapping is available'}}]}]}
call('/api/apps',{'manifest':manifest},h)
print('PASS native POS channel/cash/location, catalog/barcode, held carts, cashier roles/foreign denial, paused sale, reviewed total, double submission, shared stock/order/receipt/PDF, MCP and app slot/event contracts')
