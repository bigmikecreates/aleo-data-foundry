# Privacy Model — Specification

## Overview

Aleo is a zero-knowledge blockchain where transactions are private by default. This spec defines how Aleo Data Foundry handles encrypted and private data through the ingestion, normalization, and serving layers.

## Aleo Privacy Architecture

### Transaction Types
- **Execute** — Calls a function on a deployed program. May contain private inputs/outputs.
- **Deploy** — Deploys a new program. Public by nature (program code is on-chain).
- **Fee** — Pays for transaction execution. Public.

### Data Visibility
- **Public data** — Visible to everyone. Includes program code, public mappings, fee amounts.
- **Private data** — Encrypted. Only the sender/recipient can decrypt with their view key.
- **Record data** — Private inputs/outputs that represent encrypted state.

### Encryption Model
Each transition has:
- `tpk` (transition public key) — used to derive encryption keys
- `tcm` (transition commitment) — binding commitment
- Inputs/outputs with `type: "private"` or `type: "record"` are encrypted

## Data Flow by Visibility

### Public Data Flow
```
Source (Provable API)
  → Canonical (full plaintext)
    → Postgres (stored as-is)
      → API (returned in full)
```

No special handling needed. Public mapping values, program deployments, and fee amounts are fully visible.

### Private Data Flow
```
Source (Provable API)
  → Canonical (encrypted blobs preserved)
    → Postgres (stored as encrypted hex/bases)
      → API (returned as opaque blobs)
        → Client decrypts with view key
```

**Key decisions:**
- We NEVER attempt to decrypt private data server-side
- Private inputs/outputs are stored as their encrypted hex representation
- The API returns encrypted data as-is — decryption happens client-side
- View key management is entirely client-side (mobile wallet responsibility)

### Mapping Changes (Finalize Actions)
- Finalize actions reference `mapping_id`, `key_id`, `value_id` — these are commitments, not plaintext
- The actual mapping key/value plaintext is not available from the block data alone
- Mapping changes are stored as commitment references, not decrypted values

## API Privacy Guarantees

1. **No server-side decryption** — The system never holds or processes private keys
2. **Encrypted data passthrough** — Private data is stored and served as encrypted blobs
3. **View key isolation** — View keys never leave the client device
4. **Public data transparency** — Public mappings and program data are fully accessible
5. **Commitment-based indexing** — Mapping changes indexed by commitment, not plaintext

## What We Do NOT Do

- Decrypt private transactions
- Store or manage view keys
- Attempt to link encrypted transactions to addresses
- Provide "privacy analysis" or transaction tracing
- Break or circumvent Aleo's privacy guarantees

## Future Considerations

- **zPass integration** — Aleo's identity system may introduce new data types
- **Delegated proving** — New transaction patterns may emerge
- **Record scanning** — Client-side scanning of owned records (out of scope for this system)
