#!/usr/bin/env bash
# Start or stop the existing Rust image in an isolated local synthetic shop.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v docker >/dev/null || { echo 'Install Docker with Compose and start it first.' >&2; exit 1; }
case "${1:-start}" in start|stop) ;; *) echo 'Usage: ./scripts/try.sh [start|stop]' >&2; exit 1;; esac
mkdir -p .run
env_file=.run/try.env
if [ ! -f "$env_file" ]; then
  umask 077
  command -v openssl >/dev/null || { echo 'OpenSSL is required to generate a local database password.' >&2; exit 1; }
  printf 'DB_PASSWORD=%s\n' "$(openssl rand -hex 24)" > "$env_file"
fi
project="${TRY_PROJECT:-veyndo-try}"
compose=(docker compose --env-file "$env_file" -p "$project" -f compose.try.yaml)
if [ "${1:-start}" = stop ]; then
  "${compose[@]}" stop
  echo 'Stopped. Local orders and account data remain in the named volume.'
else
  "${compose[@]}" up -d --wait --wait-timeout 180
  echo "Open http://127.0.0.1:${TRY_PORT:-8788}/, then Studio → Create shop."
  echo 'Synthetic local tour. No model download or provider keys. Payments are simulated.'
  echo 'Stop with ./scripts/try.sh stop; start again to keep your data.'
fi
