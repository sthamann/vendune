#!/usr/bin/env python3
"""Keep app implementation in its package; preserve shared runtimes and exact safety boundaries."""
import json
import shutil
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def check(root):
    forbidden = [
        'src/connectors', 'src/payments/paypal.rs', 'src/payments/webhooks.rs',
        'frontend/src/admin/storyfronts', 'frontend/src/admin/styles/storyfronts.css',
        'frontend/src/storefront/analytics/ShopAnalytics.tsx',
        'frontend/src/admin/apps/EmailPanel.tsx', 'frontend/src/admin/apps/EmailProviderFields.tsx',
        'frontend/src/admin/apps/email-languages.ts', 'frontend/src/shared/i18n/email-i18n.ts',
    ]
    for path in forbidden:
        assert not (root / path).exists(), 'App implementation leaked into system folder: ' + path
    assert 'mod connectors;' not in (root / 'src/lib.rs').read_text(), 'Connector service linked into commerce library'
    loader = (root / 'frontend/src/admin/developer/app-recipes.ts').read_text()
    assert 'assistedManifest(' not in loader and 'modelWorkspace(' not in loader, 'Picker owns app-specific business definition'
    for folder in ['returns-workspace', 'product-advisor', 'erp-handoff']:
        package = root / 'extensions/apps' / folder
        assert (package / 'README.md').is_file(), 'Pattern has no package contract'
        manifest = json.loads((package / 'manifest.json').read_text())
        assert all(not a.get('mcp') for a in manifest['actions']), 'Pattern silently adds AI authority'
        if folder == 'returns-workspace':
            assert manifest['runtime'] == 'declarative'
            assert manifest['surfaces'][0]['location'] == 'admin.order'
            assert all(not e.get('publicRead') for e in manifest['entities'])
            assert all(a['handler'] in ['list', 'save'] and not a.get('public') for a in manifest['actions'])
    for package in (root / 'extensions/apps').iterdir():
        if not package.is_dir():
            continue
        for path in package.rglob('*'):
            assert path.resolve().is_relative_to(package.resolve()), 'App file escapes its package owner: ' + str(path)


def negative_controls():
    # Work only in throwaway fixtures: verify that CI rejects file leaks and escaping app symlinks.
    with tempfile.TemporaryDirectory() as folder:
        root = Path(folder)
        for name in ['src/lib.rs', 'frontend/src/admin/developer/app-recipes.ts']:
            destination = root / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, destination)
        for package in ['returns-workspace', 'product-advisor', 'erp-handoff']:
            shutil.copytree(ROOT / 'extensions/apps' / package, root / 'extensions/apps' / package)
        check(root)
        leaked = root / 'src/payments/paypal.rs'
        leaked.parent.mkdir(parents=True)
        leaked.write_text('leaked plugin implementation')
        try:
            check(root)
        except AssertionError as error:
            assert 'leaked' in str(error)
        else:
            raise AssertionError('Ownership gate accepted a core file leak')
        leaked.unlink()
        escaped = root / 'extensions/apps/returns-workspace/escaped.rs'
        escaped.symlink_to(root / 'src/lib.rs')
        try:
            check(root)
        except AssertionError as error:
            assert 'escapes' in str(error)
        else:
            raise AssertionError('Ownership gate accepted an escaping symlink')


if __name__ == '__main__':
    check(ROOT)
    negative_controls()
    print('PASS plugin ownership, private returns runtime, leak and symlink negative controls')
