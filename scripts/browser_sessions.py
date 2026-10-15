#!/usr/bin/env python3
"""Real HTTP personal-cookie transport, current ledger, origin/CSRF/session fences and legacy bearer compatibility."""
import json
import os
import uuid
import urllib.request
import urllib.error
import urllib.parse
from http.cookies import SimpleCookie

base=os.environ['BASE_URL']
origin=os.environ.get('COMMERCE_PUBLIC_ORIGIN',base)
host=urllib.parse.urlsplit(origin).netloc
checks=[]
def call(path,body=None,headers=None,status=200):
    request=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),
        headers={'Content-Type':'application/json',**(headers or {})})
    try: response=urllib.request.urlopen(request,timeout=30)
    except urllib.error.HTTPError as error:response=error
    with response:
        value=json.load(response)
        assert response.status==status,(path,response.status,status,value)
        return value,response.headers
def personal(suffix):
    shop='browser-'+suffix+'-'+uuid.uuid4().hex[:10]
    email=shop+'@example.test'
    user,_=call('/api/auth/register',{'workspaceId':shop,'workspaceName':'Synthetic browser fixture','name':'Synthetic owner','email':email,'password':'Synthetic-browser-password-2026!'})
    return shop,email,user
def cookies(headers):
    values=SimpleCookie()
    for raw in headers.get_all('set-cookie',[]):values.load(raw)
    session=next(v for k,v in values.items() if k.endswith('veyndo-session'))
    proof=next(v for k,v in values.items() if k.endswith('veyndo-csrf'))
    assert session['httponly'] and session['path']=='/' and session['samesite']=='Lax' and not session['domain']
    if origin.startswith('https:'):assert session['secure'] and session.key.startswith('__Host-')
    return '; '.join(k+'='+v.value for k,v in values.items()),proof.value,session.value
def browser(shop,jar='',proof='',**extra):
    return {'Host':host,'Origin':origin,'x-tenant':shop,'x-veyndo-browser-session':'1',
        **({'Cookie':jar} if jar else {}),**({'x-veyndo-csrf':proof} if proof else {}),**extra}
def passed(message):checks.append(message);print('PASS',message)

shop,email,user=personal('one')
legacy={'Authorization':'Bearer '+user['token'],'x-tenant':shop}
legacy_read,legacy_headers=call('/api/auth/session',headers=browser(shop,**legacy))
assert legacy_read['user']['id']==user['user']['id'] and not legacy_headers.get_all('set-cookie')
value,headers=call('/api/auth/login',{'email':email,'password':'Synthetic-browser-password-2026!'},headers=browser(shop))
jar,proof,opaque=cookies(headers)
assert value['token']=='browser-session' and value['browserSession'] and value['browserCsrf']==proof
assert opaque!=user['token'] and opaque not in json.dumps(value)
assert headers['cache-control']=='no-store'
passive,passive_headers=call('/api/auth/session',headers=browser(shop,jar,proof))
assert passive['user']['id']==user['user']['id'] and not passive_headers.get_all('set-cookie')
assert call('/api/auth/session',headers=legacy)[0]['user']['id']==user['user']['id']
tools,_=call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/list'},headers=browser(shop,jar,proof))
assert tools['result']['tools']
call('/mcp',{'jsonrpc':'2.0','id':2,'method':'tools/list'},headers=browser(shop,jar),status=401)
passed('Explicit browser sign-in issues host-only HttpOnly cookies through the same ledger; passive legacy reads cannot overwrite a newer login; browser JSON contains no bearer and API clients stay compatible')

call('/api/auth/session',headers=browser(shop,jar),status=401)
call('/api/auth/session',headers=browser(shop,jar,'wrong'),status=401)
call('/api/auth/session',headers=browser(shop,jar,proof,Origin='https://another-shop.veyndo.ai'),status=403)
call('/api/auth/handoff',{},headers=browser(shop,jar),status=401)
call('/api/auth/session',headers={'Cookie':jar,'x-tenant':shop},status=401)
call('/api/auth/session',headers=browser(shop,jar+'; '+jar,proof),status=401)
passed('Missing/forged CSRF, same-site foreign origins, unmarked ambient cookies and duplicate cookies cannot read or mutate a personal account')

handoff,_=call('/api/auth/handoff',{},headers=browser(shop,jar,proof))
renewed,headers=call('/api/auth/redeem',{'ticket':handoff['ticket']},headers=browser(shop))
new_jar,new_proof,new_opaque=cookies(headers)
assert renewed['token']=='browser-session' and new_opaque!=opaque and new_opaque not in json.dumps(renewed)
assert call('/api/auth/session',headers=browser(shop,new_jar,new_proof))[0]['user']['id']==user['user']['id']
call('/api/auth/session',headers=browser(shop,new_jar,proof),status=401)
passed('One-use Studio handoff creates the same private session without returning its bearer; an old tab proof cannot silently adopt the replacement session')

foreign,foreign_email,foreign_user=personal('two')
signed,headers=call('/api/auth/login',{'email':foreign_email,'password':'Synthetic-browser-password-2026!'},headers=browser(foreign))
foreign_jar,foreign_proof,_=cookies(headers)
assert signed['token']=='browser-session' and signed['browserCsrf']==foreign_proof
call('/api/auth/session',headers=browser(shop,foreign_jar,new_proof),status=401)
call('/api/auth/session',headers=browser(shop,foreign_jar,foreign_proof),status=403)
assert call('/api/auth/session',headers=browser(foreign,foreign_jar,foreign_proof))[0]['user']['id']==foreign_user['user']['id']
passed('An account change in another tab cannot reuse the previous tab context or widen its shop membership')

