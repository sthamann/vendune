#!/usr/bin/env python3
"""Real UCP -> native B2B RFQ -> merchant counteroffer -> separate approval -> one durable order."""
import datetime,json,os,time,urllib.request,urllib.error,uuid
BASE=os.environ['BASE_URL'];suffix=uuid.uuid4().hex[:8]
VERSION='2026-10-13';EXT='ai.veyndo.app.shopping.b2b_negotiation';PASSWORD='Synthetic-UCP-B2B-2026!'
def call(path,body=None,h=None,method=None,status=200):
    req=urllib.request.Request(BASE+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method or ('GET' if body is None else 'POST'))
    try:r=urllib.request.urlopen(req,timeout=30)
    except urllib.error.HTTPError as e:r=e
    data=r.read();assert r.status==status,(path,r.status,status,data[:1400]);return json.loads(data)
def shop(label):
    r=call('/api/auth/register',{'workspaceId':label+'-'+suffix,'workspaceName':label,'name':'Owner','email':label+suffix+'@example.test','password':PASSWORD})
    return {'x-tenant':r['workspace'],'Authorization':'Bearer '+r['token']}
mh=shop('ucpb2b');foreign=shop('ucpforeign');public={'x-tenant':mh['x-tenant'],'x-commerce-locale':'de-DE'}
def customer(label):
    email=label+suffix+'@example.test'
    c=call('/store-api/account/register',{'name':label,'email':email,'password':PASSWORD},public)
    h={**public,'x-customer-token':c['customerToken'],'x-veyndo-ucp-b2b-version':VERSION}
    return call('/store-api/account/profile',h=h)['id'],h,email
buyer,bh,email=customer('buyer');approver,ah,_=customer('approver');other,oh,_=customer('other')
def admin(op,v,h=mh,status=200):return call('/api/b2b/'+op,v,h,status=status)
names={'en-GB':'Procurement','de-DE':'Einkauf','es-ES':'Compras'}
flow={'name':names,'active':True,'event':'b2b.purchase_completed','condition':{'type':'alwaysValid'},'action':'pipeline','instruction':names,'locale':'de-DE','pipeline':{'entry':'tag','nodes':[{'kind':'action','id':'tag','action':'action.add.order.tag','config':{'tags':['ucp-negotiated']},'next':None}]}}
call('/api/automation/flows/ucp_negotiated_purchase',{'revision':0,'data':flow},mh,'PUT')
admin('company.save',{'id':'acme','revision':0,'data':{'name':names,'active':True}})
unit={'name':names,'active':True,'currency':'EUR','approvalAboveMinor':0,'budgetMinor':100000,'budgetPeriod':'month','requirePurchaseOrder':True}
admin('unit.save',{'id':'it','companyId':'acme','revision':0,'data':unit})
for cid in [buyer,approver]:admin('member.save',{'unitId':'it','customerId':cid,'revision':0,'data':{'active':True,'permissions':['buy','quotes','approve']}})
profile=call('/.well-known/ucp',h=public)['ucp']
assert profile['capabilities'][EXT][0]['extends']==['dev.ucp.shopping.checkout']
assert profile['services']['dev.ucp.shopping'][0]['endpoint'].startswith('https://studio.example.test/ucp/v1')
schema=call('/ucp/2026-10-13/b2b-negotiation.json',h=public)
assert call('/ucp/2026-10-13/b2b-negotiation.json')==schema
assert call('/ucp/2026-10-13/b2b-negotiation.json',h={'x-tenant':'nonexistent-schema-reader'})==schema
assert schema['version']==VERSION and 'dev.ucp.shopping.checkout' in schema['$defs']
assert schema['$id']==profile['capabilities'][EXT][0]['schema']
def checkout(h=bh):
    c=call('/ucp/v1/checkout-sessions',{'line_items':[{'item':{'id':'lamp'},'quantity':2}],'buyer':{'email':email}},h)
    return c,{**h,'sw-context-token':c['context_token']},'/ucp/v1/checkout-sessions/'+c['id']
