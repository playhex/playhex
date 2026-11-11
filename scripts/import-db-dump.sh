#!/bin/bash
# Fast import of a .sql or .sql.gz dump into DATABASE_URL (from env, else .env).
#   scripts/import-dump.sh prod.sql.gz
set -eu

url=${DATABASE_URL:-$(grep '^DATABASE_URL=' "$(dirname "$0")/../.env" | tail -1 | cut -d= -f2- | tr -d '"')}
read -r user pass host port db < <(sed -E 's#mysql://([^:]+):([^@]*)@([^:]+):([0-9]+)/(.+)#\1 \2 \3 \4 \5#' <<< "$url")

export MYSQL_PWD=$pass
sql() { mysql --protocol=TCP -h "$host" -P "$port" -u "$user" "$@"; }

# Default 128M buffer pool is too small for indexes: every insert reads disk, 60x slower
sql -e "SET GLOBAL innodb_buffer_pool_size = 2 * 1024 * 1024 * 1024, innodb_flush_log_at_trx_commit = 2"
trap 'sql -e "SET GLOBAL innodb_buffer_pool_size = 128 * 1024 * 1024, innodb_flush_log_at_trx_commit = 1"' EXIT

time {
    echo "SET sql_log_bin = 0, autocommit = 0, unique_checks = 0, foreign_key_checks = 0;"
    zcat -f "$1"
    echo "COMMIT;"
} | sql "$db"
