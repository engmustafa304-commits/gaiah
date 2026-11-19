#!/bin/sh
# نسخة احتياطية يومية: تُحفظ في الحاوية داخل /data/backups وتُحذف النسخ الأقدم من 14 يومًا.
# جدولتها:  crontab -e   ثم أضف:   30 3 * * * cd /opt/gaiah && sh scripts/backup.sh >> /var/log/gaiah-backup.log 2>&1
set -e
cd "$(dirname "$0")/.."
docker compose exec -T gaiah node server/backup.js "/data/backups/gaiah-$(date +%F).db"
docker compose exec -T gaiah sh -c 'find /data/backups -name "gaiah-*.db" -mtime +14 -delete'