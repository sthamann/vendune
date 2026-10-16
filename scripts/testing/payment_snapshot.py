"""Force a committed provider receipt between POS cart admission and its status read."""
import concurrent.futures
import os
import subprocess
import time
from urllib.parse import urlsplit
from testing.database import psql


def check_pos_snapshot(pos, cart, order_id, attempt_id, sql):
    assert all(c.isalnum() or c in '-_' for c in order_id + attempt_id)
    # Only this disposable fixture rewinds the already confirmed projection. No
    # provider command or outbox event is repeated; restore it in one transaction.
    def state(value, completed):
        return (
            f"UPDATE payment_attempts SET state='{value}' WHERE tenant='workshop' AND id='{attempt_id}';"
            "UPDATE orders SET data=jsonb_set(jsonb_set(data,'{payment,state}',"
            f"'\"{value}\"'::jsonb),'{{pos,completionEvent}}','{completed}'::jsonb)"
            f" WHERE tenant='workshop' AND id='{order_id}';"
            "UPDATE carts SET data=jsonb_set(carts.data,'{order}',o.data) FROM orders o"
            f" WHERE o.tenant='workshop' AND o.id='{order_id}' AND carts.tenant=o.tenant AND carts.id=o.cart_id;"
        )
    assert sql(f"SELECT state FROM payment_attempts WHERE tenant='workshop' AND id='{attempt_id}';") == 'captured'
    sql('BEGIN;' + state('ready', 'false') + 'COMMIT;')
    url = urlsplit(os.environ['DATABASE_URL'])
    command = psql(os.getenv('TEST_DB_CONTAINER', 'veyndo-postgres-1'), url.username or 'commerce', url.path[1:], '-Atq', '-v', 'ON_ERROR_STOP=1')
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    try:
        process.stdin.write("BEGIN; LOCK TABLE payment_attempts IN ACCESS EXCLUSIVE MODE; SELECT 'LOCKED';\n")
        process.stdin.flush()
        while process.stdout.readline().strip() != 'LOCKED':
            assert process.poll() is None, 'Snapshot fixture lock failed'
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(pos, 'payment', {'cartToken': cart['token']})
            for _ in range(100):
                if sql("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT EXISTS(SELECT 1 FROM payment_attempts p JOIN orders%'") != '0':
                    break
                time.sleep(.02)
            else:
                raise AssertionError('POS read never reached the controlled receipt interleaving')
            process.stdin.write(state('captured', 'true') + 'COMMIT;\\q\n')
            process.stdin.flush()
            process.wait(timeout=10)
            result = future.result(timeout=30)
            observed = {"payment": result['payment']['state'], "order": result['order']['payment']['state'], "completed": result['order']['pos'].get('completionEvent')}
            assert observed == {"payment": 'captured', "order": 'captured', "completed": True}, observed
    finally:
        if process.poll() is None:
            process.kill()
            process.wait()
        sql('BEGIN;' + state('captured', 'true') + 'COMMIT;')
    assert sql(f"SELECT count(*) FROM outbox WHERE tenant='workshop' AND kind='pos.sale_completed' AND data->>'orderId'='{order_id}';") == '1'
    print('PASS forced provider-commit interleaving returns one coherent POS payment/order snapshot without a second completion event')
