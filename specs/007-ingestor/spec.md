# Ingestor Implementation — Specification

## Overview

Implement the ingestor to fetch live chain data from the Provable API. This is the data acquisition layer that feeds the normalizer.

## Context

The ingestor polls the Provable API, fetches blocks and transactions, and feeds raw data to the normalizer. It handles rate limiting, retries, and checkpoint management.

## Components

### ProvableApiSource
Implements `ChainSource` interface with HTTP calls to Provable API.

**Methods:**
- `getLatestHeight()` → `number`
- `getBlock(height)` → `ProvableBlockResponse`
- `getBlockTransactions(height)` → `ProvableBlockTransactionsResponse`
- `getTransaction(txId)` → `ProvableTransactionResponse`
- `getProgram(programId)` → `ProvableProgramResponse`

### Rate Limiter
Token bucket rate limiter respecting Provable API limits.

**Limits:**
- 5 requests per second
- 100,000 requests per day

### Checkpoint Store
File-based persistence for ingestion progress.

**Checkpoint format:**
```json
{
  "source": "provable-api",
  "network": "testnet",
  "lastHeight": 12345,
  "lastHash": "abc123",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Polling Loop
Main ingestion loop that:
1. Reads checkpoint (or starts from genesis)
2. Calls `getLatestHeight()` to find chain head
3. For each block height:
   - Calls `getBlock(height)` and `getBlockTransactions(height)`
   - Publishes raw events (or writes to DB directly)
   - Updates checkpoint
4. Handles errors with retries and exponential backoff

## Rate Limit Strategy

- **Burst:** 5 requests in rapid succession, then wait
- **Sustained:** ~5 req/s average
- **Daily cap:** Track request count, pause when approaching 100k

## Error Handling

- **429 (Rate Limit):** Wait and retry with exponential backoff
- **500 (Server Error):** Retry up to 3 times, then skip block
- **404 (Not Found):** Log and skip (block doesn't exist yet)
- **Network Error:** Retry with backoff

## Out of Scope

- Kafka/Redpanda publishing (Phase 2)
- Parallel block fetching (Phase 2)
- Historical backfill beyond Provable API limits (Phase 3)
