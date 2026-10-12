#!/usr/bin/env python3
"""Registered verification entry; marketplace fixture and assertions remain app-owned."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).resolve().parents[1]/'extensions/apps/marketplaces/tests/integration.py'),run_name='__main__')
