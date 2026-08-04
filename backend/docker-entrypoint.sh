#!/bin/sh
set -e

echo "Waiting for database..."
python - <<'PY'
import asyncio
import os
import sys

import asyncpg


async def wait() -> None:
    url = os.environ.get("DATABASE_URL", "")
    # asyncpg wants postgresql:// not postgresql+asyncpg://
    dsn = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    last_err: Exception | None = None
    for _ in range(60):
        try:
            conn = await asyncpg.connect(dsn)
            await conn.close()
            return
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            await asyncio.sleep(1)
    print(f"Database not ready: {last_err}", file=sys.stderr)
    sys.exit(1)


asyncio.run(wait())
PY

echo "Running migrations..."
alembic upgrade head

echo "Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
