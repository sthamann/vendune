#!/usr/bin/env python3
"""An actual Core startup survives a briefly unreachable isolated PostgreSQL endpoint."""
import json
import os
import select
import socket
import subprocess
import threading
import time
import urllib.request
from urllib.parse import urlsplit, urlunsplit
from testing.runtime import ROOT, stop

url = urlsplit(os.environ['DATABASE_URL'])
assert url.hostname in ('localhost', '127.0.0.1') and url.path.startswith('/commerce_quality_'), 'Isolated loopback database required'
def port():
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 0))
        return probe.getsockname()[1]
database_port, http_port = port(), port()
while http_port == database_port:
    http_port = port()
env = dict(os.environ)
# Preserve the actual separated logins and strict authority flags when this is
# repeated by signed_runtime; only their isolated loopback transport is delayed.
for key in ('DATABASE_URL', 'DATABASE_RUNTIME_URL', 'DATABASE_TENANT_URL', 'DATABASE_LISTENER_URL'):
    if env.get(key):
        source = urlsplit(env[key])
        assert source.hostname == url.hostname and source.path == url.path
        auth = source.netloc.rsplit('@', 1)[0]
        env[key] = urlunsplit(source._replace(netloc=f'{auth}@127.0.0.1:{database_port}'))
env.update(BIND_ADDR=f'127.0.0.1:{http_port}', PROCESS_ROLE='http', SEED_DEMO='false',
           BOOTSTRAP_MODE='serve', DB_POOL_WAIT_MS='100')
finished = threading.Event()
listener = socket.socket()
def bridge(client):
    upstream = None
    try:
        upstream = socket.create_connection((url.hostname, url.port or 5432), timeout=3)
        while not finished.is_set():
            for source in select.select([client, upstream], [], [], .2)[0]:
                chunk = source.recv(65536)
                if not chunk:
                    return
                (upstream if source is client else client).sendall(chunk)
    except OSError:
        pass
    finally:
        client.close()
        if upstream:
            upstream.close()
def accept():
    while not finished.is_set():
        try:
            client, _ = listener.accept()
            threading.Thread(target=bridge, args=(client,), daemon=True).start()
        except socket.timeout:
            continue
        except OSError:
            return
log_path = ROOT / 'artifacts/startup-recovery.log'
with log_path.open('w') as log:
    process = subprocess.Popen([str(ROOT / 'target/debug/veyndo')], cwd=ROOT, env=env, stdout=log, stderr=log)
    try:
        until = time.monotonic() + 2
        while time.monotonic() < until:
            assert process.poll() is None, 'Core crashed while PostgreSQL was temporarily unreachable'
            time.sleep(.05)
        assert 'retrying startup' in log_path.read_text(), 'Actual connection retry was not observed'
        listener.bind(('127.0.0.1', database_port)); listener.listen(); listener.settimeout(.2)
        threading.Thread(target=accept, daemon=True).start()
        for _ in range(100):
            assert process.poll() is None, 'Core exited before recovered readiness'
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{http_port}/health', timeout=1) as response:
                    assert response.status == 200
                break
            except OSError:
                time.sleep(.1)
        else:
            raise AssertionError('Core did not become ready after PostgreSQL recovered')
        request = urllib.request.Request(f'http://127.0.0.1:{http_port}/api/merchant/products', headers={
            'Authorization': 'Bearer ' + os.environ['MERCHANT_TOKEN'], 'x-tenant': 'workshop'})
        with urllib.request.urlopen(request, timeout=5) as response:
            assert json.load(response)['elements'], 'Recovered startup could not read the native catalog'
    finally:
        stop(process); finished.set(); listener.close()
print('PASS real startup survives a refused database endpoint, becomes ready in the same process and reads the native catalog after recovery')
