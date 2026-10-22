#!/usr/bin/env bash
# Restore test script for PostgreSQL database
# Creates a temporary database, restores from backup, validates, then cleans up
# Run as postgres user or user with createdb privileges
# Exit codes: 0 = success, non-zero = failure

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backup/database}"
DB_NAME="${DB_NAME:-sistema_escolar_staging}"
DB_USER="${DB_USER:-sistema_app}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
[[ "$DB_NAME" =~ ^[a-zA-Z_][a-zA-Z0-9_]{0,35}$ ]] || { echo "Invalid DB_NAME" >&2; exit 1; }
TEST_DB_SUFFIX="_restore_test_$(date +%s)"
TEST_DB_NAME="${DB_NAME}${TEST_DB_SUFFIX}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

cleanup() {
    log "Cleaning up test database..."
    psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U postgres -c "DROP DATABASE IF EXISTS \"${TEST_DB_NAME}\";" 2>/dev/null || true
}

trap cleanup EXIT

log "=== Restore Test for ${DB_NAME} ==="

# Find latest backup
LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/${DB_NAME}_*.dump 2>/dev/null | head -1)
if [[ -z "${LATEST_BACKUP}" ]]; then
    log "ERROR: No backup file found in ${BACKUP_DIR}"
    exit 1
fi

log "Using backup: ${LATEST_BACKUP}"

# Create test database
log "Creating test database: ${TEST_DB_NAME}"
createdb -h "${DB_HOST}" -p "${DB_PORT}" -U postgres -O "${DB_USER}" "${TEST_DB_NAME}"

# Restore backup
log "Restoring backup to test database..."
if pg_restore -h "${DB_HOST}" -p "${DB_PORT}" -U postgres -d "${TEST_DB_NAME}" "${LATEST_BACKUP}"; then
    log "Restore completed successfully"
else
    log "ERROR: pg_restore failed"
    exit 1
fi

# Validate restore
log "Validating restore..."

# Check table count
TABLE_COUNT=$(psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U postgres -d "${TEST_DB_NAME}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
log "Tables restored: ${TABLE_COUNT}"

if [[ "${TABLE_COUNT}" -eq 0 ]]; then
    log "ERROR: No tables found in restored database"
    exit 1
fi

# Check key tables have data
KEY_TABLES=("alumno" "docente" "preceptor" "familia" "curso" "materia" "nota" "asistencia_diaria" "comunicado" "evento" "libro" "prestamo")

for table in "${KEY_TABLES[@]}"; do
    COUNT=$(psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U postgres -d "${TEST_DB_NAME}" -t -c "SELECT count(*) FROM ${table};" | xargs)
    log "  ${table}: ${COUNT} rows"
done

# Test Django migration state
log "Checking Django migration state..."
MIGRATION_COUNT=$(psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U postgres -d "${TEST_DB_NAME}" -t -c "SELECT count(*) FROM django_migrations;" | xargs)
log "Applied migrations: ${MIGRATION_COUNT}"

if [[ "${MIGRATION_COUNT}" -eq 0 ]]; then
    log "ERROR: No migrations found in restored database"
    exit 1
fi

log "=== Restore structure PASSED; compare expected counts and functional tests before certifying recovery ==="
exit 0