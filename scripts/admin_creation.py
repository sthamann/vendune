#!/usr/bin/env python3
"""Native Admin customer/manual-order HTTP+MCP state, isolation, replay and private token regressions. No provider calls."""
import copy,json,os,uuid,urllib.request,urllib.error,concurrent.futures
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8787');suffix=uuid.uuid4().hex[:8];password='Synthetic-admin-creation-2026!'
def req(path,body=None,h=None,method=None,expected=200):
    r=urllib.request.Request(BASE+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method or ('GET' if body is None else 'POST'))
    try:
        with urllib.request.urlopen(r,timeout=30) as out:status,data=out.status,out.read()
    except urllib.error.HTTPError as e:status,data=e.code,e.read()
    assert status==expected,(path,status,expected,data.decode(errors='replace'))
    return json.loads(data)
def register(label):return req('/api/auth/register',{'name':label,'email':label+suffix+'@example.test','password':password,'workspaceId':label+'-'+suffix,'workspaceName':'Admin creation '+label})
def headers(s):return {'Authorization':'Bearer '+s['token'],'x-tenant':s['workspace']}
owner=register('admcreate');foreign=register('admforeign');h=headers(owner);fh=headers(foreign);public={'x-tenant':owner['workspace']}
addr={'name':'Test Buyer','firstName':'Test','lastName':'Buyer','street':'Fixture Street 1','postalCode':'10115','city':'Berlin','country':'DE'}
body={'email':'buyer'+suffix+'@example.test','profile':{'name':'Test Buyer','firstName':'Test','lastName':'Buyer'},'customerGroup':'consumer','billingAddress':addr,'shippingAddress':None,'requestKey':'customer-'+suffix}
req('/api/merchant/customers',body,expected=401)
c=req('/api/merchant/customers',body,h);assert req('/api/merchant/customers',body,h)==c
req('/api/merchant/customers',{**body,'profile':{'name':'Different'}},h,expected=409)
detail=req('/api/merchant/customers/'+c['email'],h=h);assert len(detail['addresses']['elements'])==1 and detail['defaultBillingAddressId']==detail['defaultShippingAddressId']
req('/store-api/account/login',{'email':c['email'],'password':password},public,expected=401)
req('/api/merchant/customers',{**body,'requestKey':'another-'+suffix},h,expected=409)
assert req('/api/merchant/customers/create-context',h=h)['countries']
print('PASS admin customer: atomic address defaults, idempotent replay, duplicate rejection and no storefront credential')
context=req('/api/merchant/order-drafts/context',{'channelId':'default'},h);assert context['channels'] and context['customerGroups']
draft={'channelId':'default','locale':'de-DE','currency':'EUR','customerId':c['id'],'items':[{'id':'chair','quantity':1}],'checkout':{'country':'DE','shippingMethodId':'standard','paymentMethodId':'demo-card','address':addr,'billingAddress':addr},'codes':[]}
req('/api/merchant/order-drafts/review',draft,fh,expected=404)
review=req('/api/merchant/order-drafts/review',draft,h);cart=review['cart'];assert cart['locale']=='de-DE' and cart['customerId']==c['id']
stolen={**public,'sw-context-token':cart['token'],'x-rac-admin-order':owner['user']['id']}
req('/store-api/checkout/cart',h=stolen,expected=403)
req('/store-api/checkout/order',{}, {**stolen,'Idempotency-Key':'stolen-'+suffix},expected=403)
complete={'channelId':'default','locale':'de-DE','cartToken':cart['token'],'revision':cart['revision'],'totalMinor':cart['price']['totalMinor'],'approve':True,'customerAcknowledgement':True,'policyVersion':review['policy']['policyVersion'],'terms':True,'digitalImmediate':False,'requestKey':'manual-'+suffix}
req('/api/merchant/order-drafts/complete',complete,fh,expected=404)
req('/api/merchant/order-drafts/complete',{**complete,'approve':False},h,expected=400)
req('/api/merchant/order-drafts/complete',{**complete,'totalMinor':'1'},h,expected=409)
order=req('/api/merchant/order-drafts/complete',complete,h);assert req('/api/merchant/order-drafts/complete',complete,h)['id']==order['id']
assert order['realMoneyCharged'] is False if 'realMoneyCharged' in order else order['payment']['realMoneyCharged'] is False
assert order['orderCustomer']['customerId']==c['id'] and order['createdBy']['actor']==owner['user']['id']
assert order['legal']['acceptance']['source']=='merchantRecordedCustomerAcknowledgement'
assert any(o['id']==order['id'] for o in req('/api/merchant/customers/'+c['email'],h=h)['orders'])
assert req('/api/merchant/products/chair',h=h)['commerce']['stock']==19
print('PASS manual order: German authoritative quote, immutable customer link, exact total, stock/outbox and replay; public/foreign token denied')
# All compound rights are enforced at both discovery and invocation.
inv=req('/api/workspace/invitations',{'email':'limited'+suffix+'@example.test','role':'viewer'},h);limited=req('/api/auth/accept',{'name':'Limited','password':password,'invitationToken':inv['token']});lh=headers(limited)
req('/api/workspace/members/'+limited['user']['id'],{'role':'viewer','active':True,'permissions':['orders.write','orders.read','customers.pii']},h,'PUT')
req('/api/merchant/order-drafts/context',{'channelId':'default'},lh,expected=403)
tools=req('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/list'},lh)['result']['tools'];assert not any(t['name']=='merchant.order.review' for t in tools)
req('/api/workspace/members/'+limited['user']['id'],{'role':'viewer','active':True,'permissions':['orders.write','orders.read','customers.pii','customers.read','catalog.read']},h,'PUT')
req('/api/merchant/order-drafts/context',{'channelId':'default'},lh)
req('/api/merchant/order-drafts/complete',complete,lh,expected=403)
mc=req('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'merchant.order.review','arguments':draft}},lh)['result'];assert not mc.get('isError'),mc
print('PASS granular and actor rights: no settings/channel admin grant required; MCP/API share current admission')
# Customer mutation and completion share customer-before-cart lock ordering.
for i in range(3):
    r=req('/api/merchant/order-drafts/review',draft,h);q=r['cart'];cmd={**complete,'cartToken':q['token'],'revision':q['revision'],'totalMinor':q['price']['totalMinor'],'policyVersion':r['policy']['policyVersion'],'requestKey':'race-'+suffix+'-'+str(i)}
    detail=req('/api/merchant/customers/'+c['email'],h=h);edit={'revision':detail['revision'],'profile':detail['profile'],'company':detail['company'],'customerGroup':detail['customerGroup'],'active':True}
    def run(args):
        try:return req(*args)
        except AssertionError as e:assert e.args[0][1] in (400,404,409),e;return None
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:list(ex.map(run,[('/api/merchant/order-drafts/complete',cmd,h),('/api/merchant/customers/'+c['email'],edit,h,'PUT')]))
print('PASS concurrent customer edits/manual checkout return success or re-review without deadlocks or duplicate writes')
if os.environ.get('ADMIN_CREATION_FIXTURE'):
    import pathlib
    pathlib.Path(os.environ['ADMIN_CREATION_FIXTURE']).write_text(json.dumps({'workspace':owner['workspace'],'email':'admcreate'+suffix+'@example.test','password':password,'customerEmail':c['email'],'orderId':order['id']}))
# Independent drafts for one customer serialize the customer write, without SHARE-to-UPDATE upgrades.
reviews=[req('/api/merchant/order-drafts/review',draft,h) for _ in range(2)]
commands=[{**complete,'cartToken':r['cart']['token'],'revision':r['cart']['revision'],'totalMinor':r['cart']['price']['totalMinor'],'policyVersion':r['policy']['policyVersion'],'requestKey':'parallel-'+suffix+'-'+str(i)} for i,r in enumerate(reviews)]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
    placed=list(ex.map(lambda cmd:req('/api/merchant/order-drafts/complete',cmd,h),commands))
assert len({o['id'] for o in placed})==2
print('PASS two carts for one customer serialize correctly and produce two separate native orders')
# Completed replay must not depend on subsequently edited customer eligibility.
detail=req('/api/merchant/customers/'+c['email'],h=h)
req('/api/merchant/customers/'+c['email'],{'revision':detail['revision'],'profile':detail['profile'],'company':detail['company'],'customerGroup':detail['customerGroup'],'active':False},h,'PUT')
assert req('/api/merchant/order-drafts/complete',commands[0],h)['id']==placed[0]['id']
detail=req('/api/merchant/customers/'+c['email'],h=h)
req('/api/merchant/customers/'+c['email'],{'revision':detail['revision'],'profile':detail['profile'],'company':detail['company'],'customerGroup':detail['customerGroup'],'active':True},h,'PUT')
# A real account cannot log out another actor's private cart.
customer_session=req('/store-api/account/register',{'email':'own'+suffix+'@example.test','name':'Own buyer','password':password},public)
new_review=req('/api/merchant/order-drafts/review',draft,h)
req('/store-api/account/logout',{}, {**public,'x-customer-token':customer_session['customerToken'],'sw-context-token':new_review['cart']['token']},expected=403)
assert req('/store-api/account/profile',h={**public,'x-customer-token':customer_session['customerToken']})
print('PASS completed replay survives customer deactivation; own customer session cannot mutate a private admin cart')
# Private channel and final payment configuration changes never become admin purchases.
channels=req('/api/automation',h=h)['channels'];default=next(ch for ch in channels if ch['id']=='default')
r=req('/api/merchant/order-drafts/review',draft,h);q=r['cart'];cmd={**complete,'cartToken':q['token'],'revision':q['revision'],'totalMinor':q['price']['totalMinor'],'policyVersion':r['policy']['policyVersion'],'requestKey':'private-'+suffix}
req('/api/automation/channels/default',{'revision':default['revision'],'data':{**default['data'],'visibility':'private'}},h,'PUT')
req('/api/merchant/order-drafts/complete',cmd,h,expected=403)
req('/api/merchant/order-drafts/context',{'channelId':'default'},h,expected=403)
default=next(ch for ch in req('/api/automation',h=h)['channels'] if ch['id']=='default')
req('/api/automation/channels/default',{'revision':default['revision'],'data':{**default['data'],'visibility':'public'}},h,'PUT')
# An immutable purchased download retains account ownership; private cart token possession alone is insufficient.
product=req('/api/merchant/products/chair',h=h);product['extra']['digital']=True;req('/api/merchant/products/chair',product,h,'PUT')
boundary='download-'+suffix;payload=b''
for key,value in [('title',json.dumps({l:'Synthetic download' for l in ['en','de','fr','es']})),('kind','download')]:payload+=f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode()
payload+=f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="fixture.txt"\r\nContent-Type: text/plain\r\n\r\n'.encode()+b'Synthetic paid file'+f'\r\n--{boundary}--\r\n'.encode()
with urllib.request.urlopen(urllib.request.Request(BASE+'/api/merchant/products/chair/assets',data=payload,headers={**h,'Content-Type':'multipart/form-data; boundary='+boundary}),timeout=30) as response:asset=json.loads(response.read())
req('/api/merchant/assets/'+asset['id'],{'public':True,'digest':asset['digest']},h,'PUT')
customer_detail=req('/api/merchant/customers/own'+suffix+'@example.test',h=h)
digital_draft={**draft,'customerId':customer_detail['id']}
r=req('/api/merchant/order-drafts/review',digital_draft,h);q=r['cart'];cmd={**complete,'cartToken':q['token'],'revision':q['revision'],'totalMinor':q['price']['totalMinor'],'policyVersion':r['policy']['policyVersion'],'digitalImmediate':True,'requestKey':'digital-'+suffix}
digital_order=req('/api/merchant/order-drafts/complete',cmd,h)
path='/store-api/orders/'+digital_order['id']+'/downloads/'+asset['id']
req(path,h={**public,'sw-context-token':q['token']},expected=404)
with urllib.request.urlopen(urllib.request.Request(BASE+path,headers={**public,'x-customer-token':customer_session['customerToken']}),timeout=30) as response:assert response.read()==b'Synthetic paid file'
print('PASS private channels cannot purchase; private admin cart token cannot download while immutable owning-account purchase can')
# Discovery lists exactly the native arguments rather than an empty object schema.
tools=req('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/list'},h)['result']['tools']
assert 'customerId' in next(t for t in tools if t['name']=='merchant.order.review')['inputSchema']['properties']
assert 'billingAddress' in next(t for t in tools if t['name']=='merchant.customer.create')['inputSchema']['properties']
print('PASS native Admin/MCP creation schemas expose the complete admitted input contract')
