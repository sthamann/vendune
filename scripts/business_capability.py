#!/usr/bin/env python3
"""Actual app library/dimensions → exact-cart B2B approval → immutable order → saved-input reorder; no paid providers."""
import copy,json,os,pathlib,time,urllib.request,urllib.error,uuid
from testing.app_approval import consent
BASE=os.environ['BASE_URL'];suffix=uuid.uuid4().hex[:8];root=pathlib.Path(__file__).resolve().parents[1]
def call(path,body=None,h=None,status=200,method=None):
    if path=='/api/apps' and body is not None:body=consent(body)
    req=urllib.request.Request(BASE+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method)
    try:r=urllib.request.urlopen(req,timeout=30)
    except urllib.error.HTTPError as e:r=e
    data=json.load(r);assert r.status==status,(path,r.status,status,data);return data
u=call('/api/auth/register',{'workspaceId':'capability-'+suffix,'name':'Capability owner','email':suffix+'@example.test','password':'Synthetic-capability-password!'})
h={'x-tenant':u['workspace'],'Authorization':'Bearer '+u['token']};pub={'x-tenant':u['workspace'],'x-commerce-locale':'de-DE'}
def customer(label):
    result=call('/store-api/account/register',{'name':label,'email':label+suffix+'@example.test','password':'Synthetic-capability-buyer!'},pub)
    ch={**pub,'x-customer-token':result['customerToken']};return call('/store-api/account/profile',h=ch)['id'],ch
buyer,bh=customer('buyer');approver,ah=customer('approver');outsider,oh=customer('outsider')
def admin(op,v):return call('/api/b2b/'+op,v,h)
def employee(op,v,ch=bh,status=200):return call('/store-api/b2b/'+op,v,ch,status)
names={'en-GB':'Furniture team','de-DE':'Möbelteam'}
admin('company.save',{'id':'furniture','revision':0,'data':{'name':names,'active':True}})
admin('unit.save',{'id':'design','companyId':'furniture','revision':0,'data':{'name':names,'active':True,'currency':'EUR','approvalAboveMinor':0,'budgetMinor':1000000,'requirePurchaseOrder':True}})
for cid in [buyer,approver]:admin('member.save',{'unitId':'design','customerId':cid,'revision':0,'data':{'active':True,'permissions':['buy','approve','lists','quotes','companyOrders']}})
m=json.loads((root/'extensions/apps/furniture-configurator/manifest.json').read_text());app=m['id']
for field in ['readOnly','flowAllowed']:
    invalid=copy.deepcopy(m);invalid['id']='invalid_config_'+field.lower()
    next(action for action in invalid['actions'] if action['handler']=='configure')[field]=True
    call('/api/apps',{'manifest':invalid},h,400)
call('/api/apps',{'manifest':m},h)
# A material is a real model record with existing schema, CAS/history and package consent.
material=call(f'/api/apps/{app}/entities/materials',{'id':'walnut','revision':0,'fields':{'name':{'en-GB':'Walnut','de-DE':'Walnuss'},'fee_minor':2000}},h)
assert material['revision']==1
slots=call('/store-api/apps/slots',h=pub)['slots'];slot=next(s for s in slots if s['app']==app)
assert slot['configuration']['inputs']['recordField']=='material' and 'wasmSource'not in slot['configuration'] and 'examples'not in slot['configuration']['inputs']
def new_cart():
    c=call('/store-api/checkout/cart',{},bh);bh['sw-context-token']=c['token']
    return employee('select',{'unitId':'design','revision':c['revision'],'purchaseOrder':'PO-FURNITURE'})
c=new_cart();c=call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'lamp','quantity':1}]},bh)
fields={'material':'walnut','width_cm':260,'depth_cm':80}
call('/api/automation/flows/configured',{'revision':0,'data':{'name':names,'active':True,'event':'app.configuration.changed','condition':{'type':'alwaysValid'},'action':'note','instruction':names,'locale':'de-DE'}},h,method='PUT')
result=call('/mcp',{'jsonrpc':'2.0','id':3,'method':'tools/call','params':{'name':'app.'+app+'.configure','arguments':{'productId':'lamp','revision':c['revision'],'fields':fields}}},bh)
assert not result['result'].get('isError'),result
c=result['result']['structuredContent']
config=c['lineItems'][0]['appConfigurations'][0]
assert config['fields']==fields and config['feeMinor']==6800 and config['currency']=='EUR',config
display=config['presentation']
assert display['mainLocale']=='en-GB' and display['title']['de']=='Gestalte dein Möbelstück',display
assert display['fields'][0]['value']['de-DE']=='Walnuss' and display['fields'][1]['value']==260 and display['fields'][2]['value']==80,display
detail=call('/store-api/product/lamp',h=bh)
listed=next(p for p in call('/store-api/product',{'productIds':['lamp']},bh)['elements'] if p['id']=='lamp')
assert detail['calculatedPrices'][0]['price']['unitPrice']==c['lineItems'][0]['price']['unitPrice']
assert listed['calculated_price']['unitPrice']==detail['calculatedPrices'][0]['price']['unitPrice']
for _ in range(100):
    jobs=call('/api/automation',h=h)['jobs']
    if any(job['flow']=='configured' and job['state']=='completed' for job in jobs):break
    time.sleep(.1)
