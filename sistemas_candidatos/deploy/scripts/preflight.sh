#!/usr/bin/env bash
# Read-only checks on the prepared target. No installation or migration is performed.
set -uo pipefail
FAILED=0
check() {
    local name="$1"; shift
    if "$@"; then printf 'OK: %s\n' "$name"; else printf 'FAILED: %s\n' "$name" >&2; FAILED=1; fi
}
version() {
    local expression="$1"; shift
    "$@" 2>&1 | grep -E "$expression"
}
loopback_only() {
    local port="$1" addresses address
    addresses=$(ss -H -ltn "sport = :$port" | awk '{print $4}') || return 1
    [[ -n "$addresses" ]] || return 1
    while IFS= read -r address; do
        case "$address" in "127.0.0.1:$port"|"[::1]:$port"|"::1:$port") ;; *) return 1;; esac
    done <<< "$addresses"
}
check 'Debian 13' bash -c '. /etc/os-release; [[ "$ID" == debian && "$VERSION_ID" == 13 ]]'
check 'Python 3.13' version '^Python 3\.13\.' python3.13 --version
check 'Node compatible with Vite 8' node -e 'let [a,b]=process.versions.node.split(".").map(Number);process.exit((a===20&&b>=19)||(a===22&&b>=12)||a>22?0:1)'
check 'npm available' npm --version
check 'PostgreSQL client 17' version 'PostgreSQL.* 17\.' psql --version
check 'PostgreSQL ready' pg_isready -h 127.0.0.1 -p 5432
check 'Redis server 8' version 'v=8\.' redis-server --version
check 'Redis responds' bash -c '[[ "$(redis-cli -h 127.0.0.1 -p 6379 ping)" == PONG ]]'
check 'Nginx configuration' nginx -t
check 'Compiled frontend' test -f /srv/sistema-escolar/frontend/dist/index.html
check 'Service account can write media' sudo -u sistema-app test -w /srv/sistema-escolar/backend/media
check 'Environment file root-owned and mode 600' bash -c '[[ "$(stat -c "%U:%a" /etc/sistema-escolar/app.env)" == root:600 ]]'
check 'systemd unit valid' systemd-analyze verify /etc/systemd/system/sistema-escolar.service
for port in 5432 6379; do check "Port $port listens exclusively on loopback" loopback_only "$port"; done
# Daphne may not be started at preflight time; if present its binding must be private.
if ss -H -ltn 'sport = :8000' | grep -q .; then check 'Daphne loopback binding' loopback_only 8000; fi
# systemd reads EnvironmentFile using the same semantics as the application service.
# Do not source the file as root shell code or rely on sudo inheriting unexported variables.
for command in check check_native; do
    check "Django $command with service environment" systemd-run --wait --pipe --collect --uid=sistema-app \
        --property=EnvironmentFile=/etc/sistema-escolar/app.env \
        --property=WorkingDirectory=/srv/sistema-escolar/backend \
        /srv/sistema-escolar/.venv/bin/python manage.py "$command"
done
check 'Migration plan' systemd-run --wait --pipe --collect --uid=sistema-app \
    --property=EnvironmentFile=/etc/sistema-escolar/app.env \
    --property=WorkingDirectory=/srv/sistema-escolar/backend \
    /srv/sistema-escolar/.venv/bin/python manage.py migrate --plan
printf 'Preflight finished. Failure flag: %s\n' "$FAILED"
exit "$FAILED"
