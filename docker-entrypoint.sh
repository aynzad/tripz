#!/bin/sh
set -e

# Database paths
DATA_DB="/app/data/tripz.db"
SEED_DB="/app/prisma/seed.db"
NEXTJS_UID=1001
NEXTJS_GID=1001

# If running as root, fix permissions and switch to nextjs user
if [ "$(id -u)" = "0" ]; then
  echo "Running as root - fixing permissions..."
  
  # Ensure the data directory exists
  mkdir -p /app/data
  
  # Fix ownership of /app/data to nextjs user
  chown -R ${NEXTJS_UID}:${NEXTJS_GID} /app/data 2>/dev/null || true
  chmod -R 755 /app/data 2>/dev/null || true
  
  # Switch to nextjs user and re-run this script
  exec su-exec nextjs:nodejs "$0" "$@"
fi

# From here on, we're running as nextjs user
echo "=========================================="
echo "Database Initialization"
echo "=========================================="
echo "DATABASE_URL: file://${DATA_DB}"
echo "Current user: $(id)"
echo ""

# Ensure the data directory exists
mkdir -p /app/data

# Export environment variables early so they're available
export DATABASE_URL="file://${DATA_DB}"
export NODE_ENV="${NODE_ENV:-production}"

# Check if database file exists and has content
DB_EXISTS=false
if [ -f "$DATA_DB" ]; then
  DB_SIZE=$(stat -f%z "$DATA_DB" 2>/dev/null || stat -c%s "$DATA_DB" 2>/dev/null || echo "0")
  if [ "$DB_SIZE" -gt 100 ]; then
    DB_EXISTS=true
    echo "✓ Database exists: $DATA_DB ($DB_SIZE bytes)"
  else
    echo "⚠ Database file exists but is too small ($DB_SIZE bytes), will recreate"
    rm -f "$DATA_DB" 2>/dev/null || true
  fi
fi

# If database doesn't exist, copy seed database from build
if [ "$DB_EXISTS" = false ]; then
  if [ -f "$SEED_DB" ]; then
    SEED_SIZE=$(stat -f%z "$SEED_DB" 2>/dev/null || stat -c%s "$SEED_DB" 2>/dev/null || echo "0")
    if [ "$SEED_SIZE" -gt 100 ]; then
      echo "Copying seed database from build..."
      if cp "$SEED_DB" "$DATA_DB" 2>&1; then
        NEW_SIZE=$(stat -f%z "$DATA_DB" 2>/dev/null || stat -c%s "$DATA_DB" 2>/dev/null || echo "0")
        echo "✓ Seed database copied successfully ($NEW_SIZE bytes)"
        DB_EXISTS=true
      else
        echo "✗ Failed to copy seed database"
      fi
    else
      echo "✗ ERROR: Seed database is too small ($SEED_SIZE bytes)"
      echo "  The build did not create the database properly."
      echo "  Please rebuild the Docker image."
      exit 1
    fi
  else
    echo "✗ ERROR: Seed database not found at $SEED_DB"
    echo "  The build did not create the database properly."
    echo "  Please rebuild the Docker image."
    exit 1
  fi
fi

echo "=========================================="
echo ""

# Start the application
exec node server.js
