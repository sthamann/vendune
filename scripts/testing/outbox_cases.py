"""Disposable real-transaction counterexamples for subscriber migration and commit-order gaps."""
import os
import subprocess
from .database import psql
from .runtime import ROOT


def command():
    return psql(os.environ['DB_CONTAINER'], 'commerce', os.environ['TEST_DATABASE'], '-XqAt', '-v', 'ON_ERROR_STOP=1')


def migration_states():
    # Rehearse the real old-to-new DDL in one rollback-only transaction. Never
    # allow this fixture to run in a named UI/restored/production database.
    assert os.environ['TEST_DATABASE'].startswith('commerce_quality_')
    old = (ROOT / 'migrations/097-outbox-fairness.sql').read_text()
    old = old[old.index('CREATE FUNCTION register_outbox_tenant()'):old.index('CREATE TRIGGER register_outbox_tenant')].replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION', 1)
    migration = (ROOT / 'migrations/103-outbox-subscriber-checkpoints.sql').read_text().split('-- Correlation survives')[0]
    body = """
BEGIN;
SELECT set_config('rac.system','on',true);
DROP TRIGGER prepare_outbox_delivery ON outbox;
DROP FUNCTION prepare_outbox_delivery();
DROP TABLE outbox_subscriber_failures;
DROP TABLE outbox_checkpoints;
ALTER TABLE outbox DROP COLUMN subscriber_mask, DROP COLUMN dispatch_not_before, DROP COLUMN dispatch_requires_retry;
""" + old + """
INSERT INTO outbox(tenant,kind,data,dead_letter_at,available_at)
 VALUES('workshop','fixture.legacy-quarantine','{}',now(),now());
INSERT INTO outbox(tenant,kind,data,available_at)
 VALUES('workshop','fixture.legacy-delay','{}',now()+interval '1 day');
""" + migration + """
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM outbox WHERE kind='fixture.legacy-quarantine' AND dispatch_requires_retry AND subscriber_mask=0) THEN RAISE EXCEPTION 'Legacy quarantine was lost'; END IF;
 IF NOT EXISTS(SELECT 1 FROM outbox WHERE kind='fixture.legacy-delay' AND dispatch_not_before>now() AND NOT dispatch_requires_retry) THEN RAISE EXCEPTION 'Legacy delay was lost'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='outbox_subscriber_failures'::regclass AND confrelid='outbox'::regclass AND array_length(conkey,1)=2) THEN RAISE EXCEPTION 'Missing tenant-bound pending reference'; END IF;
END $$;
DO $$ DECLARE foreign_event bigint; BEGIN
 INSERT INTO tenants(id,name) VALUES('fixture-outbox-foreign','Synthetic outbox boundary');
 INSERT INTO outbox(tenant,kind,data) VALUES('fixture-outbox-foreign','fixture.foreign','{}') RETURNING id INTO foreign_event;
 BEGIN
  INSERT INTO outbox_subscriber_failures(tenant,event_id,subscriber) VALUES('workshop',foreign_event,'audit');
  RAISE EXCEPTION 'Foreign pending event was admitted';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;
END $$;
ROLLBACK;
"""
    subprocess.run(command(), input=body, text=True, check=True, stdout=subprocess.DEVNULL)
    print('PASS actual migration preserves old quarantine/delay and creates a tenant-bound reference; rehearsal rolled back', flush=True)


def late_commit(sql, wait):
    holder = subprocess.Popen(command(), stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        holder.stdin.write("BEGIN; SELECT set_config('rac.system','on',true); INSERT INTO outbox(tenant,kind,data) VALUES('workshop','fixture.late-commit','{}') RETURNING id;\n\\echo INSERT_HELD\n")
        holder.stdin.flush()
        earlier = None
        while True:
            line = holder.stdout.readline().strip()
            if line == 'INSERT_HELD':
                break
            if line.isdigit():
                earlier = int(line)
            if holder.poll() is not None:
                raise AssertionError('Held fixture transaction failed')
        assert earlier is not None
        later = int(sql("INSERT INTO outbox(tenant,kind,data) VALUES('workshop','fixture.early-commit','{}') RETURNING id"))
        assert later > earlier
        wait(lambda: sql(f"SELECT subscriber_mask=15 AND delivered_at IS NOT NULL FROM outbox WHERE id={later}") == 't')
        holder.stdin.write('COMMIT;\n'); holder.stdin.flush()
        holder.stdin.close(); holder.wait(timeout=10)
        assert holder.returncode == 0
        wait(lambda: sql(f"SELECT subscriber_mask=15 AND delivered_at IS NOT NULL FROM outbox WHERE id={earlier}") == 't')
        assert sql(f"SELECT count(*) FROM projections WHERE event_id IN ({earlier},{later})") == '2'
        print('PASS earlier sequence ID committed after all lanes passed a later ID is projected and exactly acknowledged', flush=True)
    finally:
        if holder.poll() is None:
            holder.terminate(); holder.wait(timeout=10)


def retained_quarantine(sql, wait):
    # Seed an audit lane already quarantined on this disposable poison event.
    # The real cognition consumer then fails its first attempt on the same event.
    # A fresh, retryable failure must not clear another subscriber's quarantine.
    event = int(sql("INSERT INTO outbox(tenant,kind,data,dead_letter_at) VALUES('workshop','order.placed','{}',now()) RETURNING id"))
    sql(f"UPDATE outbox SET dispatch_requires_retry=false WHERE id={event}; INSERT INTO outbox_subscriber_failures(tenant,event_id,subscriber,attempts,dead_letter_at) VALUES('workshop',{event},'audit',8,now())")
    wait(lambda: sql(f"SELECT attempts>0 FROM outbox_subscriber_failures WHERE tenant='workshop' AND subscriber='cognition' AND event_id={event}") == 't')
    assert sql(f"SELECT dead_letter_at IS NOT NULL FROM outbox WHERE id={event}") == 't', 'Another subscriber cleared the audit quarantine'
    # Repair only the synthetic input via the consumer's existing receipt fence.
    sql(f"INSERT INTO knowledge_receipts(tenant,event_id) VALUES('workshop',{event}) ON CONFLICT DO NOTHING")
    print('PASS retryable subscriber failure retains another subscriber quarantine', flush=True)
    return event
