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
# History uses the same public MCP schema and validated writes; no employee/budget rewind.
co=admin('company',{'id':'acme'})
company_change=admin('company.save',{'id':'acme','revision':co['revision'],'data':{**co['data'],'externalId':'New ERP reference'}})
history=call('/api/history/b2bCompany/acme',h=mh);assert history['canRestore']
version=history['elements'][0]['id']
args={'entity':'b2bCompany','id':'acme','version':version,'approve':True,'revision':company_change['revision'],'side':'before'}
assert 'b2bCompany' in next(t for t in tools if t['name']=='merchant.history')['inputSchema']['properties']['entity']['enum']
result=call('/mcp',{'jsonrpc':'2.0','id':2,'method':'tools/call','params':{'name':'merchant.history.restore','arguments':args}},mh)['result'];assert not result.get('isError'),result
restored=admin('company',{'id':'acme'});assert restored['data'].get('externalId')==co['data'].get('externalId')
assert restored['members']==co['members'] and restored['units']==co['units']
call('/api/history/b2bCompany/acme/'+str(version)+'/restore',args,mh,status=409)
call('/api/history/b2bCompany/acme/'+str(version),h=fh,status=404)
restricted=call('/api/workspace/integrations',{'name':'B2B history reader','expiresInDays':1,'permissions':['b2b.read','customers.pii']},mh)
rh={**mh,'Authorization':'Bearer '+restricted['key']}
assert not call('/api/history/b2bCompany/acme',h=rh)['canRestore']
call('/api/history/b2bCompany/acme/'+str(version)+'/restore',{**args,'revision':restored['revision']},rh,status=403)
rt=call('/mcp',{'jsonrpc':'2.0','id':3,'method':'tools/list'},rh)['result']['tools'];assert 'merchant.history' in [t['name']for t in rt] and 'merchant.history.restore' not in [t['name']for t in rt]
assert 'b2bApproval' in next(t for t in rt if t['name']=='merchant.history.version')['inputSchema']['properties']['entity']['enum']
unit=next(u for u in restored['units']if u['id']=='it')
changed=admin('unit.save',{'id':'it','companyId':'acme','parentId':unit.get('parentId'),'revision':unit['revision'],'data':{**unit['data'],'costCenter':'Changed cost center'}})
uv=call('/api/history/b2bUnit/it',h=mh)['elements'][0]['id']
call('/api/history/b2bUnit/it/'+str(uv)+'/restore',{'approve':True,'revision':changed['revision'],'side':'before'},mh)
after=admin('company',{'id':'acme'});assert next(u for u in after['units']if u['id']=='it')['data']['costCenter']==unit['data']['costCenter']
assert after['members']==restored['members']
print('PASS B2B HTTP/MCP history, revision-checked configuration restoration, foreign denial, read-only financial history and unchanged current employee grants')

# Staging clones policies/catalogs only, then uses the same native live validation.
stage=call('/api/environments',{'name':'Private purchasing policies'},mh)['id'];sh={**mh,'x-tenant':stage}
staged=admin('company',{'id':'acme'},sh);assert staged['members']==[] and staged['units']
live=admin('company',{'id':'acme'});current=next(u for u in staged['units']if u['id']=='it')
assert current['catalogIds']==next(u for u in live['units']if u['id']=='it')['catalogIds']
saved=admin('unit.save',{'id':'it','companyId':'acme','parentId':current.get('parentId'),'revision':current['revision'],'data':{**current['data'],'budgetPeriod':'year','costCenter':'Staged cost center'}},sh)
def change(key):return next(c for c in call('/api/environments/'+stage+'/diff',h=mh)['changes']if c['key']==key)
def publish(ch,h=mh,status=200):return call('/api/environments/'+stage+'/release',{'approve':True,'selections':[{'key':ch['key'],'digest':ch['digest']}]},h,status=status)
ch=change('b2b-unit:it')
# No shadow financial ledger: current LIVE spending blocks changing the period.
publish(ch,status=409)
assert admin('company',{'id':'acme'})==live
saved=admin('unit.save',{'id':'it','companyId':'acme','parentId':current.get('parentId'),'revision':saved['revision'],'data':{**current['data'],'costCenter':'Staged cost center'}},sh)
# A stale staged digest and insufficient privileges cannot mutate live policy.
publish(ch,status=409)
ch=change('b2b-unit:it')
manager=call('/api/workspace/integrations',{'name':'Environment manager only','expiresInDays':1,'permissions':['team.manage','settings.read','settings.write']},mh)
limited={**mh,'Authorization':'Bearer '+manager['key']}
assert not any(c['key'].startswith('b2b-')for c in call('/api/environments/'+stage+'/diff',h=limited)['changes'])
publish(ch,limited,403)
publish(ch)
released=admin('company',{'id':'acme'});assert released['members']==live['members']
assert next(u for u in released['units']if u['id']=='it')['data']['costCenter']=='Staged cost center'
assert next(u for u in released['units']if u['id']=='it')['catalogIds']==current['catalogIds']
assert not any(c['key']=='b2b-unit:it'for c in call('/api/environments/'+stage+'/diff',h=mh)['changes'])
hist=call('/api/history/b2bUnit/it',h=mh)['elements'];assert hist[0]['source']=='staging.release'
# New companies and nested units publish parent-first, not key-order SQL bypasses.
admin('company.save',{'id':'stagedco','revision':0,'data':{'name':names,'active':True}},sh)
parent=admin('unit.save',{'id':'z_parent','companyId':'stagedco','revision':0,'data':unit2},sh)
admin('unit.save',{'id':'a_child','companyId':'stagedco','parentId':'z_parent','revision':0,'data':unit2},sh)
changes=[change(k)for k in ['b2b-unit:a_child','b2b-company:stagedco','b2b-unit:z_parent']]
call('/api/environments/'+stage+'/release',{'approve':True,'selections':[{'key':c['key'],'digest':c['digest']}for c in changes]},mh)
assert len(admin('company',{'id':'stagedco'})['units'])==2
# Changing live content after clone must leave the selected staged policy unpublishable.
co=admin('company',{'id':'acme'},sh);admin('company.save',{'id':'acme','revision':co['revision'],'data':{**co['data'],'externalId':'Staged ERP'}},sh)
co=admin('company',{'id':'acme'});admin('company.save',{'id':'acme','revision':co['revision'],'data':{**co['data'],'externalId':'Live ERP'}})
assert change('b2b-company:acme')['conflict'];publish(change('b2b-company:acme'),status=409)
print('PASS B2B private configuration clone, native atomic release, preserved live employees/spending, live allocation guard, parent-first publication, hidden unauthorized diffs and live/stage conflicts')

# Method deletion preflight includes purchasing-policy dependencies, even without a cart.
co=admin('company',{'id':'stagedco'});unit=next(u for u in co['units']if u['id']=='z_parent')
admin('unit.save',{'id':'z_parent','companyId':'stagedco','revision':unit['revision'],'data':{**unit['data'],'allowedShipping':['standard']}},mh)
deps=call('/api/merchant/commerce/methods/shipping/standard/dependencies',h=mh)
assert deps['b2bUnits']==1 and deps['canDelete']==False,deps
print('PASS shared method-deletion preflight includes current B2B purchasing policies')
