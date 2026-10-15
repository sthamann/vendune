#!/usr/bin/env python3
"""Two authenticated roles, each through a real one-backend transaction pooler."""
import os
import runpy
from pathlib import Path
os.environ.update(TEST_SIGNED_SCOPE='1',TEST_TRANSACTION_POOLING='1')
runpy.run_path(str(Path(__file__).with_name('production_foundations.py')),run_name='__main__')
print('PASS separately authenticated SQL roles retain isolation through two real transaction poolers')
