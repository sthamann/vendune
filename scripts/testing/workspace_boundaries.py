"""Check the real Cargo graph and reject domain dependency broadening, not just file sizes."""
import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
ALLOWED={'veyndo-kernel':set(),'veyndo-runtime':set(),'veyndo-commerce':{'veyndo-kernel'},'veyndo-apps':{'veyndo-kernel'},'veyndo-cognition':{'veyndo-runtime'}}
FORBIDDEN={'veyndo-kernel':{'sqlx','reqwest','tokio','wasmtime'},'veyndo-commerce':{'sqlx','reqwest','tokio','wasmtime'},'veyndo-apps':{'sqlx','reqwest','axum'}}
def check(packages):
    for p in packages:
        if p['name'] not in ALLOWED:continue
        dependencies={d['name'] for d in p['dependencies']}
        assert not dependencies&FORBIDDEN.get(p['name'],set()),(p['name'],'Forbidden authority dependency')
        assert {d for d in dependencies if d.startswith('veyndo')}<=ALLOWED[p['name']],(p['name'],'Invalid domain dependency')
        assert Path(p['manifest_path']).parent.is_relative_to(ROOT/'crates')
        assert all(not t['src_path'].endswith('/src/lib.rs') or str(ROOT/'crates') in t['src_path'] for t in p['targets'])

def main():
    data=json.loads(subprocess.check_output(['cargo','metadata','--no-deps','--format-version','1'],cwd=ROOT));packages=data['packages'];check(packages)
    assert set(ALLOWED)<={p['name'] for p in packages}
    for name,dependency in [('veyndo-apps','sqlx'),('veyndo-commerce','veyndo-cognition'),('veyndo-cognition','veyndo')]:
        import copy
        broken=copy.deepcopy(packages);next(p for p in broken if p['name']==name)['dependencies'].append({'name':dependency})
        try:check(broken)
        except AssertionError:pass
        else:raise AssertionError('Workspace boundary silently accepted '+name+' -> '+dependency)
    print('PASS real Cargo domain DAG; app SQL, commerce cognition and root-backedge negative controls')
if __name__=='__main__':main()
