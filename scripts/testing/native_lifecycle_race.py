"""Force native workflow editing against app installation at the real database boundary."""
import concurrent.futures, copy, json, os, subprocess, time
from urllib.parse import urlsplit
from .database import psql

def workflow_installation(call, headers, manifest):
    assert urlsplit(os.environ['BASE_URL']).hostname in ('localhost','127.0.0.1')
    tenant=headers['x-tenant'];assert tenant.replace('-','').replace('_','').isalnum()
    command=psql(os.environ.get('TEST_DB_CONTAINER','veyndo-postgres-1'),urlsplit(os.environ['DATABASE_URL']).username or 'commerce',os.environ['TEST_DATABASE'],'-qAt','-v','ON_ERROR_STOP=1')
    def sql(statement):return subprocess.check_output(command,input=statement,text=True).strip()
    def mcp(name,args):return call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':args}},headers)['result']
    current=json.loads(mcp('merchant.workflow',{})['content'][0]['text'])
    assert not mcp('merchant.workflow.save',{'revision':current['revision'],'data':current['data']}).get('isError')
    current=json.loads(mcp('merchant.workflow',{})['content'][0]['text'])
    changed=copy.deepcopy(current['data'])
    next(e for e in changed['transitions'] if e['id']=='complete')['id']='finish'
    gate=subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
    def send(statement):gate.stdin.write(statement+'\n');gate.stdin.flush()
    def blocked(by):return sql(f"SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND {by}=ANY(pg_blocking_pids(pid)) AND state='active' LIMIT 1;")
    def install():
        try:call('/api/apps',{'manifest':manifest},headers);return 200
        except AssertionError as e:
            assert e.args[0][1]==400,e
            return 400
    try:
        send(f"BEGIN; SELECT pg_backend_pid(); SELECT tenant FROM order_state_machines WHERE tenant='{tenant}' FOR UPDATE; SELECT 'ready';")
        gate_pid=int(gate.stdout.readline().strip())
        while True:
            line=gate.stdout.readline();assert line,'Workflow fixture stopped before readiness'
            if line.strip()=='ready':break
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            writer=pool.submit(mcp,'merchant.workflow.save',{'revision':current['revision'],'data':changed})
            for _ in range(300):
                writer_pid=blocked(gate_pid)
                if writer_pid:break
                time.sleep(.02)
            else:raise AssertionError('Native workflow did not reach its row fence')
            installer=pool.submit(install)
            for _ in range(300):
                if installer.done() or blocked(writer_pid):break
                time.sleep(.02)
            else:raise AssertionError('App install neither completed nor waited on workflow writer')
            send('COMMIT;')
            results=[400 if writer.result(timeout=30).get('isError') else 200,installer.result(timeout=30)]
        assert sorted(results)==[200,400],results
        print('PASS forced workflow/app interleaving cannot commit an incompatible native base and app replacement',flush=True)
    finally:
        if gate.poll() is None:send('ROLLBACK;\n\\q');gate.communicate(timeout=5)
