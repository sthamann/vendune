"""Real installed-package -> Rust EDI gateway -> consent-bound callbacks -> buyer-owned requisition -> native checkout; no external network."""
import concurrent.futures,json,os,socket,subprocess,sys,time,urllib.error,urllib.request,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];sys.path.insert(0,str(ROOT/'scripts'))
from testing.app_approval import pin,consent
from testing.runtime import serve,stop
suffix=uuid.uuid4().hex[:8];env=dict(os.environ);package=json.loads((ROOT/'extensions/apps/edi/manifest.json').read_text());gateway='synthetic-edi-gateway-'+suffix+'x'*30

def port():
 with socket.socket()as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
core_url=f'http://127.0.0.1:{port()}';adapter_url=f'http://127.0.0.1:{port()}'
def call(base,path,data=None,h=None,status=200,method=None):
 if path=='/api/apps':data=consent(data)
 req=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method)
 try:r=urllib.request.urlopen(req,timeout=20)
 except urllib.error.HTTPError as e:r=e
 v=json.load(r);assert r.status in (status if isinstance(status,tuple)else(status,)),(path,r.status,status,v);return v
core_env={**env,'BIND_ADDR':core_url.removeprefix('http://'),'BASE_URL':core_url,'APP_SERVICES':json.dumps(pin({'edi':{'url':adapter_url,'token':gateway}},'edi',package))}
log=(ROOT/'artifacts/edi.log').open('w');core=adapter=None
try:
 core=serve(core_env,core_url,log);tenants={};owners={};buyers={}
 for label in ['edi','edi-foreign']:
  r=call(core_url,'/api/auth/register',{'workspaceId':label+'-'+suffix,'name':'EDI fixture','email':label+suffix+'@example.test','password':'Synthetic-EDI-fixture-2026!'})
  t=r['workspace'];h={'x-tenant':t,'Authorization':'Bearer '+r['token']};owners[label]=h
  call(core_url,'/api/apps',{'manifest':package},h)
  digest=call(core_url,'/api/apps/edi/credentials',h=h)['digest']
  k=call(core_url,'/api/apps/edi/credentials',{'digest':digest,'approve':True,'permissions':['data.read','data.write','b2b.read','b2b.manage','orders.read','documents.read','customers.pii'],'expiresInDays':1},h)
  tenants[t]={'coreUrl':core_url,'callbackToken':k['key']}
  bh={'x-tenant':t};b=call(core_url,'/store-api/account/register',{'name':'Buyer','email':label+'buyer'+suffix+'@example.test','password':'Synthetic-EDI-buyer-2026!'},bh);bh['x-customer-token']=b['customerToken'];bid=call(core_url,'/store-api/account/profile',h=bh)['id'];buyers[label]=(bid,bh)
  call(core_url,'/api/b2b/company.save',{'id':'firm','revision':0,'data':{'name':{'en-GB':'EDI firm'},'active':True}},h)
  call(core_url,'/api/b2b/unit.save',{'id':'unit','companyId':'firm','revision':0,'data':{'name':{'en-GB':'EDI unit'},'active':True,'currency':'EUR'}},h)
  call(core_url,'/api/b2b/member.save',{'unitId':'unit','customerId':bid,'revision':0,'data':{'active':True,'permissions':['buy','lists','companyOrders']}},h)
  for fmt in ['edifact','ubl','cxml']:
   call(core_url,'/api/apps/edi/actions/save_partners',{'id':fmt,'revision':0,'fields':{'partner_id':fmt,'name':{'en-GB':'EDI '+fmt},'format':fmt,'sender_id':'BUYER','receiver_id':'SELLAMA','unit_id':'unit','buyer_id':bid,'active':True}},h)
 app_env={**env,'APP_TOKEN':gateway,'APP_EDI_TENANTS':json.dumps(tenants),'APP_BIND_ADDR':adapter_url.removeprefix('http://')}
 def start():
  p=subprocess.Popen([str(ROOT/'target/debug/edi-gateway')],env=app_env,stdout=log,stderr=log)
  for _ in range(100):
   if p.poll()is not None:raise AssertionError('EDI startup failed; see local log')
   try:call(adapter_url,'/health');return p
   except OSError:time.sleep(.05)
  raise AssertionError('EDI health unavailable')
 adapter=start();h=owners['edi'];t=h['x-tenant'];bid,bh=buyers['edi'];foreign=owners['edi-foreign']
 sku=call(core_url,'/store-api/product/lamp',h={'x-tenant':t})['product']['product_number'];documents={}
 for fmt,ext in [('edifact','edi'),('ubl','xml'),('cxml','cxml')]:
  raw=(ROOT/f'extensions/apps/edi/fixtures/order.{ext}').read_text().replace('SKU?+LAMP'if fmt=='edifact'else'SKU+LAMP',sku)
  payload={'partnerId':fmt,'format':fmt,'document':raw};documents[fmt]=payload
  good=call(core_url,'/api/apps/edi/actions/validate_document',payload,h);assert good['document']['lines'][0]['sku']==sku
  try:r=call(core_url,'/api/apps/edi/actions/import_document',payload,h)
  except AssertionError:
   call(adapter_url,'/actions/import_document',payload,{'x-tenant':t,'Authorization':'Bearer '+gateway})
   raise
  assert r['state']=='requisition' and not r['replayed']
  messages=call(core_url,'/api/apps/edi/actions/list_messages',{},h)['elements']; revisions={x['id']:x['revision']for x in messages}
  assert call(core_url,'/api/apps/edi/actions/import_document',payload,h)['replayed']
  assert revisions=={x['id']:x['revision']for x in call(core_url,'/api/apps/edi/actions/list_messages',{},h)['elements']}
  call(core_url,'/api/apps/edi/actions/import_document',{**payload,'document':raw.replace('PO-100','PO-100')+' '},h,502)
  assert len(call(core_url,'/store-api/b2b/lists',{'unitId':'unit'},bh)['elements'])==len(documents)
 call(adapter_url,'/actions/import_document',documents['edifact'],{'x-tenant':t},401)
 call(adapter_url,'/actions/import_document',documents['edifact'],{'x-tenant':'missing','Authorization':'Bearer '+gateway},403)
 assert not call(core_url,'/store-api/b2b/lists',{'unitId':'unit'},buyers['edi-foreign'][1])['elements']
 # Approved app callbacks cannot be used for unrelated operations, foreign identities or service recursion.
 key=tenants[t]['callbackToken'];kh={'x-tenant':t,'Authorization':'Bearer '+key}
 call(core_url,'/api/apps/other/core/record_action',{'action':'list_partners','input':{}},kh,403)
 call(core_url,'/api/apps/edi/core/record_action',{'action':'import_document','input':documents['edifact']},kh,400)
 call(core_url,'/api/apps/edi/core/record_action',{'action':'list_partners','input':{}},{**kh,'x-tenant':foreign['x-tenant']},403)
 call(core_url,'/api/apps/edi/core/b2b_requisition',{'id':'foreign','unitId':'unit','customerId':buyers['edi-foreign'][0],'data':{'name':{'en-GB':'Foreign'},'lines':[{'sku':sku,'quantity':2}]}},kh,403)
 assert call(core_url,'/store-api/b2b/unit.orders',{'unitId':'unit'},bh)['elements']==[]
 print('PASS three real EDI codecs, current partner mapping, native scoped requisitions, replay, changed-source conflict and no implicit purchase')
 # Original buyer uses the existing cart, currency, stock, tax and native order owner.
 c=call(core_url,'/store-api/checkout/cart',{},bh);bh['sw-context-token']=c['token'];c=call(core_url,'/store-api/b2b/select',{'unitId':'unit','revision':c['revision'],'purchaseOrder':'PO-100'},bh)
 ls=call(core_url,'/store-api/b2b/lists',{'unitId':'unit'},bh)['elements'][0]
 c=call(core_url,'/store-api/b2b/list.apply',{'unitId':'unit','id':ls['id'],'revision':ls['revision'],'cartRevision':c['revision']},bh)
 assert c['lineItems'][0]['quantity']==2
 order=call(core_url,'/store-api/checkout/order',{}, {**bh,'Idempotency-Key':'edi-'+suffix});assert order['b2b']['unitId']=='unit'
 # Outbound source is the existing immutable native receipt, not another invoice ledger.
 issuer=call(core_url,'/api/merchant/receipts/settings',h=h)
 call(core_url,'/api/merchant/receipts/settings',{'revision':issuer['revision'],'data':{'name':'Synthetic Seller','address':'Fixture Lane 1','taxId':'TEST-ONLY'}},h,method='PUT')
 receipt=call(core_url,'/api/merchant/orders/'+order['id']+'/receipts',{'revision':order['revision'],'kind':'invoice','locale':'en','requestKey':'edi-invoice-'+suffix},h)
 delivery=call(core_url,'/api/merchant/orders/'+order['id']+'/receipts',{'revision':order['revision'],'kind':'delivery_note','locale':'en','requestKey':'edi-delivery-'+suffix},h)
 for fmt in ['ubl','edifact']:
  for kind,r in [('order_response',None),('invoice',receipt),('delivery_note',delivery)]:
   args={'partnerId':fmt,'format':fmt,'kind':kind,'orderId':order['id'],**({'receiptId':r['id']}if r else{})}
   e=call(core_url,'/api/apps/edi/actions/export_document',args,h);assert e['document'] and not e['networkCertified']
   if kind=='invoice':assert receipt['number'] in e['document']
   assert e==call(core_url,'/api/apps/edi/actions/export_document',args,h)
 call(core_url,'/api/apps/edi/core/receipt_snapshot',{'id':order['id'],'receiptId':receipt['id']},{**kh,'x-tenant':foreign['x-tenant']},403)
 call(core_url,'/api/apps/edi/core/receipt_snapshot',{'id':'wrong-order','receiptId':receipt['id']},kh,404)
 no_pii=call(core_url,'/api/apps/edi/credentials',{'digest':call(core_url,'/api/apps/edi/credentials',h=h)['digest'],'approve':True,'permissions':['orders.read','documents.read'],'expiresInDays':1},h)
 call(core_url,'/api/apps/edi/core/receipt_snapshot',{'id':order['id'],'receiptId':receipt['id']},{**kh,'Authorization':'Bearer '+no_pii['key']},403)
 safe=call(core_url,'/api/apps/edi/core/receipt_snapshot',{'id':order['id'],'receiptId':receipt['id']},kh);assert 'token' not in safe['order']['cart']
 print('PASS native immutable invoice/delivery note and order acknowledgement export to UBL/EDIFACT; no fabricated receipt or foreign/incorrect order')
 stop(adapter);adapter=start();assert call(core_url,'/api/apps/edi/actions/import_document',documents['ubl'],h)['replayed']
 print('PASS imported requisition reaches native B2B checkout, stock and order history; cold restart preserves idempotency')
 # Revoked credentials stop service callbacks without modifying existing order lists.
 credential=next(x['id']for x in call(core_url,'/api/apps/edi/credentials',h=h)['keys']if set(x['permissions'])==set(['data.read','data.write','b2b.read','b2b.manage','orders.read','documents.read','customers.pii']));call(core_url,'/api/apps/edi/credentials/'+credential,h=h,method='DELETE')
 call(core_url,'/api/apps/edi/actions/import_document',documents['ubl'],h,502)
 print('PASS revoked callback credentials stop imports; cross-tenant IDs and unauthorized callback actions have no effect')
finally:
 if adapter:stop(adapter)
 if core:stop(core)
 log.close()
