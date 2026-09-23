-- Aleo Data Foundry — Initial Schema
-- Sprint 5: Postgres Integration

-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
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

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
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

-- Transitions table
CREATE TABLE IF NOT EXISTS transitions (
  transition_id VARCHAR(64) PRIMARY KEY,
  tx_id VARCHAR(64) NOT NULL REFERENCES transactions(tx_id),
  program_id VARCHAR(64) NOT NULL,
  function_name VARCHAR(64) NOT NULL,
  inputs_json TEXT NOT NULL,
  outputs_json TEXT NOT NULL,
  tpk VARCHAR(128) NOT NULL,
  tcm VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Programs table
CREATE TABLE IF NOT EXISTS programs (
  program_id VARCHAR(64) PRIMARY KEY,
  network VARCHAR(16) NOT NULL,
  edition INT NOT NULL DEFAULT 0,
  deployment_tx_id VARCHAR(64) NOT NULL,
  deployed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mapping changes table
CREATE TABLE IF NOT EXISTS mapping_changes (
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

-- Fees table
CREATE TABLE IF NOT EXISTS fees (
  id BIGSERIAL PRIMARY KEY,
  tx_id VARCHAR(64) NOT NULL UNIQUE REFERENCES transactions(tx_id),
  transition_id VARCHAR(64) NOT NULL,
  payer VARCHAR(64) NOT NULL,
  amount BIGINT NOT NULL,
  global_state_root VARCHAR(128) NOT NULL,
  network VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chain metadata table
CREATE TABLE IF NOT EXISTS chain_metadata (
  network VARCHAR(16) PRIMARY KEY,
  latest_height BIGINT NOT NULL,
  latest_hash VARCHAR(64) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_block_height ON transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_transitions_tx_id ON transitions(tx_id);
CREATE INDEX IF NOT EXISTS idx_transitions_program_id ON transitions(program_id);
CREATE INDEX IF NOT EXISTS idx_mapping_changes_tx_id ON mapping_changes(tx_id);
CREATE INDEX IF NOT EXISTS idx_mapping_changes_program_id ON mapping_changes(program_id);
