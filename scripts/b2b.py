#!/usr/bin/env python3
"""Native company procurement with real isolated PostgreSQL: approval, budgets, catalogs and shared checkout."""
import concurrent.futures,copy,json,os,time,urllib.request,urllib.error,uuid
BASE=os.environ['BASE_URL'];suffix=uuid.uuid4().hex[:8];password='Synthetic-B2B-fixture-2026!'
def call(path,body=None,h=None,method=None,status=200):
    req=urllib.request.Request(BASE+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method or ('GET' if body is None else 'POST'))
    try:r=urllib.request.urlopen(req,timeout=30)
    except urllib.error.HTTPError as e:r=e
    data=r.read();assert r.status in (status if isinstance(status,tuple) else (status,)),(path,r.status,status,data[:1000])
    return json.loads(data)
def shop(label):
    r=call('/api/auth/register',{'workspaceId':label+'-'+suffix,'workspaceName':label,'name':'Owner','email':label+suffix+'@example.test','password':password})
    return {'x-tenant':r['workspace'],'Authorization':'Bearer '+r['token']}
mh=shop('b2b');fh=shop('b2bforeign');pub={'x-tenant':mh['x-tenant'],'x-commerce-locale':'de-DE'}
def customer(label):
    r=call('/store-api/account/register',{'name':label,'email':label+suffix+'@example.test','password':password},pub)
    h={**pub,'x-customer-token':r['customerToken']};return call('/store-api/account/profile',h=h)['id'],h
buyer,bh=customer('buyer');approver,ah=customer('approver');outsider,oh=customer('outsider')
def admin(op,data,h=mh,status=200):return call('/api/b2b/'+op,data,h,status=status)
def employee(op,data,h=bh,status=200):return call('/store-api/b2b/'+op,data,h,status=status)
names={'en-GB':'Acme','de-DE':'Acme','es-ES':'Acme'}
flow={'name':names,'active':True,'event':'b2b.purchase_completed','condition':{'type':'alwaysValid'},'action':'pipeline','instruction':names,'locale':'de-DE','pipeline':{'entry':'tag','nodes':[{'kind':'action','id':'tag','action':'action.add.order.tag','config':{'tags':['b2b-purchased']},'next':None}]}}
call('/api/automation/flows/company_purchase',{'revision':0,'data':flow},mh,'PUT')
co=admin('company.save',{'id':'acme','revision':0,'data':{'name':names,'active':True,'vatId':'DE-SYNTHETIC'}})
unit={'name':names,'active':True,'currency':'EUR','approvalAboveMinor':0,'budgetMinor':100000,'budgetPeriod':'month','restrictedCatalog':False,'requirePurchaseOrder':True,'costCenter':'IT'}
u=admin('unit.save',{'id':'it','companyId':'acme','revision':0,'data':unit})
for cid in [buyer,approver]:admin('member.save',{'unitId':'it','customerId':cid,'revision':0,'data':{'active':True,'permissions':['buy','approve','lists','quotes','companyOrders']}})
assert len(admin('companies',{})['companies'])==1 and admin('companies',{},fh)['companies']==[]
admin('company',{'id':'acme'},fh,404);employee('company.save',{},bh,403)
assert len(employee('contexts',{},bh)['elements'])==1 and employee('contexts',{},oh)['elements']==[]
c=call('/store-api/checkout/cart',{},bh);bh['sw-context-token']=c['token']
employee('select',{'unitId':'it','revision':c['revision']}, {**oh,'sw-context-token':c['token']},403)
c=employee('select',{'unitId':'it','revision':c['revision'],'purchaseOrder':'PO-123'})
assert c['customerGroup']=='business' and c['b2b']['costCenter']=='IT'
c=call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'lamp','quantity':1}]},bh)
stock=call('/store-api/product/lamp',h=pub)['product']['stock'];total=int(c['price']['totalMinor'])
call('/store-api/checkout/order',{}, {**bh,'Idempotency-Key':'unapproved-'+suffix},status=409)
assert call('/store-api/product/lamp',h=pub)['product']['stock']==stock
request=employee('approval.request',{'revision':c['revision']});assert request==employee('approval.request',{'revision':c['revision']})
employee('approval.decide',{'id':request['id'],'revision':request['revision'],'state':'approved'},bh,409)
employee('approval.decide',{'id':request['id'],'revision':request['revision'],'state':'approved'},oh,403)
inbox=employee('approvals',{'unitId':'it'},ah)['elements'];assert len(inbox)==1 and 'token'not in inbox[0]['data']['quote']
approved=employee('approval.decide',{'id':request['id'],'revision':request['revision'],'state':'approved'},ah)
# Changes to quantity invalidate approval even if a buyer keeps the same context token.
c=call('/store-api/checkout/cart',{'revision':c['revision'],'items':[{'id':'lamp','quantity':2}]},bh,'PUT')
call('/store-api/checkout/order',{}, {**bh,'Idempotency-Key':'stale-approval-'+suffix},status=409)
# RFQ ownership, strict expiry and exact original-cart offer binding.
rfq=employee('quote.request',{'revision':c['revision'],'message':'Please quote two lamps'})
admin('quote.offer',{'id':rfq['id'],'revision':1,'data':{'lines':[{'id':'lamp','quantity':2,'grossMinor':5000}],'validUntil':'not-a-date'}},status=400)
import datetime
until=(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=7)).isoformat()
offer=admin('quote.offer',{'id':rfq['id'],'revision':1,'message':'Agreed','data':{'lines':[{'id':'lamp','quantity':2,'grossMinor':5000}],'validUntil':until}})
admin('quote.offer',{'id':rfq['id'],'revision':1,'data':{'lines':[{'id':'lamp','quantity':2,'grossMinor':5000}],'validUntil':until}},fh,404)
employee('quote.accept',{'id':rfq['id'],'revision':offer['revision'],'cartRevision':c['revision']},{**oh,'sw-context-token':c['token']},403)
c=employee('quote.accept',{'id':rfq['id'],'revision':offer['revision'],'cartRevision':c['revision']})
assert c['b2b']['quoteId']==rfq['id']
assert abs(c['lineItems'][0]['price']['totalPrice']+sum(t['tax']for t in c['lineItems'][0]['price']['calculatedTaxes'])-100)<.011,c
request=employee('approval.request',{'revision':c['revision']});employee('approval.decide',{'id':request['id'],'revision':request['revision'],'state':'approved'},ah)
order=call('/store-api/checkout/order',{}, {**bh,'Idempotency-Key':'approved-'+suffix})
assert order['b2b']['unitId']=='it' and order['b2b']['purchaseOrder']=='PO-123'
assert call('/store-api/checkout/order',{}, {**bh,'Idempotency-Key':'approved-'+suffix})['id']==order['id']
assert call('/store-api/product/lamp',h=pub)['product']['stock']==stock-2
for _ in range(200):
    jobs=call('/api/automation',h=mh)['jobs']
    if any(j['flow']=='company_purchase'and j['state']=='completed'for j in jobs):break
    time.sleep(.1)
