# Postgres Integration — Specification

## Overview

Implement the Postgres schema, migrations, and write layer for storing normalized blockchain data. This is the persistence layer that the normalizer writes to and the API reads from.

## Context

The database layer sits between the normalizer (writes) and the API (reads). It stores Tier 3 serving models in Postgres for fast queries.

## Schema Design

### blocks
```sql
CREATE TABLE blocks (
  height BIGINT PRIMARY KEY,
  block_hash VARCHAR(64) NOT NULL,
  previous_hash VARCHAR(64) NOT NULL,
  network VARCHAR(16) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  coinbase_target VARCHAR(32) NOT NULL,
  proof_target VARCHAR(32) NOT NULL,
  last_coinbase_target VARCHAR(32) NOT NULL,
  last_coinbase_ratio VARCHAR(32) NOT NULL,
  round VARCHAR(32) NOT NULL,
  transactions_root VARCHAR(128) NOT NULL,
  previous_state_root VARCHAR(128) NOT NULL,
  transactions_count INT NOT NULL DEFAULT 0,
  aborted_transactions_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### transactions
```sql
CREATE TABLE transactions (
  tx_id VARCHAR(64) PRIMARY KEY,
  block_height BIGINT NOT NULL REFERENCES blocks(height),
  block_hash VARCHAR(64) NOT NULL,
  network VARCHAR(16) NOT NULL,
  type VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL,
  index_in_block INT NOT NULL,
  global_state_root VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### transitions
```sql
CREATE TABLE transitions (
  transition_id VARCHAR(64) PRIMARY KEY,
  tx_id VARCHAR(64) NOT NULL REFERENCES transactions(tx_id),
  program_id VARCHAR(64) NOT NULL,
  function_name VARCHAR(64) NOT NULL,
  inputs_json JSONB NOT NULL,
  outputs_json JSONB NOT NULL,
  tpk VARCHAR(128) NOT NULL,
  tcm VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### programs
```sql
CREATE TABLE programs (
  program_id VARCHAR(64) PRIMARY KEY,
  network VARCHAR(16) NOT NULL,
  edition INT NOT NULL DEFAULT 0,
  deployment_tx_id VARCHAR(64) NOT NULL,
  deployed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### mapping_changes
```sql
CREATE TABLE mapping_changes (
  id BIGSERIAL PRIMARY KEY,
  tx_id VARCHAR(64) NOT NULL REFERENCES transactions(tx_id),
  transition_id VARCHAR(64) NOT NULL,
  program_id VARCHAR(64) NOT NULL,
  mapping_name VARCHAR(64) NOT NULL,
  mapping_id VARCHAR(64) NOT NULL,
  action VARCHAR(16) NOT NULL,
  key_id VARCHAR(128) NOT NULL,
  value_id VARCHAR(128) NOT NULL,
  index_in_transition INT NOT NULL,
  network VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### fees
```sql
CREATE TABLE fees (
  id BIGSERIAL PRIMARY KEY,
  tx_id VARCHAR(64) NOT NULL REFERENCES transactions(tx_id),
  transition_id VARCHAR(64) NOT NULL,
  payer VARCHAR(64) NOT NULL,
  amount BIGINT NOT NULL,
  global_state_root VARCHAR(128) NOT NULL,
  network VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### chain_metadata
```sql
CREATE TABLE chain_metadata (
  network VARCHAR(16) PRIMARY KEY,
  latest_height BIGINT NOT NULL,
  latest_hash VARCHAR(64) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Repositories

Each table has a repository with:
- `insert(entity)` — upsert (INSERT ON CONFLICT UPDATE)
- `findByX(id)` — query by primary/unique key
- `findAll(options)` — query with pagination

## Out of Scope

- Connection pooling (use pg library directly for now)
- Read replicas (Phase 2)
- Full-text search (Phase 2)
