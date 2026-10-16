#!/usr/bin/env python3
"""Native app field API/MCP/UI contracts, current rights, fixed storage and selective sandbox release. Synthetic local data only."""
import copy, json, os, urllib.request, urllib.error, urllib.parse, uuid
from testing.app_approval import consent
from testing.runtime import ROOT
base=os.environ['BASE_URL']; tag=uuid.uuid4().hex[:10]; password='Synthetic-extension-fixture-2026!'
def call(path,body=None,h=None,status=200,method=None):
    if path=='/api/apps' and body is not None: body=consent(body)
    req=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method)
    try:
        with urllib.request.urlopen(req,timeout=30) as r: code=r.status; value=json.load(r)
    except urllib.error.HTTPError as e: code=e.code; value=json.load(e)
    assert code==status,(path,code,status,value)
    return value

def owner(name):
    u=call('/api/auth/register',{'workspaceId':name+'-'+tag,'workspaceName':name,'name':'Extension owner','email':name+tag+'@example.test','password':password})
    return {'x-tenant':u['workspace'],'Authorization':'Bearer '+u['token']}
h=owner('extensions'); other=owner('foreign-ext'); pub={'x-tenant':h['x-tenant']}
manifest=json.loads((ROOT/'extensions/apps/object-context/manifest.json').read_text())
# An additional app-specific read scope is deliberately stronger than native product access.
manifest['actions'][0]['requiredPermissions']=['knowledge.read']
call('/api/apps',{'manifest':manifest},h);call('/api/apps',{'manifest':manifest},other)
email='buyer'+tag+'@example.test'
buyer=call('/store-api/account/register',{'email':email,'name':'Extension buyer','password':password},pub)
bh={**pub,'x-customer-token':buyer['customerToken']}
customer=call('/store-api/account/profile',h=bh)['id']
foreign_buyer=call('/store-api/account/register',{'email':'foreign'+email,'name':'Foreign buyer','password':password},{'x-tenant':other['x-tenant']})
foreign_customer=call('/store-api/account/profile',h={'x-tenant':other['x-tenant'],'x-customer-token':foreign_buyer['customerToken']})['id']
cart=call('/store-api/checkout/cart',{},pub);ch={**pub,'sw-context-token':cart['token']}
call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'mug','quantity':1}]},ch)
order=call('/store-api/checkout/order',{}, {**ch,'Idempotency-Key':tag})['id']
company='company_'+tag
call('/api/b2b/company.save',{'id':company,'revision':0,'data':{'name':{'en-GB':'Extension company'},'active':True,'vatId':'SYNTHETIC'}},h)
objects={'product':'mug','customer':customer,'order':order,'company':company}
def save(kind,native,record=None,revision=0,segment='initial',headers=h,status=200):
    return call('/api/apps/object_context/actions/save_'+kind+'_context',{'id':record or kind,'revision':revision,'fields':{'native_id':native,'segment':segment,'note':{'en-GB':'Private example','de-DE':'Privates Beispiel'}}},headers,status)
for kind,native in objects.items(): save(kind,native)
# Unique native anchors and composite native references share the existing transactional store.
save('product','mug','duplicate',status=409)
save('customer',foreign_customer,'foreign',status=400)
save('product','mug',revision=0,status=409)
assert call('/api/apps/object_context/actions/list_product_context',{},other)['elements']==[]
assert 'extensions' not in call('/store-api/product/mug',h=pub)['product']
for kind,path in [('product','/api/merchant/products/mug'),('customer','/api/merchant/customers/'+email),('order','/api/merchant/orders/'+order)]:
    result=call(path,h=h);assert result['extensions'][0]['record']['segment']=='initial',(kind,result)
assert call('/api/b2b/company',{'id':company},h)['extensions'][0]['record']['native_id']==company
for kind,path in [('product','/api/merchant/products'),('customer','/api/merchant/customers'),('order','/api/merchant/orders')]:
    f=json.dumps([{'app':'object_context','entity':kind+'_context','field':'segment','value':'initial'}])
    rows=call(path+'?limit=1&appFilter='+urllib.parse.quote(f),h=h)['elements']
    assert len(rows)==1 and rows[0]['id']==objects[kind],(kind,rows)
    bad=json.dumps([{'app':'object_context','entity':kind+'_context','field':'note','value':'Private example'}])
    call(path+'?appFilter='+urllib.parse.quote(bad),h=h,status=400)
print('PASS all four native objects project typed revisioned app fields; indexed global filters precede pagination; public product data excludes private fields',flush=True)

def mcp(name,args,h=h):
    return call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':args}},h)['result']
