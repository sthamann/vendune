#!/usr/bin/env python3
"""Two authenticated roles, each through a real one-backend transaction pooler."""
import os
import subprocess
import sys
subprocess.run(
    [sys.executable,'scripts/verify_integration.py','--container',os.environ.get('TEST_DB_CONTAINER','veyndo-postgres-1'),'--only','production_foundations'],
    env={**os.environ,'TEST_SIGNED_SCOPE':'1','TEST_TRANSACTION_POOLING':'1'},check=True,
)
print('PASS separately authenticated SQL roles retain isolation through two real transaction poolers')