assert any(job['flow']=='configured' and job['state']=='completed' for job in jobs),jobs
ucp=call('/ucp/v1/checkout-sessions/'+c['id'],h=bh)
assert ucp['currency']=='EUR' and next(total['amount'] for total in ucp['totals'] if total['type']=='total')==round(c['price']['totalPrice']*100),ucp
before=c['revision']
call(f'/store-api/apps/{app}/configure',{'productId':'lamp','revision':before,'fields':{**fields,'width_cm':401}},bh,400)
call(f'/store-api/apps/{app}/configure',{'productId':'lamp','revision':before,'fields':{**fields,'fee_minor':0}},bh,400)
call(f'/store-api/apps/{app}/configure',{'productId':'lamp','revision':before,'fields':fields},{**oh,'sw-context-token':c['token']},403)
call('/api/automation/channels/another',{'revision':0,'data':{'name':{'en-GB':'Other channel'},'kind':'storefront','active':True,'visibility':'public','locales':['en-GB','de-DE'],'productIds':[]}},h,method='PUT')
call(f'/store-api/apps/{app}/configure',{'productId':'lamp','revision':before,'fields':fields},{**bh,'sw-sales-channel-id':'another'},403)
unknown_fx=copy.deepcopy(m);unknown_fx['id']='missing_source_currency';unknown_fx['configuration']['currency']='JPY'
call('/api/apps',{'manifest':unknown_fx},h)
missing_fx=call('/store-api/apps/missing_source_currency/configure',{'productId':'lamp','revision':before,'fields':{**fields,'material':'oak'}},bh,400)
assert missing_fx['errors'][0]['detail']=='Source price currency is not configured',missing_fx
assert call('/store-api/checkout/cart',h=bh)['revision']==before
assert len([job for job in call('/api/automation',h=h)['jobs'] if job['flow']=='configured'])==1
purchased=call(f'/api/apps/{app}/actions/orders',{},h)
assert purchased['elements']==[]
selection={'app':app,'productId':'lamp','fields':fields}
saved=employee('list.save',{'id':'configured_desk','unitId':'design','revision':0,'data':{'name':names,'shared':False,'items':[{'id':'lamp','quantity':1}],'configurations':[selection]}})
assert employee('lists',{'unitId':'design'},ah)['elements']==[]
# The independent approver approves the exact priced configuration, not a caller-authored fee.
request=employee('approval.request',{'revision':c['revision']})
employee('approval.decide',{'id':request['id'],'revision':request['revision'],'state':'approved'},bh,409)
employee('approval.decide',{'id':request['id'],'revision':request['revision'],'state':'approved'},ah)
stock=call('/store-api/product/lamp',h=pub)['product']['stock']
order=call('/store-api/checkout/order',{}, {**bh,'Idempotency-Key':'capability-'+suffix})
assert order['cart']['lineItems'][0]['appConfigurations'][0]==config
assert call('/store-api/product/lamp',h=pub)['product']['stock']==stock-1
completed_detail=call('/store-api/product/lamp',h=bh)
completed_listing=next(p for p in call('/store-api/product',{'productIds':['lamp']},bh)['elements'] if p['id']=='lamp')
assert completed_listing['stock']==stock-1
assert completed_listing['calculated_price']['unitPrice']==completed_detail['calculatedPrices'][0]['price']['unitPrice']
assert call('/store-api/checkout/cart',h=bh)['order']['cart']['lineItems'][0]['appConfigurations'][0]==config
order_id=order['id'];immutable=copy.deepcopy(call('/api/merchant/orders/'+order_id,h=h)['cart'])
projection=call(f'/api/apps/{app}/actions/orders',{'limit':1},h)
assert projection['elements'][0]['orderId']==order_id and projection['elements'][0]['items'][0]['appConfigurations']==[config],projection
assert config['ruleFields']['name']['de-DE']=='Walnuss'
# Data rights cannot be weakened by omitting a declared permission from an action.
restricted=call('/api/workspace/integrations',{'name':'Catalog reader only','expiresInDays':1,'permissions':['catalog.read']},h)
rh={**pub,'Authorization':'Bearer '+restricted['key']}
upgrade=copy.deepcopy(m);upgrade['version']='1.0.1'
upgrade['configuration']['inputs']['fields'][1]['label']['de']='Neue Breitenbezeichnung'
next(action for action in upgrade['actions'] if action['handler']=='configurations').pop('permission')
next(action for action in upgrade['actions'] if action['handler']=='configure')['mcp']=False
call('/api/apps',{'manifest':upgrade},h)
call(f'/api/apps/{app}/actions/orders',{},rh,403)
opted_out=call('/mcp',{'jsonrpc':'2.0','id':4,'method':'tools/call','params':{'name':'app.'+app+'.configure','arguments':{'productId':'lamp','revision':c['revision'],'fields':fields}}},bh)
assert opted_out.get('error',{}).get('code')==-32602,opted_out
# A saved list stores inputs, never an accepted old fee. Reorder calculates current rules atomically.
c=new_cart();c=employee('list.apply',{'id':'configured_desk','unitId':'design','revision':saved['revision'],'cartRevision':c['revision']})
assert c['lineItems'][0]['appConfigurations'][0]['feeMinor']==6800
assert c['lineItems'][0]['appConfigurations'][0]['presentation']['fields'][1]['label']['de']=='Neue Breitenbezeichnung'
assert call('/api/merchant/orders/'+order_id,h=h)['cart']['lineItems'][0]['appConfigurations'][0]['presentation']==display
call(f'/api/apps/{app}/entities/materials',{'id':'walnut','revision':1,'fields':{'name':{'en-GB':'Walnut','de-DE':'Walnuss Select'},'fee_minor':3000}},h)
request=employee('approval.request',{'revision':c['revision']})
employee('approval.decide',{'id':request['id'],'revision':request['revision'],'state':'approved'},ah)
call('/store-api/checkout/order',{}, {**bh,'Idempotency-Key':'stale-material-'+suffix},409)
old=call('/api/merchant/orders/'+order_id,h=h)
assert old['cart']==immutable
c=employee('list.apply',{'id':'configured_desk','unitId':'design','revision':saved['revision'],'cartRevision':c['revision']})
updated=c['lineItems'][0]['appConfigurations'][0]
assert updated['feeMinor']==7800 and updated['ruleRevision']==2 and updated['fields']==fields and updated['ruleFields']['name']['de-DE']=='Walnuss Select'
assert updated['presentation']['fields'][0]['value']['de-DE']=='Walnuss Select'
# A changed package uses the ordinary developer/staging/release contract.
stage=call('/api/environments',{'name':'Furniture rule review'},h)['id']
candidate=copy.deepcopy(m);candidate['version']='1.1.0';candidate['configuration']['wasmSource']=candidate['configuration']['wasmSource'].replace('i64.const 4800','i64.const 5800')
call('/api/developer/import',{'environment':stage,'prompt':'A changed rule must fail unchanged examples','manifest':candidate,'summary':candidate['name']},h,400)
for case in candidate['configuration']['inputs']['examples']:
    if isinstance(case['fields'].get('width_cm'),int) and 240<case['fields']['width_cm']<=400 and case['expectedFeeMinor'] is not None:case['expectedFeeMinor']+=1000