else:raise AssertionError(('B2B purchase flow did not complete',jobs))
assert call('/api/merchant/orders/'+order['id'],h=mh)['automation']['tags']==['b2b-purchased']
assert employee('approvals',{'unitId':'it'},ah)['elements'][0]['state']=='consumed'
assert employee('quotes',{'unitId':'it'})['elements'][0]['state']=='ordered'
assert len(employee('unit.orders',{'unitId':'it'},ah)['elements'])==1
employee('unit.orders',{'unitId':'it','id':order['id']},oh,403)
assert 'token'not in employee('unit.orders',{'unitId':'it','id':order['id']},ah)['elements'][0]['cart']
# Private/shared list ownership and native SKU lookup with cart CAS.
listid='fixtures';ls=employee('list.save',{'id':listid,'unitId':'it','revision':0,'data':{'name':{'en-GB':'Repeat lamps'},'shared':True,'items':[{'id':'lamp','quantity':1}]}})
assert len(employee('lists',{'unitId':'it'},ah)['elements'])==1
employee('list.delete',{'id':listid,'unitId':'it','revision':ls['revision']},ah,403)
listcart=call('/store-api/checkout/cart',{},bh);bh['sw-context-token']=listcart['token'];listcart=employee('select',{'unitId':'it','revision':listcart['revision'],'purchaseOrder':'LIST-1'})
listcart=employee('list.apply',{'id':listid,'unitId':'it','revision':ls['revision'],'cartRevision':listcart['revision']});assert listcart['lineItems'][0]['quantity']==1
sku=call('/store-api/product/lamp',h=pub)['product']['product_number']
listcart=employee('quick-order',{'revision':listcart['revision'],'lines':[{'sku':sku,'quantity':2}]});assert listcart['lineItems'][0]['quantity']==2
employee('list.delete',{'id':listid,'unitId':'it','revision':ls['revision']})
assert not employee('lists',{'unitId':'it'},ah)['elements']
# Private catalog scope precedes keyset pages/search and cannot be forged in caller criteria.
u=admin('unit.save',{'id':'it','companyId':'acme','revision':u['revision'],'data':{**unit,'restrictedCatalog':True,'approvalAboveMinor':None,'budgetMinor':int(order['cart']['price']['totalMinor'])+total}})
u=admin('catalog.save',{'unitId':'it','revision':u['revision'],'productIds':['lamp']})
c=call('/store-api/checkout/cart',{},bh);bh['sw-context-token']=c['token'];c=employee('select',{'unitId':'it','revision':c['revision'],'purchaseOrder':'PO-456'})
assert [p['id']for p in call('/store-api/product',{},bh)['elements']]==['lamp']
assert call('/store-api/product',{'search':'chair'},bh)['elements']==[]
# A catalog selecting one SKU must not leak sibling options through the family detail.
variant=call('/api/merchant/products/lamp',h=mh)
for key in ['id','channels']:variant.pop(key,None)
variant['revision']=0
variant['catalog'].update({'parentId':'lamp','options':{'size':'M'},'productNumber':'B2B-M-'+suffix})
visible=call('/api/merchant/products',variant,mh)['id']
variant['catalog'].update({'options':{'size':'L'},'productNumber':'B2B-L-'+suffix})
hidden=call('/api/merchant/products',variant,mh)['id']
u=admin('catalog.save',{'unitId':'it','revision':u['revision'],'productIds':[visible]})
family=call('/store-api/product/lamp',h=bh)
assert visible in [p['id']for p in family['variants']] and hidden not in [p['id']for p in family['variants']]
call('/store-api/product/'+hidden,h=bh,status=404)
u=admin('catalog.save',{'unitId':'it','revision':u['revision'],'productIds':['lamp']})
call('/store-api/product/chair',h=bh,status=404)
call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'chair','quantity':1}]},bh,status=404)
c=call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'lamp','quantity':1}]},bh)
# A second owned cart competes for the same period budget. Exactly one transaction fits.
c2=call('/store-api/checkout/cart',{},bh);h2={**bh,'sw-context-token':c2['token']};c2=employee('select',{'unitId':'it','revision':c2['revision'],'purchaseOrder':'PO-789'},h2);c2=call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'lamp','quantity':1}]},h2)
with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:
    results=list(pool.map(lambda h:call('/store-api/checkout/order',{}, {**h,'Idempotency-Key':'budget-'+h['sw-context-token']},status=(200,409)),[bh,h2]))
