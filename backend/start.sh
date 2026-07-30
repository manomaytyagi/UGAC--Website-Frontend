#!/bin/bash
set -e

# Step 0: Ensure trusted proxy CIDR is configured before starting anything.
# Missing this would silently fall back to an insecure uvicorn default,
# so we fail fast instead.
TRUST_PROXY_CIDR="${TRUST_PROXY_CIDR:-${TRUSTED_PROXY_CIDR:-}}"

if [ -z "$TRUST_PROXY_CIDR" ]; then
  echo "FATAL: TRUST_PROXY_CIDR is not set. Exiting."
  exit 1
fi

# Step 1: Wait for the database to be reachable (connection check only)
echo "Waiting for database to be reachable..."

DB_READY=false

for i in $(seq 1 30); do
  if python - <<'PY'
import os

from sqlalchemy import create_engine, text

database_url = os.environ["DATABASE_URL"].replace("+asyncpg", "").replace(
    "ssl=", "sslmode="
)
engine = create_engine(database_url, connect_args={"connect_timeout": 5})
try:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
finally:
    engine.dispose()
PY
  then
    echo "Database is reachable."
    DB_READY=true
    break
  fi
  echo "DB not reachable yet (attempt $i/30), retrying in 2s..."
  sleep 2
done

if [ "$DB_READY" != "true" ]; then
  echo "FATAL: Could not connect to database after 30 attempts. Exiting."
  exit 1
fi

# Step 2: Run migrations ONCE. Do not retry blindly — if it fails
# here, it's a real migration error (schema conflict, bad
# revision, etc.), not a connectivity issue, so retrying won't help.
echo "Running migrations..."

if ! alembic upgrade head; then
  echo "FATAL: Alembic migration failed. Check logs above for the actual error. Exiting."
  exit 1
fi

echo "Migrations applied successfully."

# Step 3: Start the server
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips="$TRUST_PROXY_CIDR"
