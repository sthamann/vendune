"""Check real Rust include! inputs against the production image's explicit build COPY set."""
from pathlib import Path
import re
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[2]


def build_inputs(dockerfile):
    copying = False
    inputs = []
    for line in dockerfile.splitlines():
        if line.startswith('FROM '):
            copying = line.split()[1].startswith('rust:')
        elif copying and line.startswith('COPY '):
            inputs.extend(ROOT / value for value in line.split()[1:-1])
    return inputs


def copied(target, inputs):
    return any(target == p.resolve() or (p.is_dir() and target.is_relative_to(p.resolve())) for p in inputs)


def missing_workspace(dockerfile):
    inputs = build_inputs(dockerfile)
    manifest = tomllib.loads((ROOT / 'Cargo.toml').read_text())
    required = [ROOT / 'Cargo.toml', ROOT / 'Cargo.lock', ROOT / 'LICENSE']
    for pattern in manifest.get('workspace', {}).get('members', []):
        if pattern == '.':
            continue
        for member in ROOT.glob(pattern):
            if member == ROOT or not member.is_dir():
                continue
            required.extend([member / 'Cargo.toml', *member.rglob('*.rs')])
    return [str(p.relative_to(ROOT)) for p in required if not copied(p.resolve(), inputs)]


def missing_inputs(dockerfile):
    inputs = build_inputs(dockerfile)
    missing = []
    for source in [*(ROOT / 'src').rglob('*.rs'), *(ROOT / 'crates').rglob('*.rs'), *(ROOT / 'extensions').rglob('*.rs')]:
        for value in re.findall(r'include_(?:str|bytes)!\s*\(\s*"([^"\n]+)"', source.read_text()):
            target = (source.parent / value).resolve()
            if not target.is_file() or not copied(target, inputs):
                missing.append(str(target.relative_to(ROOT)))
    return sorted(set(missing))


def main():
    dockerfile = (ROOT / 'deploy/Dockerfile').read_text()
    missing = missing_inputs(dockerfile)
    if missing:
        raise SystemExit('Production Rust image is missing compile-time inputs:\n' + '\n'.join(missing))
    # Reproduce the public build failure: source-checkout tests alone could not find it.
    broken = dockerfile.replace('COPY reference/app-manifests/ reference/app-manifests/\n', '')
    lost = missing_inputs(broken)
    assert lost and all(p.startswith('reference/app-manifests/') for p in lost), lost
    missing_apps = missing_inputs(dockerfile.replace('COPY extensions/ extensions/\n', ''))
    assert missing_apps and any(p.startswith('extensions/apps/') for p in missing_apps), missing_apps
    images = [ROOT / 'deploy/Dockerfile', *ROOT.glob('extensions/**/Dockerfile')]
    count = 0
    for image in images:
        text = image.read_text()
        if not build_inputs(text):
            continue
        assert not missing_workspace(text), (str(image.relative_to(ROOT)), missing_workspace(text))
        if '[workspace]' in (ROOT / 'Cargo.toml').read_text():
            broken = '\n'.join(line for line in text.splitlines() if not line.startswith('COPY crates'))
            assert missing_workspace(broken), ('Missing workspace COPY not detected', image)
        count += 1
    print(f'PASS {count} Rust image contexts include every Cargo workspace member; missing-crate negative controls')
    print(f'PASS production Rust image inputs; historical manifests and app package resources required ({len(lost)} legacy files)')


if __name__ == '__main__':
    main()
