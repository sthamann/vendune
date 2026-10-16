#!/usr/bin/env python3
"""Publish separate all-source coverage totals, untested files and enforce reviewed minimums.

The --require-full audit rejects gaps and unmeasured runtime scopes. Normal CI
uses the checked-in regression floors; passing those floors never means 100%.
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POLICY = ROOT / 'scripts/testing/coverage-policy.json'
UNMEASURED = [
    'Browser guest SDK/example-app JavaScript is contract-tested, not included in V8 percentages.',
    'CSS layouts require browser checks; statement coverage cannot measure visual correctness.',
    'Wasm examples have contract tests; no instruction/branch coverage collector is configured.',
    'Real provider credentials, external model behavior and production deployment are not covered by synthetic fixtures.',
]


def read_frontend(root):
    frontend = json.loads((root / 'frontend/coverage/coverage-summary.json').read_text())
    metrics = {'frontend': {k: frontend['total'][k]['pct'] for k in ('lines', 'branches', 'functions', 'statements')}}
    modules = {}
    for filename, data in frontend.items():
        if filename == 'total':
            continue
        owner = next((prefix for prefix in ('frontend/src/', 'extensions/apps/') if prefix in filename), None)
        if owner is None:
            raise ValueError('Coverage source has no frontend/app owner: ' + filename)
        relative = filename[filename.index(owner):]
        modules[relative] = {k: data[k]['pct'] for k in ('lines', 'branches', 'functions', 'statements')}
    expected_frontend = {p.relative_to(root).as_posix() for directory in ('frontend/src', 'extensions/apps') for p in (root / directory).rglob('*') if p.suffix in {'.ts', '.tsx'} and 'tests' not in p.relative_to(root).parts}
    omitted = expected_frontend - modules.keys()
    if omitted:
        raise ValueError('Coverage report omits source files: ' + ', '.join(sorted(omitted)))
    return metrics, modules, [name for name, data in modules.items() if data['lines'] == 0]



def rust_gaps(root, files):
    """Keep extracted libraries and app-owned Rust visible in unmeasured gaps."""
    emitted = {Path(f['filename']).resolve() for f in files}
    return sorted(p.relative_to(root).as_posix()
                  for directory in ('src', 'crates', 'extensions')
                  for p in (root / directory).rglob('*.rs')
                  if p.resolve() not in emitted)


def read_reports(root):
    metrics, modules, missing_frontend = read_frontend(root)
    rust = json.loads((root / 'artifacts/coverage/rust.json').read_text())['data'][0]
    python = json.loads((root / 'artifacts/coverage/python.json').read_text())
    metrics.update({
        'rust': {k: rust['totals'][k]['percent'] for k in ('lines', 'functions', 'regions')},
        'python': {'lines': python['totals']['covered_lines'] / max(1, python['totals']['num_statements']) * 100,
                   'branches': python['totals']['covered_branches'] / max(1, python['totals']['num_branches']) * 100},
    })
    expected_python = {p.relative_to(root).as_posix() for directory in ('extensions/services', 'extensions/apps', 'scripts') for p in (root / directory).rglob('*.py') if '__pycache__' not in p.parts}
    omitted = expected_python - python['files'].keys()
    if omitted:
        raise ValueError('Coverage report omits source files: ' + ', '.join(sorted(omitted)))
    missing = {'frontend': missing_frontend,
               'rust': [f['filename'].split('/src/', 1)[-1] for f in rust['files'] if f['summary']['lines']['covered'] == 0],
               'python': [name for name, data in python['files'].items() if data['summary']['covered_lines'] == 0]}
    return metrics, modules, missing


def violations(metrics, modules, policy, require_full=False):
    errors = []
    for scope, values in metrics.items():
        for metric, value in values.items():
            minimum = 100 if require_full else policy['minimums'][scope][metric]
            if value + 0.001 < minimum:
                errors.append(f'{scope} {metric}: {value:.2f}% < {minimum}%')
    for path in policy['full_modules']:
        for metric in ('lines', 'branches', 'functions', 'statements'):
            if modules.get(path, {}).get(metric, 0) < 100:
                errors.append(f'{path} {metric}: requires 100%')
    if require_full:
        errors += ['Unmeasured scope: ' + scope for scope in UNMEASURED]
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--require-full', action='store_true')
    parser.add_argument('--frontend-only', action='store_true', help='Enforce unchanged frontend floors without claiming Rust/Python measurements')
    args = parser.parse_args()
    if args.frontend_only:
        if args.require_full:
            parser.error('--require-full cannot be combined with --frontend-only')
        metrics, modules, missing = read_frontend(ROOT)
        errors = violations(metrics, modules, json.loads(POLICY.read_text()))
        output = ROOT / 'artifacts/coverage'
        output.mkdir(exist_ok=True, parents=True)
        (output / 'frontend-summary.json').write_text(json.dumps({'metrics': metrics,
            'zero_hit_modules': missing, 'errors': errors, 'measuredScopes': ['frontend'],
            'entireSystemFullyCovered': False}, indent=2) + '\n')
        print(json.dumps(metrics, indent=2))
        if errors:
            raise SystemExit('\n'.join(errors))
        print('PASS unchanged frontend coverage floors and full-module gates; Rust/Python not measured')
        return
    metrics, modules, missing = read_reports(ROOT)
    errors = violations(metrics, modules, json.loads(POLICY.read_text()), args.require_full)
    output = ROOT / 'artifacts/coverage'
    output.mkdir(exist_ok=True)
    result = {'metrics': metrics, 'zero_hit_modules': missing, 'unmeasured': UNMEASURED,
              'errors': errors, 'entireSystemFullyCovered': False}
    rust_report = json.loads((ROOT / 'artifacts/coverage/rust.json').read_text())['data'][0]
    result['rust_not_emitted_by_compiler'] = rust_gaps(ROOT, rust_report['files'])
    (output / 'summary.json').write_text(json.dumps(result, indent=2) + '\n')
    lines = ['# Measured coverage and open gaps', '',
             'These are separate source scopes, not a combined quality score or proof of bug freedom.', '',
             '| Scope | Metric | Coverage |', '|---|---|---|']
    for scope, values in metrics.items():
        lines += [f'| {scope} | {key} | {value:.2f}% |' for key, value in values.items()]
    lines += ['', '## Unmeasured scopes', ''] + ['- ' + s for s in UNMEASURED]
    lines += ['', '## Rust files without emitted coverage regions', '',
              'These include import registries and test-only modules. Their absence is reported, not treated as a covered module.']
    lines += ['- `' + p + '`' for p in result['rust_not_emitted_by_compiler']]
    for scope, paths in missing.items():
        lines += ['', '## Modules with no recorded hits: ' + scope, '']
        lines += ['- `' + p + '`' for p in paths] or ['None. This does not mean all branches were tested.']
    lines += ['', '## Gate result', ''] + (errors or ['Regression floors passed. Full-system 100% coverage is not achieved.'])
    (output / 'summary.md').write_text('\n'.join(lines) + '\n')
    print(json.dumps(metrics, indent=2))
    if errors:
        raise SystemExit('\n'.join(errors))
    print('PASS reviewed coverage floors and 100% transport/health modules; full-system gaps remain explicit')


if __name__ == '__main__':
    main()
