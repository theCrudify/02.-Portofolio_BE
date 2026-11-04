# Database Backup & Restore Runbook (`portfolio-api`)

## 1. Automated Weekly Encrypted SQL Backup

Every Sunday at `02:00 UTC`, GitHub Actions (`.github/workflows/backup.yml`) runs:

```bash
pg_dump "$DATABASE_URL" --no-owner --no-acl \
  | gzip \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_PASSPHRASE -out portfolio-db-TIMESTAMP.sql.gz.enc
```

The encrypted artifact is stored in GitHub Actions Artifacts with a 90-day retention policy.

## 2. Restoring from Encrypted SQL Backup

1. Download the `portfolio-db-*.sql.gz.enc` artifact from GitHub Actions.
2. Decrypt and restore into a target Neon PostgreSQL branch/database:

```bash
export BACKUP_PASSPHRASE="your-backup-passphrase"
export TARGET_DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"

openssl enc -d -aes-256-cbc -pbkdf2 \
  -pass env:BACKUP_PASSPHRASE \
  -in portfolio-db-TIMESTAMP.sql.gz.enc \
  | gunzip \
  | psql "$TARGET_DATABASE_URL"
```

## 3. Portable JSON Content Backup & Dry-Run Restore

Owners can also export and test-restore content via the Admin Panel (`/admin/settings` → **Backup & Restore** tab) or API:

- **Export JSON**: `GET /v1/admin/backup/export`
- **Dry-Run Validation**: `POST /v1/admin/backup/import?dryRun=true`
- **Full Import**: `POST /v1/admin/backup/import?dryRun=false`