out,headers=call('/api/auth/logout',{},headers=browser(shop,new_jar,new_proof))
assert out['loggedOut'] and all('Max-Age=0' in raw for raw in headers.get_all('set-cookie',[]))
call('/api/auth/session',headers=browser(shop,new_jar,new_proof),status=401)
call('/api/auth/session',headers={**legacy,'Authorization':'Bearer '+new_opaque},status=401)
passed('Logout clears both browser cookies and revokes the actual opaque session in the existing ledger')

# A stale tab may explicitly leave this browser but cannot revoke a different account.
out,cleared=call('/api/auth/logout',{},headers=browser(foreign,foreign_jar,new_proof))
assert out['loggedOut'] and all('Max-Age=0' in v for v in cleared.get_all('set-cookie',[]))
assert call('/api/auth/session',headers=browser(foreign,foreign_jar,foreign_proof))[0]['user']['id']==foreign_user['user']['id']
passed('Explicit stale-tab sign-out clears the browser without revoking another account ledger')

# MFA enrollment and actual recovery-code login use exactly the same redacted transport.
import base64,hashlib,hmac,struct,time
mfa,_=call('/api/auth/mfa/enroll',{'password':'Synthetic-browser-password-2026!'},headers=browser(foreign,foreign_jar,foreign_proof))
raw=hmac.new(base64.b32decode(mfa['secret']),struct.pack('>Q',int(time.time())//30),hashlib.sha1).digest()
offset=raw[-1]&15
code=str((struct.unpack('>I',raw[offset:offset+4])[0]&0x7fffffff)%1000000).zfill(6)
confirmed,headers=call('/api/auth/mfa/confirm',{'password':'Synthetic-browser-password-2026!','revision':mfa['revision'],'code':code},headers=browser(foreign,foreign_jar,foreign_proof))
_,_,mfa_token=cookies(headers)
assert confirmed['session']['token']=='browser-session' and mfa_token not in json.dumps(confirmed)
pending,headers=call('/api/auth/login',{'email':foreign_email,'password':'Synthetic-browser-password-2026!'},headers=browser(foreign))
assert pending['mfaRequired'] and not headers.get_all('set-cookie') and 'token' not in pending
signed,headers=call('/api/auth/mfa/verify',{'challengeToken':pending['challengeToken'],'code':confirmed['recoveryCodes'][0]},headers=browser(foreign))
mfa_jar,mfa_proof,issued=cookies(headers)
assert signed['token']=='browser-session' and issued not in json.dumps(signed)
assert call('/api/auth/session',headers=browser(foreign,mfa_jar,mfa_proof))[0]['user']['id']==foreign_user['user']['id']
passed('Mandatory MFA confirmation and recovery-code login produce redacted HttpOnly sessions, never a bearer in browser JSON')

# Customer identity is a separate, tenant-bound native ledger, including binary-download transport.
def customer(shop,jar='',proof='',**extra):
    return {'Host':host,'Origin':origin,'x-tenant':shop,'x-veyndo-customer-session':'1',
        **({'Cookie':jar} if jar else {}),**({'x-veyndo-customer-csrf':proof} if proof else {}),**extra}
email='customer-'+uuid.uuid4().hex[:10]+'@example.test'
registered,headers=call('/store-api/account/register',{'name':'Synthetic buyer','email':email,'password':'Synthetic-customer-password-2026!'},headers=customer(shop))
values=SimpleCookie()
for raw in headers.get_all('set-cookie',[]):values.load(raw)
private=values['__Host-veyndo-customer-'+shop]
customer_proof=values['__Host-veyndo-customer-csrf-'+shop].value
customer_jar='; '.join(k+'='+v.value for k,v in values.items())
assert private['httponly'] and private['secure'] and not private['domain'] and private['path']=='/'
assert registered['customerToken']=='browser-customer-session' and private.value not in json.dumps(registered)
profile,passive_customer_headers=call('/store-api/account/profile',headers=customer(shop,customer_jar,customer_proof))
assert profile['email']==email and not passive_customer_headers.get_all('set-cookie')
call('/store-api/account/profile',headers=customer(shop,customer_jar),status=401)
call('/store-api/account/profile',headers=customer(shop,customer_jar,'wrong'),status=401)
call('/store-api/account/profile',headers=customer(shop,customer_jar,customer_proof,Origin='https://foreign-shop.veyndo.ai'),status=403)
call('/store-api/account/profile',headers=customer(foreign,customer_jar,customer_proof),status=401)
call('/api/auth/session',headers=browser(shop,customer_jar,customer_proof),status=401)
legacy_customer={'x-tenant':shop,'x-customer-token':private.value}
assert call('/store-api/account/profile',headers=legacy_customer)[0]['email']==email
call('/store-api/account/profile',headers={'x-tenant':shop,'Cookie':customer_jar},status=401)
out,headers=call('/store-api/account/logout',{},headers=customer(shop,customer_jar,customer_proof))
assert out['loggedOut'] and all('Max-Age=0' in v for v in headers.get_all('set-cookie',[]))
call('/store-api/account/profile',headers=legacy_customer,status=401)
passed('Customers use separate tenant-bound HttpOnly sessions with CSRF, real revocation, cross-tenant/merchant denial and legacy API compatibility')

for path in ['/','/health','/api/auth/session']:
    _,headers=call(path,headers={'Host':host},status=401 if path.endswith('session') else 200) if path!='/' else (None,urllib.request.urlopen(urllib.request.Request(base+'/',headers={'Host':host})).headers)
    policies=headers.get_all('content-security-policy',[])
    assert any('script-src '+origin+'/assets/;' in p for p in policies),policies
passed('The credential host applies build-owned-only scripts to all pages and errors, not merely to a Studio route')
print(json.dumps({'passed':len(checks),'actualHttp':True,'syntheticData':True,'newAuthStore':False}))
