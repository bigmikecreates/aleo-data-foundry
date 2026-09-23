# Normalizer — Specification

## Overview

Transform Tier 1 source events (Provable API responses) into Tier 2 canonical events (internal representation).

## Context

The normalizer sits between the ingestor and storage. It consumes raw Provable API responses and emits versioned, source-agnostic canonical events.

## Transformation Rules

### Block Normalization

Input: `ProvableBlockResponse`
Output: `CanonicalBlock` + `CanonicalTransaction[]` + `CanonicalTransition[]` + `CanonicalFee[]` + `CanonicalMappingChange[]`

Field mappings:
- `block_hash` → `blockHash`
- `previous_hash` → `previousHash`
- `header.metadata.timestamp` → `timestamp` (convert unix string to ISO 8601)
- `header.metadata.round` → `round`
- `header.metadata.coinbase_target` → `coinbaseTarget`
- `header.metadata.proof_target` → `proofTarget`
- `header.metadata.last_coinbase_target` → `lastCoinbaseTarget`
- `header.metadata.last_coinbase_ratio` → `lastCoinbaseRatio`
- `header.transactions_root` → `transactionsRoot`
- `header.previous_state_root` → `previousStateRoot`
- `transactions.length` → `transactionsCount`
- `aborted_transaction_ids.length` → `abortedTransactionsCount`

### Transaction Normalization

Input: `ProvableBlockTransaction`
Output: `CanonicalTransaction`

Field mappings:
- `transaction.id` → `txId`
- `transaction.type` → `type` (map to enum: "execute" | "deploy" | "fee")
- `status` → `status` (map to enum: "accepted" | "rejected")
- `index` → `indexInBlock`
- Block height and hash passed from parent context

### Transition Normalization

Input: `ProvableTransition`
Output: `CanonicalTransition`

Field mappings:
- `id` → `transitionId`
- `program` → `programId`
- `function` → `functionName`
- Transaction ID passed from parent context

### Fee Normalization

Input: `ProvableFee`
Output: `CanonicalFee`

Field mappings:
- `transition.id` → `transitionId`
- Fee payer extracted from inputs[0].value
- Amount extracted from inputs[1].value (parse u64 string)

### Deployment Normalization

Input: `ProvableTransactionBody` (type === "deploy")
Output: `CanonicalDeployment`

Field mappings:
- `id` → `txId`
- Program ID extracted from deployment data
- Edition extracted from deployment data

### Mapping Change Normalization

Input: `ProvableFinalizeAction`
Output: `CanonicalMappingChange`

Field mappings:
- `mapping_id` → `mappingId`
- `index` → `indexInTransition`
- `key_id` → `keyId`
- `value_id` → `valueId`
- Action type mapped to enum: "set" | "remove"

## Error Handling

- Invalid source data: return `null` or default values (pure mapping layer, no side effects)
- Missing required fields: return `null` or default values
- Unknown transaction types: default to "execute" (most common type)
- Deploy transactions without deploy data: return `null` (not all transactions are deployments)
