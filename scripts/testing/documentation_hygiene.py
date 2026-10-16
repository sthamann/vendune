"""Keep the README an entrance, status canonical, and scoped instructions bounded; negative controls reject former regressions."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[2]

def readme_errors(text):
    errors=[]
    if len(text.splitlines())>120 or len(text.encode())>8500:errors.append('README exceeds entrance budget (120 lines / 8.5 KiB)')
    if re.search(r'(?i)\bPR\s*#?\s*\d+|\b20\d\d-\d\d-\d\d\b|^##? (?:Changelog|Release notes|Implementation notes)',text,re.M):errors.append('Move release/PR notes to CHANGELOG.md')
    if 'docs/status.md' not in text:errors.append('README must link canonical status')
    license=text.split('## License\n')
    if len(license)!=2 or len(license[-1].strip().splitlines())>8:errors.append('License must be the final bounded section; app/PR notes belong in guides and changelog')
    return errors

def main():
    text=(ROOT/'README.md').read_text();errors=readme_errors(text)
    assert not errors,errors
    assert readme_errors(text+'\nManaged app models now use fixed storage.\nAdditional implementation note.\n')
    assert readme_errors(text.replace('## Try one complete round','PR 123 deployed\n\n## Try one complete round'))
    assert readme_errors(text+'\n'*130)
    root=(ROOT/'AGENTS.md').read_text();assert len(root.encode())<=12000,'Split new owner rules instead of growing root AGENTS.md'
    for path in ROOT.rglob('AGENTS.md'):
        if any(p in path.parts for p in ['node_modules','target','.git']):continue
        assert len(path.read_bytes())<=16000,(path,'Split scoped rules by owner')
    nav=json.loads((ROOT/'site/docs-navigation.json').read_text())
    sources=[s for g in nav['groups'] for s in g['sources']]
    assert sources[0]=='docs/status.md' and sources.count('docs/status.md')==1
    assert 'status.md' in (ROOT/'docs/current-release.md').read_text().splitlines()[2]
    print('PASS bounded README, release-note negative controls, scoped instructions and canonical status entry')
if __name__=='__main__':main()
