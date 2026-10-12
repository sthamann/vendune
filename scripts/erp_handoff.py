#!/usr/bin/env python3
"""Registered integration entry delegates reference-app behavior to its package-owned verification."""
import os,subprocess,sys
from testing.runtime import ROOT
subprocess.run([sys.executable,str(ROOT/'extensions/apps/erp-handoff/tests/integration.py')],env=os.environ,cwd=ROOT,check=True)
