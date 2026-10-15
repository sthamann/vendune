#!/usr/bin/env python3
"""Repeat the real two-replica runtime path with separately authenticated tenant/system SQL roles."""
import os
import runpy
from pathlib import Path
os.environ['TEST_SIGNED_SCOPE']='1'
runpy.run_path(str(Path(__file__).with_name('production_foundations.py')),run_name='__main__')
