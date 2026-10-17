"""Force the real customer-share/unit-update checkout interleaving; no business handler is mocked."""
import concurrent.futures, os, subprocess, time
from .database import psql
from urllib.parse import urlsplit

def purchases(call, first, second, tenant):
    command=psql(os.environ.get('TEST_DB_CONTAINER','veyndo-postgres-1'),
        urlsplit(os.environ['DATABASE_URL']).username or 'commerce',
        os.environ['TEST_DATABASE'],'-qAt','-v','ON_ERROR_STOP=1')
    def sql(statement):
        return subprocess.check_output(command,input=statement,text=True).strip()
    gate=subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
    def send(statement):gate.stdin.write(statement+'\n');gate.stdin.flush()
    def blocked(by):
        # Named isolated database and native blocked statement, never a guessed delay.
        row=sql(f"SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND {by}=ANY(pg_blocking_pids(pid)) AND state='active' ORDER BY pid LIMIT 1;")
        return int(row) if row else None
    def wait(by):
        for _ in range(300):
            if result:=blocked(by):return result
            time.sleep(.02)
        raise AssertionError('Native B2B interleaving did not reach its database lock')
    assert tenant.replace('-','').replace('_','').isalnum()
    try:
        send(f"BEGIN; SELECT pg_backend_pid(); SELECT id FROM products WHERE tenant='{tenant}' AND id='lamp' FOR UPDATE; SELECT 'ready';")
        gate_pid=int(gate.stdout.readline().strip())
        while True:
            line=gate.stdout.readline()
            assert line,'Synthetic product gate stopped before readiness'
            if line.strip()=='ready':break
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            buy=lambda h:call('/store-api/checkout/order',{}, {**h,'Idempotency-Key':'budget-'+h['sw-context-token']},status=(200,409))
            a=pool.submit(buy,first)
            a_pid=wait(gate_pid)
            b=pool.submit(buy,second)
            wait(a_pid)
            send('COMMIT;')
            results=[a.result(timeout=45),b.result(timeout=45)]
        assert sum('id' in value for value in results)==1,results
        print('PASS forced customer-share/unit-update interleaving admits one budgeted order and rejects the other without deadlock',flush=True)
        return results
    finally:
        if gate.poll() is None:
            send('ROLLBACK;\n\\q');gate.communicate(timeout=5)