c,h,path=checkout()
def command(op,v,hdr=None,status=200):return call(path+'/b2b/'+op,v,hdr or h,status=status)
command('select',{'unitId':'it','revision':c['b2b_negotiation']['checkout_revision']},{**h,'x-customer-token':oh['x-customer-token']},403)
# Negotiated capabilities never replace a current customer identity.
command('contexts',{}, {**h,'x-customer-token':''},401)
no_version={k:v for k,v in h.items() if k!='x-veyndo-ucp-b2b-version'}
command('contexts',{},no_version,409)
command('contexts',{}, {**h,'x-veyndo-ucp-b2b-version':'2099-01-01'},409)
command('contexts',{}, {**no_version,'UCP-Agent':'profile="http://127.0.0.1:1/private"'},400)
command('contexts',{}, {**no_version,'UCP-Agent':'profile="https://127.0.0.1/private"'},403)
# The same public-only egress owner denies DNS rebinding/private targets before connecting.
c=command('select',{'unitId':'it','purchaseOrder':'UCP-PO-1','revision':c['b2b_negotiation']['checkout_revision']})
assert c['status']=='requires_escalation' and c['messages'][0]['code']=='b2b_approval_required'
assert 'Freigabe' in c['messages'][0]['content']
rfq=command('quote.request',{'revision':c['b2b_negotiation']['checkout_revision'],'message':'Two lamps, target EUR 45 each.'})['b2b_negotiation']['result']
command('quote.offer',{'id':rfq['id'],'revision':1},status=400)
command('approval.decide',{'id':'anything','revision':1,'state':'approved'},status=400)
command('quote.message',{'id':rfq['id'],'revision':1,'message':'Can you include the extended warranty?','customerId':buyer,'actor':'merchant'},status=400)
message=command('quote.message',{'id':rfq['id'],'revision':1,'message':'Can you include the extended warranty?'})['b2b_negotiation']['result']
command('quote.message',{'id':rfq['id'],'revision':1,'message':'stale counter'},status=409)
until=(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=7)).isoformat()
offer=admin('quote.offer',{'id':rfq['id'],'revision':message['revision'],'message':'EUR 50 gross per unit; warranty as requested.','data':{'lines':[{'id':'lamp','quantity':2,'grossMinor':5000}],'validUntil':until}})
admin('quote.offer',{'id':rfq['id'],'revision':offer['revision'],'data':{'lines':[{'id':'lamp','quantity':2,'grossMinor':1}],'validUntil':until}},foreign,404)
assert call(path,h=h)['b2b_negotiation']['quotes'][0]['state']=='offered'
mcp=call('/mcp',{'jsonrpc':'2.0','id':2,'method':'tools/call','params':{'name':'b2b.quote.get','arguments':{'id':rfq['id']}}},h)['result']
assert not mcp.get('isError') and mcp['structuredContent']['state']=='offered'
# Another checkout owned by the same employee cannot read/message/accept this RFQ.
second,h2,p2=checkout();second=call(p2+'/b2b/select',{'unitId':'it','purchaseOrder':'UCP-OTHER','revision':second['b2b_negotiation']['checkout_revision']},h2)
for op in ['quote.get','quote.message','quote.reject']:
    call(p2+'/b2b/'+op,{'id':rfq['id'],'revision':offer['revision'],'message':'other cart'},h2,status=404)
