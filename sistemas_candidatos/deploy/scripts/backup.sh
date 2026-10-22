#!/usr/bin/env bash
# Backup script for PostgreSQL database
# Run as sistema-app user via cron or manually
# Exit codes: 0 = success, non-zero = failure

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backup/database}"
DB_NAME="${DB_NAME:-sistema_escolar_staging}"
DB_USER="${DB_USER:-sistema_app}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"
LATEST_LINK="${BACKUP_DIR}/${DB_NAME}_latest.dump"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

log "Starting backup of ${DB_NAME}..."

# Perform backup
if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -Fc -f "${BACKUP_FILE}" "${DB_NAME}"; then
    log "Backup completed: ${BACKUP_FILE}"
else
    log "ERROR: pg_dump failed"
    exit 1
fi

# Verify backup file
if [[ ! -s "${BACKUP_FILE}" ]]; then
    log "ERROR: Backup file is empty"
    exit 1
fi

# Verify backup integrity
if pg_restore --list "${BACKUP_FILE}" >/dev/null 2>&1; then
    log "Backup integrity verified"
else
    log "ERROR: Backup integrity check failed"
    exit 1
fi

# Update latest symlink
ln -sfn "${BACKUP_FILE}" "${LATEST_LINK}"
log "Updated latest symlink: ${LATEST_LINK}"

# Clean old backups
log "Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "${DB_NAME}_*.dump" -type f -mtime +${RETENTION_DAYS} -delete
log "Cleanup completed"

log "Backup completed successfully: ${BACKUP_FILE}"
exit 0