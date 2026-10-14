#!/usr/bin/env python3
"""Real HTTP/PostgreSQL role edits, current session/key/worker grants and native B2B setup regressions."""
import json, os, urllib.request, urllib.error, uuid
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8787'); tag=uuid.uuid4().hex[:10]
def request(path, data=None, h=None, method=None, expected=200):
    req=urllib.request.Request(BASE+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method or ('POST' if data is not None else 'GET'))
    try:
        with urllib.request.urlopen(req,timeout=30) as r: status=r.status; value=json.load(r)
    except urllib.error.HTTPError as e: status=e.code; value=json.load(e)
    assert status==expected,(path,status,expected,value)
    return value
def register(label):
    return request('/api/auth/register',{'name':label,'email':label+'-'+tag+'@example.test','password':'Role-fixture-password-2026!','workspaceId':label+'-'+tag,'workspaceName':label})
def headers(s):return {'Authorization':'Bearer '+s['token'],'x-tenant':s['workspace']}
a=register('role-lab'); b=register('foreign-role-lab'); ah=headers(a); bh=headers(b)
def role(id,scopes,revision=0,active=True):
    return request('/api/workspace/roles/'+id,{'revision':revision,'data':{'name':{'en-GB':id},'permissions':scopes,'active':active}},ah,'PUT')
def invite(id,label):
    i=request('/api/workspace/invitations',{'role':id,'email':label+'-'+tag+'@example.test'},ah)
    return request('/api/auth/accept',{'name':label,'password':'Role-fixture-password-2026!','invitationToken':i['token']})
roles=request('/api/workspace/roles',h=ah)
assert {r['id'] for r in roles['elements']}=={'owner','admin','editor','viewer'}
assert roles['mainLocale']=='en-GB'
role('stock_reader',['catalog.read'])
u=invite('stock_reader','stock-reader'); uh=headers(u)
assert request('/api/auth/access',h=uh)['permissions']==['catalog.read']
assert request('/api/merchant/products',h=uh)['elements']
for path in ['/api/merchant/customers','/api/merchant/orders','/api/workspace/roles','/api/developer','/api/agent/conversations']:
    request(path,h=uh,expected=403)
overview=request('/api/merchant/overview',h=uh)
assert overview['orders']==[] and overview['summary']['orders']==0 and overview['knowledge']['graph']['nodes']==[]
assert overview['connections']['providers']==[]
request('/api/automation',h=uh,expected=403)
assert 'stock_reader' not in [r['id'] for r in request('/api/workspace/roles',h=bh)['elements']]
request('/api/workspace/roles/stock_reader',{'revision':0,'data':{'name':{'en-GB':'stale'},'permissions':[],'active':True}},ah,'PUT',409)
role('stock_reader',['catalog.read','catalog.write'],1)
assert 'catalog.write' in request('/api/auth/access',h=uh)['permissions']
# Key scopes are intersected with the creator's current definition on every request.
request('/api/workspace/members/'+u['user']['id'],{'role':'stock_reader','active':True,'permissions':None},ah,'PUT')
# Temporary role grants team delegation, but only its own rights.
role('key_delegate',['catalog.read','team.manage'])
kuser=invite('key_delegate','key-delegate'); kh=headers(kuser)
key=request('/api/workspace/integrations',{'name':'stock lookup','expiresInDays':1,'permissions':['catalog.read']},kh)
keyh={'Authorization':'Bearer '+key['key'],'x-tenant':a['workspace']}
assert request('/api/merchant/products',h=keyh)['elements']
request('/api/workspace/roles/forbidden',{'revision':0,'data':{'name':{'en-GB':'forbidden'},'permissions':['payments.manage'],'active':True}},kh,'PUT',403)
request('/api/workspace/members/'+kuser['user']['id'],{'role':'admin','active':True,'permissions':None},kh,'PUT',403)
role('key_delegate',['team.manage'],1)
request('/api/merchant/products',h=keyh,expected=403)
role('stock_reader',['catalog.read'],2,False)
request('/api/auth/access',h=uh,expected=403)
usage=request('/api/workspace/roles/stock_reader/dependencies',h=ah)
assert usage['blocked'] and usage['members']==1
request('/api/workspace/roles/stock_reader',{'revision':3,'approve':True},ah,'DELETE',409)
request('/api/workspace/roles/owner',{'revision':1,'data':{'name':{'en-GB':'owner'},'permissions':[],'active':False}},ah,'PUT',400)
role('disposable',[])
request('/api/workspace/roles/disposable',{'revision':1,'approve':True},ah,'DELETE')
# Retained explicit overrides are delegation too, even when omitted from the update body.
paused=invite('viewer','paused-high-grants')
request('/api/workspace/members/'+paused['user']['id'],{'role':'viewer','active':False,'permissions':['payments.manage']},ah,'PUT')
request('/api/workspace/members/'+paused['user']['id'],{'role':'viewer','active':True},kh,'PUT',403)
assert not next(m for m in request('/api/workspace/members',h=ah)['members'] if m['id']==paused['user']['id'])['active']
# Full CRM data requires the separate PII grant, across HTTP and MCP.
role('crm_metadata',['customers.read','orders.read'])
crm=invite('crm_metadata','crm-metadata'); ch=headers(crm)
for path in ['/api/merchant/customers','/api/merchant/customers/lookup','/api/merchant/orders','/api/search/order']:
    request(path, {} if path=='/api/search/order' else None,h=ch,expected=403)
