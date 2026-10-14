#!/usr/bin/env python3
"""Save one private GitHub snapshot; overlapping traffic windows are never summed."""
import argparse
import datetime
import json
from pathlib import Path
import re
import subprocess


def read_api(path):
    result = subprocess.run(["gh", "api", path], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f"GitHub read failed for {path}; check gh authentication and repository traffic access")
    return json.loads(result.stdout)


def snapshot(repo):
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
        raise ValueError("Use owner/repository")
    root = "repos/" + repo
    metadata = read_api(root)
    views, clones = read_api(root + "/traffic/views"), read_api(root + "/traffic/clones")
    return {
        "collectedAtUTC": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "repository": repo,
        "stars": metadata["stargazers_count"],
        "forks": metadata["forks_count"],
        "views": views,
        "reportedClones": clones,
        "referrers": read_api(root + "/traffic/popular/referrers"),
        "notes": [
            "Traffic is GitHub's rolling 14-day window; retain snapshots before it expires.",
            "Unique visitors are not identified external users; maintainer visits may be included.",
            "Clones, including reported uniques, are not installations or active users.",
            "Do not add overlapping window totals or infer per-channel conversion from these aggregates.",
            "Record completed tours, returns and external contributions separately from voluntary reports.",
            "Keep this traffic export private; do not commit it to the public repository.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default="sthamann/veyndo")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        data = snapshot(args.repo)
    except (OSError, RuntimeError, ValueError) as error:
        parser.exit(1, str(error) + "\n")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    # Never overwrite an earlier observation: retain one dated file per collection.
    with args.output.open("x", encoding="utf-8") as stream:
        json.dump(data, stream, indent=2)
        stream.write("\n")
    print(f"Saved private snapshot: {args.output}")
    print(f"Stars {data['stars']}; forks {data['forks']}; GitHub views {data['views']['count']}; reported unique visitors {data['views']['uniques']}")


if __name__ == "__main__":
    main()