call(path+'/b2b/quote.get',{'id':rfq['id']},{**h,'x-tenant':foreign['x-tenant']},status=404)
expired=call(p2+'/b2b/quote.request',{'revision':second['b2b_negotiation']['checkout_revision'],'message':'Short-lived offer'},h2)['b2b_negotiation']['result']
short=(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(seconds=1)).isoformat()
short_offer=admin('quote.offer',{'id':expired['id'],'revision':1,'data':{'lines':[{'id':'lamp','quantity':2,'grossMinor':5000}],'validUntil':short}})
time.sleep(1.2)
call(p2+'/b2b/quote.accept',{'id':expired['id'],'revision':short_offer['revision'],'cartRevision':second['b2b_negotiation']['checkout_revision']},h2,status=409)
ticket=call(p2+'/b2b/checkout.handoff',{'revision':second['b2b_negotiation']['checkout_revision']},h2)
assert ticket['continue_url'].startswith('https://studio.example.test/checkout?')
secret=ticket['b2b_negotiation']['result']['checkoutPath'].split('#checkout/')[1]
call('/store-api/checkout/handoff/consume',{'ticket':secret},oh,status=403)
transferred=call('/store-api/checkout/handoff/consume',{'ticket':secret},bh)
assert transferred['id']==second['id'] and transferred['b2b']['unitId']=='it'
call('/store-api/checkout/handoff/consume',{'ticket':secret},bh,status=410)
command('quote.accept',{'id':rfq['id'],'revision':offer['revision'],'cartRevision':0},status=409)
c=command('quote.accept',{'id':rfq['id'],'revision':offer['revision'],'cartRevision':c['b2b_negotiation']['checkout_revision']})
assert c['b2b_negotiation']['purchasing']['quoteId']==rfq['id'] and c['status']=='requires_escalation'
cart=call('/store-api/checkout/cart',h=h)
# UCP and Store API display the same authoritative negotiated total, not a second discount engine.
assert next(t['amount']for t in c['totals']if t['type']=='total')==int(cart['price']['totalMinor'])
call(path+'/complete',{}, {**h,'Idempotency-Key':'premature-'+suffix},status=409)
request=command('approval.request',{'revision':c['b2b_negotiation']['checkout_revision']})['b2b_negotiation']['result']
call('/store-api/b2b/approval.decide',{'id':request['id'],'revision':request['revision'],'state':'approved'},bh,status=409)
call('/store-api/b2b/approval.decide',{'id':request['id'],'revision':request['revision'],'state':'approved'},ah)
assert call(path,h=h)['status']=='ready_for_complete'
stock=call('/store-api/product/lamp',h=public)['product']['stock']
key='ucp-company-'+suffix
completed=call(path+'/complete',{}, {**h,'Idempotency-Key':key})
assert completed['status']=='completed' and completed['b2b_negotiation']['quotes'][0]['state']=='ordered'
assert call(path+'/complete',{}, {**h,'Idempotency-Key':key})['order']['id']==completed['order']['id']
assert call('/store-api/product/lamp',h=public)['product']['stock']==stock-2
order=call('/api/merchant/orders/'+completed['order']['id'],h=mh)
assert order['b2b']['purchaseOrder']=='UCP-PO-1' and order['b2b']['quoteId']==rfq['id']
assert int(order['cart']['price']['totalMinor'])==int(cart['price']['totalMinor'])
for _ in range(100):
    current=call('/api/merchant/orders/'+order['id'],h=mh)
    if current.get('automation',{}).get('tags')==['ucp-negotiated']:break
    time.sleep(.1)
else:raise AssertionError('UCP purchase did not reach the native Flow consumer')
command('quote.request',{'revision':completed['b2b_negotiation']['checkout_revision']},status=409)
# Revocation blocks previously valid UCP sessions immediately, without changing the order.
admin('member.save',{'unitId':'it','customerId':buyer,'revision':1,'data':{'active':False,'permissions':['buy','quotes']}})
call(path,h=h,status=403)
assert call('/api/merchant/orders/'+order['id'],h=mh)['id']==order['id']
tools=call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/list'},ah)['result']['tools']
assert {'b2b.quote.get','b2b.quote.current'} <= {t['name']for t in tools}
# A purchasing employee without quotes can use ordinary checkout, but cannot inspect RFQs.
admin('member.save',{'unitId':'it','customerId':other,'revision':0,'data':{'active':True,'permissions':['buy']}})
plain,ph,pp=checkout(oh)
plain=call(pp+'/b2b/select',{'unitId':'it','purchaseOrder':'UCP-BUY-ONLY','revision':plain['b2b_negotiation']['checkout_revision']},ph)
assert plain['b2b_negotiation']['purchasing']['quotesAllowed'] is False and plain['b2b_negotiation']['quotes']==[]
call(pp+'/b2b/quote.current',{},ph,status=403)
print('PASS UCP extension discovery/version/HTTPS rejection; native buyer RFQ/counter/merchant offer/CAS; original-cart and foreign identity denial; current purchasing approval; shared exact total; durable idempotent stock/order; immediate revocation; MCP discovery')
