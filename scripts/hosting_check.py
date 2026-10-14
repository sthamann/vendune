#!/usr/bin/env python3
"""Check a deployed experimental SaaS HTTPS origin without credentials or real orders."""

import argparse, json, urllib.request, urllib.error, urllib.parse


def reply(response, path, expected):
    status = response.status
    kind = response.headers.get("Content-Type", "unspecified").split(";", 1)[0]
    if status != expected:
        raise ValueError(f"{path}: expected HTTP {expected}, received HTTP {status} ({kind}); API gate not verified")
    payload = response.read(65537)
    if len(payload) > 65536:
        raise ValueError(f"{path}: response exceeds 64 KiB; API gate not verified")
    try:
        data = json.loads(payload)
    except (ValueError, UnicodeDecodeError) as error:
        raise ValueError(f"{path}: HTTP {status} returned {kind} instead of a JSON object; gateway or framework response does not verify the API gate") from error
    if not isinstance(data, dict):
        raise ValueError(f"{path}: JSON object required; API gate not verified")
    if path == "/health" and not (data.get("database") == "postgresql+apache-age+pgvector" or data.get("status") == "ok"):
        raise ValueError("Unexpected health response")
    return status


def check(base, opener=urllib.request.urlopen):
    for path, method, body, expected in [
        ("/health", "GET", None, 200),
        ("/api/platform/overview", "GET", None, 401),
        ("/api/auth/register", "POST", {}, 403),
    ]:
        request = urllib.request.Request(
            base + path, data=None if body is None else json.dumps(body).encode(),
            headers={"Content-Type": "application/json"}, method=method,
        )
        try:
            response = opener(request, timeout=30)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            status = reply(response, path, expected)
        print("PASS", path, status)
    print("Anonymous HTTPS/API gates verified. Operator sign-in, isolated shop creation, customer checkout and provider credentials still require an authenticated release check.")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--origin", required=True)
    a = p.parse_args()
    u = urllib.parse.urlparse(a.origin)
    if u.scheme != "https" or not u.hostname or u.username or u.password or u.query or u.fragment or u.path not in ["", "/"]:
        p.error("Public HTTPS origin required")
    try:
        check(a.origin.rstrip("/"))
    except (ValueError, urllib.error.URLError, TimeoutError) as error:
        raise SystemExit("FAIL " + str(error)) from None


if __name__ == "__main__":
    main()
