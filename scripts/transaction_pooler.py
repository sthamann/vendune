#!/usr/bin/env python3
"""Repeat the real strict-runtime and multi-replica regressions through a one-backend transaction pooler."""
import os
import subprocess
import sys
subprocess.run(
    [sys.executable,'scripts/verify_integration.py','--container',os.environ.get('TEST_DB_CONTAINER','veyndo-postgres-1'),'--only','production_foundations','durable_agents'],
    env={**os.environ,'TEST_TRANSACTION_POOLING':'1'},check=True,
)
print('PASS real one-backend PgBouncer: quota, durable create/resume/restart and direct commit-notification listeners')
