"""Bind prompt versions and admission fixtures without claiming semantic model accuracy."""
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'crates/cognition'


def check(manifest):
    seen = set()
    paths = set()
    for entry in manifest['templates']:
        name, version = entry['id'].split('@')
        assert re.fullmatch(r'[a-z-]+', name) and int(version) > 0
        assert entry['id'] not in seen
        seen.add(entry['id'])
        relative = f'prompts/{name}.v{version}.txt'
        assert entry['path'] == relative
        path = BASE / relative
        paths.add(path)
        text = path.read_text()
        assert text.startswith(f'[prompt:{entry["id"]}]\n')
        assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256']
    assert paths == set((BASE / 'prompts').glob('*.txt'))
    assert len(seen) >= 4


def main():
    manifest = json.loads((BASE / 'prompts/manifest.json').read_text())
    check(manifest)
    import copy
    for corrupt in ('digest', 'duplicate'):
        bad = copy.deepcopy(manifest)
        if corrupt == 'digest':
            bad['templates'][0]['sha256'] = '0' * 64
        else:
            bad['templates'].append(bad['templates'][0])
        try:
            check(bad)
        except AssertionError:
            pass
        else:
            raise AssertionError('Prompt governance accepted ' + corrupt)
    base = os.environ.get('PROMPT_BASE')
    if base:
        prefix = 'crates/cognition/'
        before = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', base, '--', prefix + 'prompts'], cwd=ROOT).decode().splitlines()
        for name in before:
            if not name.endswith('.txt'):
                continue
            old = subprocess.check_output(['git', 'show', f'{base}:{name}'], cwd=ROOT)
            assert (ROOT / name).exists() and (ROOT / name).read_bytes() == old, 'Keep published prompt revisions immutable; add a new version: ' + name
    corpus = json.loads((BASE / 'evals/tool-injection.v1.json').read_text())
    assert corpus['version'] == 1 and len(corpus['cases']) >= 8
    assert len({case['id'] for case in corpus['cases']}) == len(corpus['cases'])
    print('PASS prompt IDs, digests, corrupt-manifest controls and versioned parser corpus' + ('; immutable base revisions' if base else '; no base-history comparison requested'))


if __name__ == '__main__':
    main()
