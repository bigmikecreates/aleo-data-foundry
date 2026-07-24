# Integration — Specification

## Overview

Wire all packages into a runnable application with Docker, CLI entry points, and end-to-end tests.

## Context

All packages are implemented and tested in isolation. This sprint connects them into a working pipeline.

## Components

### Docker Compose
PostgreSQL 16 container with:
- Named volume for persistence
- Health check (pg_isready)
- Port mapping 5432:5432

### Environment Config
Required env vars:
- `DATABASE_URL` — Postgres connection string
- `NETWORK` — testnet | mainnet
- `POLLING_INTERVAL_MS` — How often to poll chain
- `CHECKPOINT_DIR` — Where to store checkpoints
- `API_PORT` — API server port

### Migration Runner
Reads SQL files from `packages/db/migrations/`, executes against DATABASE_URL.

### CLI Entry Points
- `packages/api/src/main.ts` — Starts Fastify API server
- `packages/ingestor/src/main.ts` — Starts ingestor polling loop

### Integration Tests
- API: Start Postgres, insert data, test endpoints
- Ingestor: Mock API source, run one cycle, verify DB writes
