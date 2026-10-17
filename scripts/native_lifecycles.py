#!/usr/bin/env python3
"""Native accepted app lifecycles through real HTTP/PostgreSQL/MCP and selected release. Synthetic shops only."""
import concurrent.futures, copy, datetime, json, os, time, urllib.request, urllib.error, uuid
from testing.app_approval import consent
from testing.runtime import ROOT
base=os.environ['BASE_URL']; tag=uuid.uuid4().hex[:10]; password='Synthetic-native-lifecycle-2026!'
def call(path,body=None,h=None,status=200,method=None):
    if path=='/api/apps' and body is not None: body=consent(body)
    req=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method)
    try:
        with urllib.request.urlopen(req,timeout=40) as r: code=r.status; value=json.load(r)
    except urllib.error.HTTPError as e: code=e.code; value=json.load(e)
    assert code==status,(path,code,status,value)
    return value
def owner(label):
    u=call('/api/auth/register',{'workspaceId':label+'-'+tag,'workspaceName':label,'name':'Lifecycle owner','email':label+tag+'@example.test','password':password})
    return {'x-tenant':u['workspace'],'Authorization':'Bearer '+u['token']}
h=owner('lifecycle'); other=owner('foreign-lifecycle'); pub={'x-tenant':h['x-tenant']}
manifest=json.loads((ROOT/'extensions/apps/production-review/manifest.json').read_text())
call('/api/apps',{'manifest':manifest},h)
print('PASS explicit lifecycle package consent and native installation',flush=True)
def order():
    c=call('/store-api/checkout/cart',{},pub); ch={**pub,'sw-context-token':c['token']}
    call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'mug','quantity':1}]},ch)
    o=call('/store-api/checkout/order',{}, {**ch,'Idempotency-Key':'lifecycle-'+uuid.uuid4().hex})
    # Await the existing initial Flow note before CAS assertions.
    for _ in range(150):
        executions=call('/api/automation/executions',h=h)['jobs']
        fresh=call('/api/merchant/orders/'+o['id'],h=h)
        if any(a['kind']=='note' for a in fresh['activity']):break
        time.sleep(.03)
    return call('/api/merchant/orders/'+o['id'],h=h)
def transition(o,state,kind='order',headers=h,status=200,**extra):
    fresh=call('/api/merchant/orders/'+o['id'],h=h)
    return call('/api/merchant/orders/'+o['id']+'/transition',{'revision':fresh['revision'],'kind':kind,'state':state,**extra},headers,status)
def action(o,local):
    return next(e for e in o['workflow']['actions'] if (e.get('source') or {}).get('app')=='production_review' and e['id'].endswith('_'+local))
