# Ingestor — Specification

## Overview

Implement the ingestor package that fetches blockchain data from the Provable API, applies rate limiting, and maintains checkpoints for resumable ingestion.

## Context

The ingestor is the first pipeline stage in Aleo Data Foundry. It polls the Provable API for new blocks, extracts transactions and transitions, and emits raw events to Kafka topics (Phase 3). For now, it focuses on:

- Making HTTP calls to the Provable API v2
- Respecting rate limits (5 req/s, 100k req/day)
- Maintaining checkpoints for resumable ingestion
- Handling errors gracefully (retries, backoff)

## Components

### ProvableApiSource

Implements `ChainSource` interface from `@aleo-foundry/shared`. Makes real HTTP calls to the Provable API.

**Endpoints:**
- `GET /v2/{network}/height` → latest block height
- `GET /v2/{network}/block/{height_or_hash}` → full block
- `GET /v2/{network}/block/{height}/transactions` → block transactions
- `GET /v2/{network}/transaction/{tx_id}` → single transaction
- `GET /v2/{network}/program/{program_id}` → program bytecode

### Rate Limiter

Token bucket algorithm enforcing:
- 5 requests per second (sustained)
- 100,000 requests per day (quota)

Blocks when quota is exhausted. Returns 429-compatible errors.

### Checkpoint Store

File-based JSON persistence for ingestion state:
- Last ingested height
- Last block hash
- Network name
- Timestamp

Enables resumable ingestion after restarts.

## Error Handling

| Error | Strategy |
|-------|----------|
| 429 (rate limit) | Wait for rate limiter reset, retry |
| 5xx (server error) | Exponential backoff, max 3 retries |
| 4xx (client error) | Fail fast, log error |
| Network error | Exponential backoff, max 3 retries |

## Out of Scope

- Kafka message emission (Phase 3)
- Normalization (Phase 1b)
- Postgres storage (Phase 1b)
- snarkOS node integration (Phase 2)
