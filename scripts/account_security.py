"""Native personal MFA acceptance through HTTP/PostgreSQL; synthetic accounts only, no external services."""
import base64, concurrent.futures, hashlib, hmac, json, os, struct, subprocess, time, uuid, urllib.request, urllib.error
from testing.database import psql
BASE=os.environ['BASE_URL']; suffix=uuid.uuid4().hex[:12]; password='Synthetic-security-2026!'
def req(path,body=None,headers=None,expected=200):
 r=urllib.request.Request(BASE+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(headers or {})})
 try:
  with urllib.request.urlopen(r,timeout=30) as response: status=response.status;data=json.load(response)
 except urllib.error.HTTPError as e:status=e.code;data=json.load(e)
 assert status==expected,(path,status,expected,data)
 return data
def sql(q):
 r=subprocess.run(psql(os.environ['DB_CONTAINER'],'commerce',os.environ['TEST_DATABASE'],'-X','-q','-At','-v','ON_ERROR_STOP=1'),input=q,text=True,capture_output=True);assert r.returncode==0,r.stderr;return r.stdout.strip()
def register(name):return req('/api/auth/register',{'email':name+suffix+'@example.test','name':name,'password':password,'workspaceId':name+'-'+suffix})
def headers(s):return {'Authorization':'Bearer '+s['token'],'x-tenant':s['workspace']}
def code(secret,step=None):
 counter=int(time.time())//30 if step is None else step
 raw=hmac.new(base64.b32decode(secret),struct.pack('>Q',counter),hashlib.sha1).digest();n=struct.unpack('>I',raw[raw[-1]&15:(raw[-1]&15)+4])[0]&0x7fffffff;return str(n%1000000).zfill(6)
a=register('security');b=register('other');h=headers(a)
assert not req('/api/auth/mfa',headers=h)['enabled']
req('/api/auth/mfa/enroll',{'password':'incorrect-password'},h,401)
setup=req('/api/auth/mfa/enroll',{'password':password},h);assert len(setup['secret'])==32
req('/api/auth/mfa/confirm',{'password':password,'code':code(setup['secret']),'revision':99},h,409)
enrollment_code=code(setup['secret'])
confirmed=req('/api/auth/mfa/confirm',{'password':password,'code':enrollment_code,'revision':setup['revision']},h)
assert len(confirmed['recoveryCodes'])==8 and len(set(confirmed['recoveryCodes']))==8
req('/api/auth/session',headers=h,expected=401)
new=headers(confirmed['session']); assert req('/api/auth/mfa',headers=new)['enabled']
assert not req('/api/auth/mfa',headers=headers(b))['enabled']
login=lambda:req('/api/auth/login',{'email':a['user']['email'],'password':password})
pending=login();assert pending['mfaRequired'] and 'token' not in pending and 'user' not in pending
req('/api/auth/session',headers={'Authorization':'Bearer '+pending['challengeToken'],'x-tenant':a['workspace']},expected=401)
req('/api/auth/mfa/verify',{'challengeToken':pending['challengeToken'],'code':enrollment_code},expected=401)
proof={'challengeToken':pending['challengeToken'],'code':confirmed['recoveryCodes'][0]}
with concurrent.futures.ThreadPoolExecutor(2) as pool:
 def raced(_):
  try:return req('/api/auth/mfa/verify',proof)
  except AssertionError as e:
   assert '401' in str(e),e;return None
 results=list(pool.map(raced,range(2)))
assert sum(bool(r) for r in results)==1
signed=next(r for r in results if r);req('/api/auth/mfa/verify',proof,expected=401)
assert req('/api/auth/mfa',headers=headers(signed))['recoveryCodesRemaining']==7
expired=login();sql("UPDATE merchant_mfa_challenges SET expires_at=now()-interval '1 second' WHERE digest='"+hashlib.sha256(expired['challengeToken'].encode()).hexdigest()+"'")
req('/api/auth/mfa/verify',{'challengeToken':expired['challengeToken'],'code':confirmed['recoveryCodes'][1]},expected=401)
exhausted=login()
for _ in range(6):req('/api/auth/mfa/verify',{'challengeToken':exhausted['challengeToken'],'code':'not-a-code'},expected=401)
req('/api/auth/mfa/verify',{'challengeToken':exhausted['challengeToken'],'code':confirmed['recoveryCodes'][1]},expected=401)
state=req('/api/auth/mfa',headers=headers(signed))
req('/api/auth/mfa/disable',{'password':password,'code':confirmed['recoveryCodes'][1],'revision':999},headers(signed),409)
assert req('/api/auth/mfa',headers=headers(signed))['recoveryCodesRemaining']==7
key=req('/api/workspace/integrations',{'name':'mfa-negative','permissions':['catalog.read'],'expiresInDays':1},headers(signed))
req('/api/auth/mfa',headers={'Authorization':'Bearer '+key['key'],'x-tenant':a['workspace']},expected=400)
req('/api/auth/mfa/disable',{'password':password,'code':confirmed['recoveryCodes'][1],'revision':state['revision']},headers(signed))
req('/api/auth/session',headers=headers(signed),expected=401)
assert 'token' in login()
stored=sql("SELECT ciphertext,pending_ciphertext,recovery_digests FROM merchant_mfa WHERE user_id='"+a['user']['id']+"'")
assert setup['secret'] not in stored and all(c not in stored for c in confirmed['recoveryCodes'])
print('PASS enrollment/password/revision guards, session revocation, mandatory second factor, replay/concurrent denial, expiry/attempt limit, recovery atomicity, personal-token admission and disable')