o=order(); accepted=copy.deepcopy(o['nativeLifecycle'])
assert accepted['version']==1 and accepted['object']=='order'
o=transition(o,'in_progress'); review=action(o,'review'); o=transition(o,review['state'],action=review['id'])
assert action(o,'approve')['enabled'] is False
transition(o,'completed',status=409)
call('/api/merchant/orders/'+o['id']+'/transition',{'revision':0,'kind':'order','state':'completed'},h,status=409)
call('/api/merchant/orders/'+o['id']+'/transition',{'revision':o['revision'],'kind':'order','state':'cancelled'},other,status=404)
v2=copy.deepcopy(manifest); v2['version']='1.0.1'; v2['lifecycles'][0]['transitions'][1]['requiredPermissions']=['settings.write']
call('/api/apps',{'manifest':v2},h)
fresh=call('/api/merchant/orders/'+o['id'],h=h)
assert fresh['nativeLifecycle']==accepted and action(fresh,'approve')['source']['version']=='1.0.0'
new=order(); assert next(e for e in new['nativeLifecycle']['machine']['transitions'] if e['id'].endswith('_approve'))['policy']['version']=='1.0.1'
print('PASS accepted definitions survive upgrades; new orders use the new version; invalid completion, stale CAS and foreign writes are rejected',flush=True)
role={'name':{'en-GB':'Lifecycle operator'},'permissions':['orders.read','orders.write','customers.pii'],'active':True}
call('/api/workspace/roles/lifecycle_operator',{'revision':0,'data':role},h,method='PUT')
inv=call('/api/workspace/invitations',{'role':'lifecycle_operator','email':'operator'+tag+'@example.test'},h)
operator=call('/api/auth/accept',{'name':'Operator','password':password,'invitationToken':inv['token']})
rh={'x-tenant':h['x-tenant'],'Authorization':'Bearer '+operator['token']}
o=transition(o,'shipped','delivery'); o=transition(o,'delivered','delivery')
assert action(call('/api/merchant/orders/'+o['id'],h=rh),'approve')['reason']=='lifecyclePermission'
transition(o,'completed',headers=rh,status=409)
role['permissions'].append('documents.read'); call('/api/workspace/roles/lifecycle_operator',{'revision':1,'data':role},h,method='PUT')
assert action(call('/api/merchant/orders/'+o['id'],h=rh),'approve')['enabled']
role['permissions'].remove('customers.pii'); call('/api/workspace/roles/lifecycle_operator',{'revision':2,'data':role},h,method='PUT')
transition(o,'completed',headers=rh,status=403)
role['permissions'].append('customers.pii'); call('/api/workspace/roles/lifecycle_operator',{'revision':3,'data':role},h,method='PUT')
result=call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'merchant.order.transition','arguments':{'id':o['id'],'revision':call('/api/merchant/orders/'+o['id'],h=h)['revision'],'kind':'order','state':'completed'}}},rh)['result']
assert not result.get('isError'),result
done=call('/api/merchant/orders/'+o['id'],h=h)
assert done['state']=='completed' and any((a['data'].get('lifecycle') or {}).get('version')=='1.0.0' for a in done['activity'])
transition(done,'in_progress',status=409)
print('PASS native payment/delivery guards, current role changes, MCP and version-bound transition activity share the same path',flush=True)
# Competing replacements, executable guards and financial quote-state forgery are rejected before installation.
competing=copy.deepcopy(manifest); competing['id']='other_review'; call('/api/apps',{'manifest':competing},h,status=409)
invalid=copy.deepcopy(v2); invalid['version']='1.0.2'; invalid['lifecycles'][1]['transitions'][1]['to']='accepted';call('/api/apps',{'manifest':invalid},h,status=400)
invalid=copy.deepcopy(v2); invalid['lifecycles'][0]['transitions'][0]['guards']=['exec:provider'];call('/api/apps',{'manifest':invalid},h,status=400)
# Real buyer/company/original-cart RFQ, not a synthetic mutation of a quote JSON blob.
buyer=call('/store-api/account/register',{'email':'buyer'+tag+'@example.test','name':'Lifecycle buyer','password':password},pub)
bh={**pub,'x-customer-token':buyer['customerToken']}; cid=call('/store-api/account/profile',h=bh)['id']
names={'en-GB':'Lifecycle company'}
call('/api/b2b/company.save',{'id':'company','revision':0,'data':{'name':names,'active':True,'vatId':'SYNTHETIC'}},h)
call('/api/b2b/unit.save',{'id':'unit','companyId':'company','revision':0,'data':{'name':names,'active':True,'currency':'EUR','budgetMinor':100000,'budgetPeriod':'month','restrictedCatalog':False,'requirePurchaseOrder':False,'costCenter':'Test'}},h)
call('/api/b2b/member.save',{'unitId':'unit','customerId':cid,'revision':0,'data':{'active':True,'permissions':['buy','quotes']}},h)
c=call('/store-api/checkout/cart',{},bh);bh['sw-context-token']=c['token']
c=call('/store-api/b2b/select',{'unitId':'unit','revision':c['revision']},bh)
c=call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'mug','quantity':1}]},bh)
q=call('/store-api/b2b/quote.request',{'revision':c['revision'],'message':'Please check material compatibility'},bh)
def inbox():return next(r for r in call('/api/b2b/quotes.merchant',{},h)['elements'] if r['id']==q['id'])
q=inbox(); edge=q['workflow']['actions'][0]
call('/store-api/b2b/quote.transition',{'id':q['id'],'revision':q['revision'],'action':edge['id']},bh,status=403)
call('/api/b2b/quote.transition',{'id':q['id'],'revision':q['revision'],'action':edge['id']},other,status=404)
q=call('/api/b2b/quote.transition',{'id':q['id'],'revision':q['revision'],'action':edge['id']},h)
assert q['state'].startswith('a') and q['state'].endswith('_technical')
public_quote=call('/store-api/b2b/quote.get',{'id':q['id']},bh)
assert 'nativeLifecycle' not in public_quote['data'] and public_quote['workflow']['actions']==[]
assert all('lifecycle' not in message for message in public_quote['data']['messages'])
call('/api/b2b/quote.offer',{'id':q['id'],'revision':q['revision'],'data':{}},h,status=409)
call('/store-api/b2b/quote.accept',{'id':q['id'],'revision':q['revision'],'cartRevision':c['revision']},bh,status=409)
v3=copy.deepcopy(v2);v3['version']='1.0.2';v3['lifecycles']=[]
stage=call('/api/environments',{'name':'Lifecycle release'},h)['id'];sh={**h,'x-tenant':stage}
call('/api/apps',{'manifest':v3},sh)
diff=call('/api/environments/'+stage+'/diff',h=h)['changes']
selected=next(d for d in diff if d['key']=='app:production_review')
call('/api/environments/'+stage+'/release',{'approve':True,'selections':[{'key':selected['key'],'digest':selected['digest']}]},h)
q=inbox();assert q['workflow']['actions'][0]['source']['version']=='1.0.1'
q=call('/api/b2b/quote.transition',{'id':q['id'],'revision':q['revision'],'action':q['workflow']['actions'][0]['id']},h)
assert q['state']=='requested'
until=(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=2)).isoformat()
q=call('/api/b2b/quote.offer',{'id':q['id'],'revision':q['revision'],'data':{'lines':[{'id':'mug','quantity':1,'grossMinor':2000}],'validUntil':until}},h)
c=call('/store-api/b2b/quote.accept',{'id':q['id'],'revision':q['revision'],'cartRevision':c['revision']},bh)
assert c['b2b']['quoteId']==q['id']
assert 'nativeLifecycle' not in order()
print('PASS quote preparation cannot forge offers/acceptance; selected sandbox release does not rewrite running native orders or RFQs',flush=True)

