#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Somma PostgreSQL Backup to S3 / MinIO
# Daily pg_dump with retention of 30 days and webhook failure alerting
# ==============================================================================

# Configuration & Env Defaults
POSTGRES_HOST="${POSTGRES_HOST:-db}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-somma}"

S3_ENDPOINT="${S3_ENDPOINT:-http://minio:9000}"
S3_BUCKET="${S3_BUCKET:-somma-backups}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-minioadmin}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-minioadmin}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"

BACKUP_DATE="$(date -u +"%Y%m%d_%H%M%SZ")"
BACKUP_FILE="/tmp/somma_backup_${BACKUP_DATE}.sql.gz"
RETENTION_DAYS=30

alert_failure() {
    local err_msg="$1"
    echo "ERROR: ${err_msg}" >&2
    if [ -n "${ALERT_WEBHOOK_URL}" ]; then
        curl -s -X POST -H 'Content-Type: application/json' \
            -d "{\"text\": \"🚨 *Somma Database Backup Failed!*\\nDetails: ${err_msg}\"}" \
            "${ALERT_WEBHOOK_URL}" || true
    fi
}

trap 'alert_failure "Backup script interrupted unexpectedly on line $LINENO"' ERR

echo "[$(date -u)] Starting PostgreSQL dump for database: ${POSTGRES_DB}..."
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --format=custom \
    --compress=9 \
    --file="${BACKUP_FILE}"

if [ ! -s "${BACKUP_FILE}" ]; then
    alert_failure "Generated backup file is missing or empty"
    exit 1
fi

echo "[$(date -u)] Backup generated successfully: $(du -h "${BACKUP_FILE}" | cut -f1). Uploading to MinIO/S3..."

# Configure AWS CLI endpoint / mc client
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY

aws --endpoint-url="${S3_ENDPOINT}" s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/postgres/somma_backup_${BACKUP_DATE}.sql.gz"

echo "[$(date -u)] Upload completed. Cleaning local temporary file..."
rm -f "${BACKUP_FILE}"

# Retention Policy: Prune backups older than 30 days
echo "[$(date -u)] Enforcing ${RETENTION_DAYS} days retention policy in s3://${S3_BUCKET}/postgres/..."
CUTOFF_DATE="$(date -u -d "${RETENTION_DAYS} days ago" +%Y%m%d 2>/dev/null || date -u -v-${RETENTION_DAYS}d +%Y%m%d)"

aws --endpoint-url="${S3_ENDPOINT}" s3 ls "s3://${S3_BUCKET}/postgres/" | while read -r line; do
    file_name="$(echo "${line}" | awk '{print $4}')"
    if [[ "${file_name}" =~ somma_backup_([0-9]{8})_.*\.sql\.gz ]]; then
        file_date="${BASH_REMATCH[1]}"
        if [[ "${file_date}" < "${CUTOFF_DATE}" ]]; then
            echo "[$(date -u)] Pruning expired backup: ${file_name} (${file_date} older than cutoff ${CUTOFF_DATE})"
            aws --endpoint-url="${S3_ENDPOINT}" s3 rm "s3://${S3_BUCKET}/postgres/${file_name}"
        fi
    fi
done

echo "[$(date -u)] PostgreSQL backup and retention completed successfully."