f=json.dumps([{'app':'object_context','entity':'product_context','field':'segment','value':'initial'}])
assert mcp('merchant.products',{'appFilter':f})['structuredContent']['elements'][0]['extensions'][0]['record']['segment']=='initial'
record=mcp('app.object_context.list_product_context',{})['structuredContent']
assert record['ontology']['edges'][0]['targetType']=='product' and record['ontology']['edges'][0]['targetId']=='mug'
# Grants are checked now, not copied from the installation or creator identity.
role={'name':{'en-GB':'Extension reader'},'permissions':['catalog.read'],'active':True}
call('/api/workspace/roles/extension_reader',{'revision':0,'data':role},h,method='PUT')
inv=call('/api/workspace/invitations',{'role':'extension_reader','email':'reader'+tag+'@example.test'},h)
reader=call('/api/auth/accept',{'name':'Extension reader','password':password,'invitationToken':inv['token']})
rh={'x-tenant':h['x-tenant'],'Authorization':'Bearer '+reader['token']}
assert not call('/api/merchant/products/mug',h=rh).get('extensions')
call('/api/apps/object_context/actions/list_product_context',{},rh,status=403)
role['permissions'].append('knowledge.read');call('/api/workspace/roles/extension_reader',{'revision':1,'data':role},h,method='PUT')
projection=call('/api/merchant/products/mug',h=rh)['extensions'][0]
assert projection['record']['segment']=='initial' and projection['writeAction'] is None
save('product','mug',revision=1,headers=rh,status=403)
role['permissions']=['catalog.read'];call('/api/workspace/roles/extension_reader',{'revision':2,'data':role},h,method='PUT')
assert not call('/api/merchant/products/mug',h=rh).get('extensions')
print('PASS HTTP and MCP share current native/app scopes; read-only and revoked members cannot read hidden fields or mutate records',flush=True)
# An installed extension cannot be rebound by a package update or by generated presentation edits.
changed=copy.deepcopy(manifest);changed['version']='1.1.0';changed['entities'][0]['extends']['field']='replacement';changed['entities'][0]['fields'][0]['name']='replacement';changed['intelligence']['ontology'][0]['fields'][0]='replacement'
call('/api/apps',{'manifest':changed},h,status=409)
stage=call('/api/environments',{'name':'Extension release'},h)['id'];sh={**h,'x-tenant':stage}
assert call('/api/apps/object_context/actions/list_product_context',{},sh)['elements'][0]['segment']=='initial'
assert call('/api/apps/object_context/actions/list_company_context',{},sh)['elements'][0]['native_id']==company
assert call('/api/apps/object_context/actions/list_customer_context',{},sh)['elements']==[]
assert call('/api/apps/object_context/actions/list_order_context',{},sh)['elements']==[]
save('product','mug',revision=1,segment='prepared',headers=sh)
assert call('/api/merchant/products/mug',h=h)['extensions'][0]['record']['segment']=='initial'
diff=call('/api/environments/'+stage+'/diff',h=h)
changes=diff.get('changes',diff.get('elements',[]))
selected=next(c for c in changes if c['key']=='appdata:object_context:product_context:product')
assert not any(c['key'].startswith(('appdata:object_context:order_context:','appdata:object_context:customer_context:')) for c in changes)
call('/api/environments/'+stage+'/release',{'approve':True,'selections':[{'key':selected['key'],'digest':selected['digest']}]},h)
assert call('/api/merchant/products/mug',h=h)['extensions'][0]['record']['segment']=='prepared'
assert call('/api/apps/object_context/actions/list_order_context',{},h)['elements'][0]['native_id']==order
assert call('/api/apps/object_context/actions/list_customer_context',{},h)['elements'][0]['native_id']==customer
print('PASS private product/company extension clone and selected publication preserve live customer/order records; installed object binding remains immutable',flush=True)

# Oversized extension previews must be omitted explicitly, never represented as a new empty writable record.
large=copy.deepcopy(manifest);large['version']='1.1.0';large.pop('intelligence',None)
large['entities'][0]['fields'] += [{'name':'payload_'+str(i),'kind':'json'}for i in range(5)]
call('/api/apps',{'manifest':large},h)
fields={'native_id':'mug','segment':'prepared','note':{'en-GB':'Private example'},**{'payload_'+str(i):{'text':'x'*7900}for i in range(5)}}
call('/api/apps/object_context/actions/save_product_context',{'id':'product','revision':2,'fields':fields},h)
preview=call('/api/merchant/products/mug',h=h)
assert preview['extensions']==[] and preview['omittedExtensions']==1
assert len(call('/api/apps/object_context/actions/list_product_context',{},h)['elements'][0]['payload_0']['text'])==7900
save('product','mug',revision=3,segment='prepared')
projection=call('/api/merchant/products/mug',h=h)['extensions'][0]
assert projection['ontology']['edges'][0]['targetId']=='mug'
print('PASS oversized native previews are reported without empty-write affordances; complete app reads remain available and graph binding works without an explicit ontology',flush=True)

if os.getenv('CORE_EXTENSION_REVIEW_HOLD'):
    import time
    (ROOT/'artifacts/core-extension-review.json').write_text(json.dumps({'url':base+'/?shop='+h['x-tenant']+'&studio=productData#merchant','email':'extensions'+tag+'@example.test','password':password,'tenant':h['x-tenant']}))
    print('READY isolated synthetic extension workspace for browser review',flush=True)
    while True:time.sleep(1)
