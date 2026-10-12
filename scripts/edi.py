#!/usr/bin/env python3
"""Registered EDI entry delegates app behavior and fixtures to the plugin owner."""
import os,subprocess,sys
from testing.runtime import ROOT
subprocess.run([sys.executable,str(ROOT/'extensions/apps/edi/tests/integration.py')],env=os.environ,cwd=ROOT,check=True)