assert sum('id'in r for r in results)==1,results
assert call('/store-api/product/lamp',h=pub)['product']['stock']==stock-3
# A policy edit must not erase spending by switching its accounting currency or period.
current_unit=next(x for x in admin('company',{'id':'acme'})['units'] if x['id']=='it')
admin('unit.save',{'id':'it','companyId':'acme','revision':current_unit['revision'],'data':{**current_unit['data'],'budgetPeriod':'year'}},status=409)
assert next(x for x in admin('company',{'id':'acme'})['units']if x['id']=='it')['data']['budgetPeriod']=='month'
issuer=call('/api/merchant/receipts/settings',h=mh)
call('/api/merchant/receipts/settings',{'revision':issuer['revision'],'data':{'name':'B2B Fixture Seller','address':'Fixture Lane 1','taxId':'TEST-ONLY'}},mh,'PUT')
# The event-driven tag changed the order revision; receipt creation must use its current revision.
order=call('/api/merchant/orders/'+order['id'],h=mh)
receipt=call('/api/merchant/orders/'+order['id']+'/receipts',{'revision':order['revision'],'kind':'invoice','locale':'de','requestKey':'b2b-invoice-'+suffix},mh)
detail=employee('unit.orders',{'unitId':'it','id':order['id']},ah)['elements'][0]
assert detail['receipts'][0]['number']==receipt['number']
pdf_path=detail['receipts'][0]['pdfPath']
req=urllib.request.Request(BASE+pdf_path,headers=ah)
assert urllib.request.urlopen(req).read().startswith(b'%PDF')
employee('unit.orders',{'unitId':'it','id':order['id']},oh,403)
# Immediate membership revocation blocks old cart/session authority, without mutating its state.
active=admin('member.save',{'unitId':'it','customerId':buyer,'revision':1,'data':{'active':False,'permissions':['buy']}})
call('/store-api/product',{},h2,status=403);call('/store-api/checkout/cart',h=h2,status=403)
# Unit hierarchy rejects cycles, including competing concurrent moves.
unit2={**unit,'approvalAboveMinor':None}
u2=admin('unit.save',{'id':'sales','companyId':'acme','revision':0,'data':unit2})
current=admin('company',{'id':'acme'})
u1=next(x for x in current['units']if x['id']=='it')
with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:
    moves=list(pool.map(lambda v:admin('unit.save',v,status=(200,400)),[{'id':'it','companyId':'acme','parentId':'sales','revision':u1['revision'],'data':unit2},{'id':'sales','companyId':'acme','parentId':'it','revision':u2['revision'],'data':unit2}]))
assert sum('id'in r for r in moves)==1,moves
# MCP uses the same commands, scope checks and strict fields.
tools=call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/list'},mh)['result']['tools'];assert any(x['name']=='b2b.catalog.save' for x in tools)
assert 'productIds'in next(x['inputSchema']for x in tools if x['name']=='b2b.catalog.save')['properties']
print('PASS native B2B organization/unit/membership, self/foreign denial, immutable approvals, stale quote, exact concurrent budgets, private catalog, revocation, hierarchy and MCP')
