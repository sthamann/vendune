#!/usr/bin/env python3
"""Real typed WIT host reads, all four quote hooks and checkout persistence/CAS/tenant negative cases."""
import copy,json,os,pathlib,urllib.request,urllib.error,uuid
from testing.app_approval import consent
base=os.environ['BASE_URL'];t='wit-'+uuid.uuid4().hex[:10]
def call(path,body=None,h=None,status=200,method=None):
 if path=='/api/apps' and body is not None:body=consent(body)
 req=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method)
 try:
  with urllib.request.urlopen(req,timeout=30) as r:code=r.status;v=json.load(r)
 except urllib.error.HTTPError as e:code=e.code;v=json.load(e)
 assert code==status,(path,code,status,v);return v
u=call('/api/auth/register',{'workspaceId':t,'name':'WIT owner','email':t+'@example.test','password':'Synthetic-component-password!'})
h={'x-tenant':t,'Authorization':'Bearer '+u['token']};ch={'x-tenant':t}
m=json.loads((pathlib.Path(__file__).resolve().parents[1]/'extensions/apps/snapshot-pricing/manifest.json').read_text())
# Frozen cases are executed before installation, not trusted as stored pass flags.
wrong=copy.deepcopy(m);wrong['id']='wrong_examples';wrong['capability']['examples'][1]['expected']['adjustment']['minor']+=1
error=call('/api/apps',{'manifest':wrong},h,400)
assert error['errors'][0]['pointer']=='/capability/examples/1/expected',error
assert all(p['id']!='wrong_examples' for p in call('/api/apps',h=h)['packages'])
call('/api/apps',{'manifest':m},h)
expected_contract=next(p for p in call('/api/apps',h=h)['packages'] if p['id']==m['id'])['manifest']['capability']
print('PASS failed frozen decisions reject installation without creating a package; correct cases execute through the real WIT runtime')
c=call('/store-api/checkout/cart',{'session':uuid.uuid4().hex},ch);ch['sw-context-token']=c['token']
c=call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'mug','quantity':1}]},ch)
out=c['appHookOutcomes'];assert [r['hook'] for r in out]==['price','discount','shipping','validation'];assert [r['minor'] for r in out]==[24,25,24,0],out
assert c['price']['positionPrice']==24.89 and c['shippingCosts']['totalPrice']==0.24 and c['price']['totalPrice']==25.13,c['price']
c=call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'mug','quantity':2}]},ch);assert c['appHookOutcomes'][0]['minor']>24,c['appHookOutcomes']
address={'name':'WIT Buyer','firstName':'WIT','lastName':'Buyer','street':'Fixture Street 1','postalCode':'10115','city':'Berlin','country':'DE'}
ctx=call('/store-api/checkout/context',{'revision':c['revision'],'checkout':{'country':'DE','shippingMethodId':'pickup','paymentMethodId':'bank-transfer','address':address,'billingAddress':address,'customerEmail':t+'@example.test'}},ch,method='PUT');c=call('/store-api/checkout/cart',h=ch)
key=uuid.uuid4().hex;oh={**ch,'Idempotency-Key':key,'x-commerce-cart-revision':str(c['revision']),'x-commerce-total-minor':str(round(c['price']['totalPrice']*100))};order=call('/store-api/checkout/order',{},oh);assert order['cart']['appHookOutcomes']==c['appHookOutcomes'];assert call('/store-api/checkout/order',{},oh)['id']==order['id']
print('PASS WIT actual cart reads drive price, discount, shipping and validation; native tax/FX owner, reviewed checkout and idempotent order persist the outcomes')
other=t+'-other';u2=call('/api/auth/register',{'workspaceId':other,'name':'Other WIT owner','email':other+'@example.test','password':'Synthetic-component-password!'})
c2=call('/store-api/checkout/cart',{'session':uuid.uuid4().hex},{'x-tenant':other});assert not c2['appHookOutcomes'];assert all(p['id']!='snapshot_pricing' for p in call('/api/apps',h={'x-tenant':other,'Authorization':'Bearer '+u2['token']})['packages'])
# The same cases fence developer imports, actor-private staging and selected publication.
stage=call('/api/environments',{'name':'Decision examples sandbox'},h)['id']
wrong['version']='1.2.0'
call('/api/developer/import',{'environment':stage,'prompt':'Wrong decision example','summary':wrong['name'],'manifest':wrong},h,400)
assert all(b['app']!='wrong_examples' for b in call('/api/developer',h=h)['builds'])
updated=copy.deepcopy(m);updated['version']='1.2.0'
rpc=call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'developer.import','arguments':{'environment':stage,'prompt':'Keep frozen examples with a new version','summary':updated['name'],'manifest':updated}}},h)
assert 'error' not in rpc and not rpc['result'].get('isError'),rpc
build=rpc['result']['structuredContent']
assert build['manifest']['capability']==expected_contract
call('/api/developer/builds/'+build['id']+'/stage',{'approve':True,'digest':build['digest']},h)
staged=next(p for p in call('/api/apps',h={**h,'x-tenant':stage})['packages'] if p['id']==m['id'])
assert staged['manifest']['capability']==expected_contract
change=next(c for c in call('/api/environments/'+stage+'/diff',h=h)['changes'] if c['key']=='app:'+m['id'])
call('/api/environments/'+stage+'/release',{'approve':True,'selections':[{'key':change['key'],'digest':change['digest']}]},h)
live=next(p for p in call('/api/apps',h=h)['packages'] if p['id']==m['id'])
assert live['version']=='1.2.0' and live['manifest']['capability']==expected_contract
assert m['id'] not in [p['id'] for p in call('/api/apps',h={'x-tenant':other,'Authorization':'Bearer '+u2['token']})['packages']]
print('PASS frozen examples survive developer import, native staged installation and selected release; invalid cases and foreign tenants cannot join the path')
invalid=copy.deepcopy(m);invalid['id']='invalid_wit';invalid['commerceHooks']['source']='(component)';call('/api/apps',{'manifest':invalid},h,400)
trapped=copy.deepcopy(m);trapped['id']='trapped_wit';trapped['commerceHooks']['source']=trapped['commerceHooks']['source'].replace('i32.const 256 call $cart','(loop $again i32.const 256 call $cart br $again)');call('/api/apps',{'manifest':trapped},h,400)
assert all(p['id']!='trapped_wit' for p in call('/api/apps',h=h)['packages'])
# Legacy components without declared examples still receive the existing ABI and per-call runtime guards.
trapped['capability']['examples']=[];call('/api/apps',{'manifest':trapped},h)
call('/store-api/checkout/cart',{'session':uuid.uuid4().hex},{'x-tenant':t},400)
call('/health')
print('PASS component ABI rejection, tenant isolation and bounded malicious host-call loops leave commerce alive')
