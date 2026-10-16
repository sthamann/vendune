#!/usr/bin/env python3
"""Choose prototype CI by the complete Git diff; unknown or sensitive changes retain full verification."""
import json
import os
from pathlib import PurePosixPath, Path
import re
import subprocess

SENSITIVE_UI = (
    'frontend/src/shared/api/', 'frontend/src/shared/apps/',
    'frontend/src/shared/auth/', 'frontend/src/shared/customer/',
    'frontend/src/shared/geography/', 'frontend/src/admin/shell/',
    'frontend/src/admin/team/', 'frontend/src/admin/environments/',
    'frontend/src/admin/orders/', 'frontend/src/admin/pos/',
    'frontend/src/admin/b2b/', 'frontend/src/admin/settings/',
    'frontend/src/storefront/checkout/', 'frontend/src/storefront/accounts/',
    'frontend/src/storefront/account/', 'frontend/src/storefront/customer/',
    'frontend/src/storefront/cart/', 'frontend/src/storefront/shell/',
    'frontend/src/storefront/legal/',
)
IMAGES = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.avif'}


def documentation(path):
    p = PurePosixPath(path)
    return (
        p.name in {'README.md', 'AGENTS.md', 'CHANGELOG.md', 'LICENSE'}
        or path.startswith('site/')
        or path in {'scripts/build_site.py', 'scripts/check_site.py'}
        or path.startswith('scripts/site/')
        or path.startswith('docs/') and (
            p.suffix in {'.md', '.txt', '.html', '.css', '.pdf'} | IMAGES
            or path.startswith('docs/evidence/') and p.suffix == '.json'
        )
    )


def presentation(path):
    p = PurePosixPath(path)
    if path.startswith('frontend/tests/unit/'):
        return p.suffix in {'.ts', '.tsx'}
    if path.startswith('frontend/src/'):
        if p.suffix == '.css':
            return True
        return p.suffix in {'.ts', '.tsx'} and not path.startswith(SENSITIVE_UI)
    if path.startswith('frontend/public/'):
        return p.suffix in IMAGES
    parts = p.parts
    return (len(parts) >= 5 and parts[:2] == ('extensions', 'apps')
            and parts[3] == 'studio' and p.suffix in {'.ts', '.tsx', '.css'})


def classify(paths):
    if not paths:
        return 'full'
    if all(documentation(p) for p in paths):
        return 'docs'
    if all(documentation(p) or presentation(p) for p in paths):
        return 'frontend'
    return 'full'


def changed_paths(repo, base, head):
    # Renames retain both the deleted and added names, so moving Rust into docs
    # cannot conceal the original backend change. NUL handles unusual filenames.
    if not all(re.fullmatch(r'[0-9a-fA-F]{40,64}', sha or '') for sha in (base, head)):
        raise ValueError('Missing or invalid commit identity')
    output = subprocess.check_output([
        'git', '-C', str(repo), 'diff', '--no-ext-diff', '--no-textconv',
        '--no-renames', '--name-only', '-z', base, head, '--',
    ], stderr=subprocess.PIPE)
    return [p for p in output.decode('utf-8', errors='strict').split('\0') if p]


def plan(repo, event_name, event, head):
    if event_name not in {'pull_request', 'push'}:
        return 'full', 'Scheduled, manual or unknown event: full verification'
    base = (event.get('pull_request', {}).get('base', {}).get('sha')
            if event_name == 'pull_request' else event.get('before'))
    try:
        paths = changed_paths(repo, base, head)
    except (ValueError, UnicodeError, subprocess.CalledProcessError, OSError):
        return 'full', 'Diff unavailable: full verification'
    return classify(paths), f'{len(paths)} changed paths; backend/unknown paths always select full'


def main():
    event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
    lane, reason = plan(Path.cwd(), os.environ.get('GITHUB_EVENT_NAME'), event,
                        os.environ.get('GITHUB_SHA'))
    print(f'Verification lane: {lane}. {reason}')
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write(f'lane={lane}\n')
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
        summary.write(f'## Verification scope: {lane}\n\n{reason}.\n\n'
                      'Fast docs/UI checks are not a new full-system coverage measurement.\n')


if __name__ == '__main__':
    main()
