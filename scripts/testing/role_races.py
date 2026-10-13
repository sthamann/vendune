"""Force real HTTP delegation to wait behind the same PostgreSQL lifecycle lock as role edits."""
import concurrent.futures
import os
import subprocess
import time
from urllib.parse import urlsplit
from testing.database import psql


def check_role_races(request, register, headers):
    a = register('role-race'); h = headers(a)
    def member(role, label):
        invite = request('/api/workspace/invitations', {'role': role, 'email': label+'-'+a['workspace']+'@example.test'}, h)
        return request('/api/auth/accept', {'name': label, 'password': 'Role-fixture-password-2026!', 'invitationToken': invite['token']})
    second = member('owner', 'other-owner'); other = headers(second)
    target = member('viewer', 'race-target')
    url = urlsplit(os.environ['DATABASE_URL'])
    command = psql(os.environ.get('TEST_DB_CONTAINER', 'sellama-postgres-1'), url.username or 'commerce', url.path[1:], '-Atq', '-v', 'ON_ERROR_STOP=1')
    def sql(value):
        return subprocess.check_output(command, input=value, text=True).strip()
    # Fixture identifiers come only from the synthetic registry and have no SQL metacharacters.
    tenant = a['workspace']; actor = a['user']['id']
    assert all(c.isalnum() or c in '-_' for c in tenant+actor)
    def pending_demotion(operation):
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        try:
            process.stdin.write(f"BEGIN; SELECT id FROM tenants WHERE id='{tenant}' FOR UPDATE; SELECT 'LOCKED';\n"); process.stdin.flush()
            while process.stdout.readline().strip() != 'LOCKED':
                assert process.poll() is None, 'Fixture lock failed'
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(operation)
                for _ in range(100):
                    if sql("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT id FROM tenants%'") != '0':
                        break
                    time.sleep(.02)
                else:
                    raise AssertionError('HTTP delegation never waited on tenant lifecycle lock')
                process.stdin.write(f"UPDATE memberships SET role='admin',permissions='null'::jsonb WHERE tenant='{tenant}' AND user_id='{actor}'; COMMIT;\\q\n"); process.stdin.flush()
                process.wait(timeout=10)
                future.result(timeout=30)
        finally:
            if process.poll() is None: process.kill(); process.wait()
        request('/api/workspace/members/'+actor, {'role':'owner','active':True,'permissions':None}, other, 'PUT')
    pending_demotion(lambda: request('/api/workspace/members/'+target['user']['id'], {'role':'owner','active':True,'permissions':None}, h, 'PUT', 403))
    pending_demotion(lambda: request('/api/workspace/invitations', {'role':'owner','email':'denied-'+tenant+'@example.test'}, h, expected=403))
    invite = request('/api/workspace/invitations', {'role':'owner','email':'accept-'+tenant+'@example.test'}, h)
    pending_demotion(lambda: request('/api/auth/accept', {'name':'Blocked owner','password':'Role-fixture-password-2026!','invitationToken':invite['token']}, expected=403))
    assert next(m for m in request('/api/workspace/members', h=other)['members'] if m['id']==target['user']['id'])['role']=='viewer'
    print('PASS forced concurrent owner demotion blocks stale promotion, invitation and acceptance')
