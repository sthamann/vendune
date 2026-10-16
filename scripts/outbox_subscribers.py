"""Real SQL failure/row-lock isolation, quarantine, explicit retry and cold worker continuation for native outbox cursors."""
import json,os,socket,subprocess,time,uuid,urllib.request,urllib.error
from testing.database import psql
from testing.runtime import ROOT,serve,stop
from testing.outbox_cases import migration_states,late_commit,retained_quarantine

def sql(text):
    return subprocess.check_output(psql(os.environ['DB_CONTAINER'],'commerce',os.environ['TEST_DATABASE'],'-XqAt','-v','ON_ERROR_STOP=1'),input="BEGIN;SELECT set_config('rac.system','on',true);"+text+";COMMIT;",text=True).strip().splitlines()[-1:][0]
def wait(test):
    for _ in range(100):
        if test():return
        time.sleep(.1)
    raise AssertionError('Native subscribers did not reach the required independent state')
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
base=f'http://127.0.0.1:{port}';log=(ROOT/'artifacts/outbox-subscribers.log').open('w');worker=None
marker='subscriber-'+uuid.uuid4().hex
try:
    migration_states()
    # A real failed audit projection. Other subscribers must advance independently.
    sql("CREATE FUNCTION fixture_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.data->>'fixture'='"+marker+"' THEN RAISE EXCEPTION 'synthetic audit failure';END IF;RETURN NEW;END $$;CREATE TRIGGER fixture_fail_audit BEFORE INSERT ON projections FOR EACH ROW EXECUTE FUNCTION fixture_fail_audit()")
    event=int(sql("INSERT INTO outbox(tenant,kind,data) VALUES('workshop','fixture.subscriber',jsonb_build_object('fixture','"+marker+"')) RETURNING id"))
    worker=serve({**os.environ,'PROCESS_ROLE':'all','BIND_ADDR':f'127.0.0.1:{port}','BOOTSTRAP_MODE':'serve'},base,log)
    def cursors():return json.loads(sql("SELECT jsonb_object_agg(subscriber,last_event_id) FROM outbox_checkpoints WHERE tenant='workshop'"))
    wait(lambda: all(cursors().get(k,0)>=event for k in ['cognition','apps','flows']))
    assert cursors()['audit']<event
    assert sql(f"SELECT delivered_at IS NULL FROM outbox WHERE id={event}")=='t'
    print('PASS failed audit projection leaves independent cognition/app/flow cursors advancing, while aggregate delivery stays pending',flush=True)
    # Accelerate only the disposable final retry count/clock, never production data.
    sql("UPDATE outbox_subscriber_failures SET attempts=7,available_at=now() WHERE tenant='workshop' AND subscriber='audit'")
    wait(lambda:sql("SELECT dead_letter_at IS NOT NULL FROM outbox_subscriber_failures WHERE tenant='workshop' AND subscriber='audit'")=='t')
    stop(worker);worker=None
    # Repair the disposable fixture, then use the ordinary authorized retry endpoint.
    sql('DROP TRIGGER fixture_fail_audit ON projections;DROP FUNCTION fixture_fail_audit()')
    worker=serve({**os.environ,'PROCESS_ROLE':'all','BIND_ADDR':f'127.0.0.1:{port}','BOOTSTRAP_MODE':'serve'},base,log)
    req=urllib.request.Request(base+f'/api/runtime/outbox/{event}/retry',data=b'{}',headers={'Authorization':'Bearer '+os.environ['MERCHANT_TOKEN'],'x-tenant':'workshop','Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=10) as r:assert json.load(r)['queued']
    wait(lambda:sql(f"SELECT delivered_at IS NOT NULL FROM outbox WHERE id={event}")=='t')
    assert sql(f"SELECT count(*) FROM projections WHERE event_id={event}")=='1'
    assert all(cursors()[k]>=event for k in ['cognition','apps','flows','audit'])
    print('PASS native quarantine retry after cold restart completes only the failed cursor; existing projections remain single',flush=True)
    held = retained_quarantine(sql, wait)
    req=urllib.request.Request(base+f'/api/runtime/outbox/{held}/retry',data=b'{}',headers={'Authorization':'Bearer '+os.environ['MERCHANT_TOKEN'],'x-tenant':'workshop','Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=10) as r:assert json.load(r)['queued']
    wait(lambda:sql(f"SELECT delivered_at IS NOT NULL AND dead_letter_at IS NULL FROM outbox WHERE id={held}")=='t')
    late_commit(sql,wait)
    delayed=int(sql("INSERT INTO outbox(tenant,kind,data,available_at) VALUES('workshop','fixture.deferred','{}',now()+interval '1 day') RETURNING id"))
    free=int(sql("INSERT INTO outbox(tenant,kind,data) VALUES('workshop','fixture.not-deferred','{}') RETURNING id"))
    wait(lambda:sql(f"SELECT subscriber_mask=15 FROM outbox WHERE id={free}")=='t')
    assert sql(f"SELECT subscriber_mask=0 AND delivered_at IS NULL FROM outbox WHERE id={delayed}")=='t'
    sql(f"UPDATE outbox SET dispatch_not_before=now() WHERE id={delayed}")
    wait(lambda:sql(f"SELECT subscriber_mask=15 AND delivered_at IS NOT NULL FROM outbox WHERE id={delayed}")=='t')
    print('PASS deliberate per-event deferral is retained without deferring unrelated events',flush=True)
    held=int(sql("INSERT INTO outbox(tenant,kind,data,dead_letter_at) VALUES('workshop','fixture.legacy-held','{}',now()) RETURNING id"))
    assert sql(f"SELECT dispatch_requires_retry AND subscriber_mask=0 FROM outbox WHERE id={held}")=='t'
    req=urllib.request.Request(base+f'/api/runtime/outbox/{held}/retry',data=b'{}',headers={'Authorization':'Bearer '+os.environ['MERCHANT_TOKEN'],'x-tenant':'workshop','Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=10) as r:assert json.load(r)['queued']
    wait(lambda:sql(f"SELECT subscriber_mask=15 AND delivered_at IS NOT NULL FROM outbox WHERE id={held}")=='t')
    print('PASS migrated-style held event requires and accepts an explicit authorized retry',flush=True)
finally:
    if worker:stop(worker)
    log.close()