# A fifth shop main language must be present in every native state/action label.
ih=owner('italian-lifecycle');ipub={'x-tenant':ih['x-tenant']}
settings=call('/api/merchant/commerce',h=ih)
settings['data']['locales'].append('it-IT');settings['data']['mainLocale']='it-IT'
call('/api/merchant/commerce',settings,ih,method='PUT')
italian=copy.deepcopy(manifest);italian['name']['it-IT']='Controlli di produzione'
call('/api/apps',{'manifest':italian},ih,status=400)
istage=call('/api/environments',{'name':'Italian lifecycle review'},ih)['id']
build={'environment':istage,'prompt':'Verifica dei controlli di produzione','summary':{'it-IT':'Controlli di produzione'},'manifest':italian}
call('/api/developer/import',build,ih,status=400)
for contract in italian['lifecycles']:
    for state in contract['states']:state['label']['it-IT']='Controllo di produzione'
    for edge in contract['transitions']:edge['label']['it-IT']='Prosegui con la verifica'
call('/api/developer/import',build,ih)
call('/api/apps',{'manifest':italian},ih)
ic=call('/store-api/checkout/cart',{},ipub);ich={**ipub,'sw-context-token':ic['token']}
call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'mug','quantity':1}]},ich)
io=call('/store-api/checkout/order',{}, {**ich,'Idempotency-Key':'italian-'+tag})
io=call('/api/merchant/orders/'+io['id'],h=ih)
assert io['nativeLifecycle']['mainLocale']=='it-IT'
assert any(s['label'].get('it-IT')=='Controllo di produzione' for s in io['workflow']['states'])
print('PASS fifth main language: incomplete native labels block install/build; translated package creates an Italian-bound order',flush=True)

# A later language change, including selected publication, cannot strand active labels.
lh=owner('locale-change');ls=call('/api/environments',{'name':'Italian settings'},lh)['id'];lsh={**lh,'x-tenant':ls}
lc=call('/api/merchant/commerce',h=lsh);lc['data']['locales'].append('it-IT');lc['data']['mainLocale']='it-IT'
call('/api/merchant/commerce',lc,lsh,method='PUT')
call('/api/apps',{'manifest':manifest},lh)
live_config=call('/api/merchant/commerce',h=lh);live_config['data']=lc['data']
call('/api/merchant/commerce',live_config,lh,status=400,method='PUT')
choice=next(d for d in call('/api/environments/'+ls+'/diff',h=lh)['changes'] if d['key']=='settings')
release={'approve':True,'selections':[{'key':'settings','digest':choice['digest']}]}
call('/api/environments/'+ls+'/release',release,lh,status=400)
assert call('/api/merchant/commerce',h=lh)['data']['mainLocale']=='en-GB'
translated=copy.deepcopy(italian);translated['version']='1.0.1';call('/api/apps',{'manifest':translated},lh)
call('/api/environments/'+ls+'/release',release,lh)
assert call('/api/merchant/commerce',h=lh)['data']['mainLocale']=='it-IT'
print('PASS main-language changes and selected publication require compatible active workflow labels and preserve atomic rollback',flush=True)

race_owner=owner('locale-race');race_config=call('/api/merchant/commerce',h=race_owner)
race_config['data']['locales'].append('it-IT');race_config['data']['mainLocale']='it-IT'
def locale_race(kind):
    try:
        if kind=='settings':call('/api/merchant/commerce',race_config,race_owner,method='PUT')
        else:call('/api/apps',{'manifest':manifest},race_owner)
        return 200
    except AssertionError as e:
        assert e.args[0][1]==400,e
        return 400
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:outcomes=list(pool.map(locale_race,['settings','app']))
assert sorted(outcomes)==[200,400],outcomes
print('PASS concurrent main-language edit and app installation cannot jointly commit incompatible native labels',flush=True)

if os.getenv('NATIVE_LIFECYCLE_REVIEW_HOLD'):
    reviewed=copy.deepcopy(manifest);reviewed['version']='1.0.3'
    call('/api/apps',{'manifest':reviewed},h)
    visible=transition(order(),'in_progress');edge=action(visible,'review');visible=transition(visible,edge['state'],action=edge['id'])
    (ROOT/'artifacts/native-lifecycle-review.json').write_text(json.dumps({'url':base+'/?shop='+h['x-tenant']+'&studio=orders&entity='+visible['id']+'#merchant','email':'lifecycle'+tag+'@example.test','password':password,'tenant':h['x-tenant'],'stage':stage,'order':visible['id']}))
    print('READY isolated synthetic native lifecycle browser review',flush=True)
    while True:time.sleep(1)
