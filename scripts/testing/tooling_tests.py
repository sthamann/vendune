#!/usr/bin/env python3
"""Verification helpers reject coverage gaps and emit literal CI environment values."""
import json
import tempfile
import copy
from pathlib import Path
import subprocess
import sys
import unittest
import socket
from unittest.mock import patch
import runtime

sys.path.insert(0, str(Path(__file__).resolve().parent))
from coverage_report import read_frontend, read_reports, violations
from source_inventory import responsibility


class OwnedRuntime(unittest.TestCase):
    def test_occupied_port_cannot_masquerade_as_the_child_under_test(self):
        with socket.socket() as listener:
            listener.bind(('127.0.0.1',0)); listener.listen()
            with patch.object(runtime.subprocess,'Popen') as spawn:
                with self.assertRaisesRegex(RuntimeError,'already occupied'):
                    runtime.serve({},f'http://127.0.0.1:{listener.getsockname()[1]}',None)
                spawn.assert_not_called()


class CoverageGates(unittest.TestCase):
    def setUp(self):
        self.metrics = {'frontend': {'lines': 80, 'branches': 70}}
        self.modules = {'transport.ts': {k: 100 for k in ('lines', 'branches', 'functions', 'statements')}}
        self.policy = {'minimums': {'frontend': {'lines': 80, 'branches': 70}}, 'full_modules': ['transport.ts']}

    def test_passes_exact_floor(self):
        self.assertEqual(violations(self.metrics, self.modules, self.policy), [])

    def test_rejects_each_coverage_regression(self):
        for metric in self.metrics['frontend']:
            changed = copy.deepcopy(self.metrics)
            changed['frontend'][metric] -= 1
            self.assertTrue(violations(changed, self.modules, self.policy))

    def test_rejects_missing_fully_covered_module(self):
        self.assertTrue(violations(self.metrics, {}, self.policy))

    def test_rejects_uncovered_branch_in_full_module(self):
        self.modules['transport.ts']['branches'] = 99
        self.assertTrue(violations(self.metrics, self.modules, self.policy))

    def test_full_claim_rejects_unmeasured_scopes_even_with_perfect_totals(self):
        self.metrics['frontend'] = {'lines': 100, 'branches': 100}
        errors = violations(self.metrics, self.modules, self.policy, True)
        self.assertTrue(any('Unmeasured scope' in e for e in errors))

    def test_reports_include_untouched_source_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'frontend/src/shared/api/fixture.ts'
            source.parent.mkdir(parents=True)
            source.write_text('export const fixture = 1;')
            python_source = root / 'scripts/fixture.py'
            python_source.parent.mkdir()
            python_source.write_text('fixture = 1')
            scores = {key: {'pct': 100} for key in ('lines', 'branches', 'functions', 'statements')}
            app_source = root / 'extensions/apps/example/studio/View.tsx'
            app_source.parent.mkdir(parents=True)
            app_source.write_text('export const View = () => null;')
            frontend = {'total': scores, str(source): scores, str(app_source): scores}
            rust = {'data': [{'totals': {key: {'percent': 100} for key in ('lines', 'functions', 'regions')}, 'files': []}]}
            python = {'totals': {'covered_lines': 1, 'num_statements': 1, 'covered_branches': 1, 'num_branches': 1},
                      'files': {'scripts/fixture.py': {'summary': {'covered_lines': 1}}}}
            files = {'frontend/coverage/coverage-summary.json': frontend, 'artifacts/coverage/rust.json': rust, 'artifacts/coverage/python.json': python}
            for path, value in files.items():
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(json.dumps(value))
            metrics, modules, missing = read_reports(root)
            (root / 'artifacts/coverage/rust.json').unlink()
            ui_metrics, ui_modules, _ = read_frontend(root)
            self.assertEqual(set(ui_metrics), {'frontend'})
            self.assertEqual(ui_modules, modules)
            (root / 'artifacts/coverage/rust.json').write_text(json.dumps(rust))
            self.assertEqual(metrics['frontend']['lines'], 100)
            self.assertIn('frontend/src/shared/api/fixture.ts', modules)
            self.assertIn('extensions/apps/example/studio/View.tsx', modules)
            omitted_app = dict(frontend)
            del omitted_app[str(app_source)]
            (root / 'frontend/coverage/coverage-summary.json').write_text(json.dumps(omitted_app))
            with self.assertRaisesRegex(ValueError, 'extensions/apps/example/studio/View.tsx'):
                read_reports(root)
            (root / 'frontend/coverage/coverage-summary.json').write_text(json.dumps(frontend))
            self.assertEqual(missing['frontend'], [])
            (source.parent / 'untested.ts').write_text('export const untested = 2;')
            with self.assertRaisesRegex(ValueError, 'untested.ts'):
                read_reports(root)

    def test_reports_cannot_omit_a_python_service(self):
        # The manifest check in read_reports is exercised by the synthetic report above.
        # Check its independent Python source scope with a real temporary service file.
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'frontend/coverage').mkdir(parents=True)
            (root / 'artifacts/coverage').mkdir(parents=True)
            (root / 'extensions/services').mkdir(parents=True)
            (root / 'extensions/services/missing.py').write_text('value = 1')
            scores = {key: {'pct': 100} for key in ('lines', 'branches', 'functions', 'statements')}
            (root / 'frontend/coverage/coverage-summary.json').write_text(json.dumps({'total': scores}))
            (root / 'artifacts/coverage/rust.json').write_text(json.dumps({'data': [{'totals': {key: {'percent': 100} for key in ('lines', 'functions', 'regions')}, 'files': []}]}))
            (root / 'artifacts/coverage/python.json').write_text(json.dumps({'totals': {'covered_lines': 0, 'num_statements': 0, 'covered_branches': 0, 'num_branches': 0}, 'files': {}}))
            with self.assertRaisesRegex(ValueError, 'missing.py'):
                read_reports(root)

    def test_inventory_reads_the_actual_style_wasm_and_html_contracts(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'fixture'
            cases = [('/* Ordered Studio layout. */', 'Ordered Studio layout.'),
                     ('/** Scoped request transport. */', 'Scoped request transport.'),
                     (';; Quantity guard.\n(module)', 'Quantity guard.'),
                     ('<html><title>Product Lab</title></html>', 'Isolated app interface: Product Lab'),
                     ('<!doctype html>', 'Independent app entry; see extensions/README.md for its public contract.')]
            for source, expected in cases:
                path.write_text(source)
                self.assertEqual(responsibility(path), expected)

    def test_env_conversion_does_not_execute_shell_text(self):
        helper = Path(__file__).with_name('coverage_env.py')
        result = subprocess.run([sys.executable, str(helper)], input="RUSTFLAGS='-C instrument-coverage'\nLLVM_PROFILE_FILE='/tmp/a $(false).profraw'\n", text=True, capture_output=True, check=True)
        self.assertEqual(result.stdout, 'RUSTFLAGS=-C instrument-coverage\nLLVM_PROFILE_FILE=/tmp/a $(false).profraw\n')

    def test_env_conversion_rejects_multiline_and_invalid_assignments(self):
        helper = Path(__file__).with_name('coverage_env.py')
        for value in ["BAD-NAME='value'", "RUSTFLAGS='one\ntwo'", "RUSTFLAGS=one two"]:
            result = subprocess.run([sys.executable, str(helper)], input=value, text=True, capture_output=True)
            self.assertNotEqual(result.returncode, 0)


class PlaygroundSafety(unittest.TestCase):
    def test_setup_refuses_remote_origins_before_credentials_are_used(self):
        sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
        from playground import Client
        for origin in ('https://example.com', 'http://127.0.0.1.evil.test', 'http://user:secret@localhost', 'http://localhost/path', 'http://localhost?token=secret'):
            with self.subTest(origin=origin), self.assertRaises(ValueError):
                Client(origin)
        self.assertEqual(Client('http://127.0.0.1:8787/').base, 'http://127.0.0.1:8787')

    def test_private_state_permissions_and_symlink_refusal(self):
        sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
        from playground import private_write
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'state.json'
            target.write_text('old')
            target.chmod(0o644)
            private_write(target, {'workspace': 'playground-example'})
            self.assertEqual(target.stat().st_mode & 0o777, 0o600)
            link = Path(directory) / 'link.json'
            link.symlink_to(target)
            with self.assertRaises(OSError):
                private_write(link, {'workspace': 'wrong'})
            self.assertEqual(json.loads(target.read_text())['workspace'], 'playground-example')


class HostingChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

    def test_edge_denial_never_becomes_a_successful_application_gate(self):
        import io
        import contextlib
        from hosting_check import check
        calls = []
        def opener(request, timeout):
            calls.append(request)
            response = io.BytesIO(b'{"status":"ok"}' if len(calls) == 1 else
                                  b'{"error":"unauthorized"}' if len(calls) == 2 else b'Forbidden')
            response.status = [200, 401, 403][len(calls) - 1]
            response.headers = {"Content-Type": "text/plain" if len(calls) == 3 else "application/json"}
            return response
        output = io.StringIO()
        with contextlib.redirect_stdout(output), self.assertRaisesRegex(ValueError, "does not verify the API gate"):
            check("https://fixture.example", opener)
        self.assertNotIn("gates verified", output.getvalue())
        probe = json.loads(calls[-1].data)
        self.assertEqual(set(probe), {"email", "name", "password", "workspaceId"})
        self.assertNotIn('@', probe['email'])
        self.assertEqual(probe['password'], '')
        self.assertEqual(calls[-1].get_method(), "POST")

    def test_status_shape_and_size_failures_have_bounded_diagnostics(self):
        import io
        from hosting_check import reply
        for status, payload, message in [(422, b'{}', "expected HTTP 403"),
                                         (403, b'[]', "JSON object required"),
                                         (403, b'x' * 65537, "exceeds 64 KiB")]:
            with self.subTest(status=status, message=message):
                response = io.BytesIO(payload)
                response.status = status
                response.headers = {"Content-Type": "application/json"}
                with self.assertRaisesRegex(ValueError, message):
                    reply(response, "/api/auth/register", 403)

    def test_expected_json_health_and_denials_keep_the_original_success_contract(self):
        import io
        from hosting_check import reply
        for path, status, data in [("/health", 200, {"status": "ok"}),
                                   ("/api/platform/overview", 401, {"error": "unauthorized"}),
                                   ("/api/auth/register", 403, {"error": "forbidden"})]:
            with self.subTest(path=path):
                response = io.BytesIO(json.dumps(data).encode())
                response.status = status
                response.headers = {"Content-Type": "application/json"}
                self.assertEqual(reply(response, path, status), status)


if __name__ == '__main__':
    unittest.main()