r=request('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'merchant.customers','arguments':{}}},ch)
assert r['result']['isError']
tools=request('/mcp',{'jsonrpc':'2.0','id':2,'method':'tools/list'},ah)['result']['tools']
assert any(t['name']=='team.role.save' for t in tools)
assert not any(t['name']=='team.role.save' for t in request('/mcp',{'jsonrpc':'2.0','id':3,'method':'tools/list'},ch)['result']['tools'])
# Role history is the shared audit owner and restoring uses current grant checks.
assert request('/api/history/role/stock_reader',h=ah)['elements']
request('/api/history/role/stock_reader',h=uh,expected=403)
# Atomically create company/unit and bind only a customer in the same tenant.
customer=request('/store-api/account/register',{'email':'buyer-'+tag+'@example.test','password':'Customer-fixture-password-2026!','name':'Ada Lookup','firstName':'Ada','lastName':'Lookup'},{'x-tenant':a['workspace']})
lookup=request('/api/merchant/customers/lookup?limit=20&query=Ada',h=ah)
assert len(lookup['elements'])==1 and not any(k in lookup['elements'][0] for k in ['addresses','billingAddress','passwordHash'])
customer_id=lookup['elements'][0]['id']
id='c'+tag
created=request('/api/b2b/company.create',{'id':id,'revision':0,'data':{'name':{'en-GB':'Company fixture'},'active':True,'vatId':''},'customerId':customer_id},ah)
detail=request('/api/b2b/company',{'id':id},ah)
assert len(detail['units'])==1 and detail['members'][0]['customerId']==customer_id
request('/api/b2b/company.create',{'id':'foreign'+tag,'revision':0,'data':{'name':{'en-GB':'Denied'},'active':True,'vatId':''},'customerId':customer_id},bh,expected=404)
assert not any(c['id']=='foreign'+tag for c in request('/api/b2b/companies',{},bh)['companies'])
# B2B feature toggles are versioned shared settings, retain budget/approval policy and block native employee/UCP operations.
config=request('/api/b2b/configuration',{},ah)
request('/api/b2b/settings.save',{'revision':config['revision'],'data':{**config['features'],'enabled':False}},ah)
assert request('/api/b2b/configuration',{},ah)['features']['enabled'] is False
buyer={'x-tenant':a['workspace'],'x-customer-token':customer['customerToken']}
request('/store-api/b2b/contexts',{},buyer,expected=403)
print('PASS tenant-owned roles, session/key revocation, delegation, privacy, MCP, history, indexed lookup and atomic B2B setup')

from testing.role_races import check_role_races
check_role_races(request,register,headers)

# Knowledge writers do not need product mutation rights for shop-wide sources/indexing.
role('knowledge_writer',['knowledge.read','knowledge.write'])
writer=invite('knowledge_writer','knowledge-writer'); wh=headers(writer)
source=request('/api/knowledge/documents',{'title':'Policy','content':'Synthetic shop policy','kind':'faq'},wh)
request('/api/knowledge/documents/'+source['id']+'/index',{},wh)
request('/api/merchant/products/lamp',{},wh,'PUT',403)
print('PASS knowledge-only writes share ingestion/indexing without product mutation rights')

from testing.consistency_boundaries import check_consistency_boundaries
check_consistency_boundaries(request, role, invite, headers, ah)
