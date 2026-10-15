#!/usr/bin/env python3
"""Repeat the real two-replica runtime path with separately authenticated tenant/system SQL roles."""
import os
import subprocess
import sys
# Activation is a coordinated database cutover, not temporary request state.
# Give this fixture its own database so later legacy/provider suites are unchanged.
subprocess.run(
    [sys.executable,'scripts/verify_integration.py','--container',os.environ.get('TEST_DB_CONTAINER','veyndo-postgres-1'),'--only','production_foundations'],
    env={**os.environ,'TEST_SIGNED_SCOPE':'1'},check=True,
)