build=call('/api/developer/import',{'environment':stage,'prompt':'Change the oversized-dimension surcharge by EUR 10','manifest':candidate,'summary':candidate['name']},h)
result=call('/mcp',{'jsonrpc':'2.0','id':2,'method':'tools/call','params':{'name':'developer.stage','arguments':{'buildId':build['id'],'approve':True,'digest':build['digest']}}},h)
assert not result['result'].get('isError'),result
change=next(row for row in call('/api/environments/'+stage+'/diff',h=h)['changes'] if row['key']=='app:'+app)
call('/api/environments/'+stage+'/release',{'approve':True,'selections':[{'key':change['key'],'digest':change['digest']}]},h)
c=employee('list.apply',{'id':'configured_desk','unitId':'design','revision':saved['revision'],'cartRevision':c['revision']})
assert c['lineItems'][0]['appConfigurations'][0]['feeMinor']==8800
assert call('/api/merchant/orders/'+order_id,h=h)['cart']==immutable
# Published config data and native B2B reads share existing MCP admission.
result=call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'b2b.lists','arguments':{'unitId':'design'}}},bh)
assert not result['result'].get('isError'),result
assert result['result']['structuredContent']['elements'][0]['data']['configurations']==[selection]
print('PASS real material records, validated dimensions, pure surcharge, independent approval, native order/stock, private saved inputs, current-price reorder and selected version release; original order remains immutable')
