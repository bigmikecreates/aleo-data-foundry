import type { DatabaseClient } from '../client.js';

export interface BlockRow {
  height: bigint;
  block_hash: string;
  previous_hash: string;
  network: string;
  timestamp: Date;
  coinbase_target: string;
  proof_target: string;
  last_coinbase_target: string;
  last_coinbase_ratio: string;
  round: string;
  transactions_root: string;
  previous_state_root: string;
  transactions_count: number;
  aborted_transactions_count: number;
  created_at: Date;
}

export interface BlockInsert {
  height: bigint;
  block_hash: string;
  previous_hash: string;
  network: string;
  timestamp: Date;
  coinbase_target: string;
  proof_target: string;
  last_coinbase_target: string;
  last_coinbase_ratio: string;
  round: string;
  transactions_root: string;
  previous_state_root: string;
  transactions_count: number;
  aborted_transactions_count: number;
}

export class BlockRepository {
  constructor(private client: DatabaseClient) {}

  async insert(block: BlockInsert): Promise<BlockRow> {
    const result = await this.client.query<BlockRow>(
      `INSERT INTO blocks (
        height, block_hash, previous_hash, network, timestamp,
        coinbase_target, proof_target, last_coinbase_target, last_coinbase_ratio,
        round, transactions_root, previous_state_root,
        transactions_count, aborted_transactions_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (height) DO UPDATE SET
        block_hash = EXCLUDED.block_hash,
        previous_hash = EXCLUDED.previous_hash,
        network = EXCLUDED.network,
        timestamp = EXCLUDED.timestamp,
        coinbase_target = EXCLUDED.coinbase_target,
        proof_target = EXCLUDED.proof_target,
        last_coinbase_target = EXCLUDED.last_coinbase_target,
        last_coinbase_ratio = EXCLUDED.last_coinbase_ratio,
        round = EXCLUDED.round,
        transactions_root = EXCLUDED.transactions_root,
        previous_state_root = EXCLUDED.previous_state_root,
        transactions_count = EXCLUDED.transactions_count,
        aborted_transactions_count = EXCLUDED.aborted_transactions_count
      RETURNING *`,
      [
        block.height,
        block.block_hash,
        block.previous_hash,
        block.network,
        block.timestamp,
        block.coinbase_target,
        block.proof_target,
        block.last_coinbase_target,
        block.last_coinbase_ratio,
        block.round,
        block.transactions_root,
        block.previous_state_root,
        block.transactions_count,
        block.aborted_transactions_count,
      ]
    );
    return result.rows[0];
  }

  async findByHeight(height: bigint): Promise<BlockRow | null> {
    const result = await this.client.query<BlockRow>(
      'SELECT * FROM blocks WHERE height = $1',
      [height]
    );
    return result.rows[0] ?? null;
  }

  async findAll(limit: number = 100, cursor?: bigint): Promise<BlockRow[]> {
    if (cursor !== undefined) {
      const result = await this.client.query<BlockRow>(
        'SELECT * FROM blocks WHERE height < $1 ORDER BY height DESC LIMIT $2',
        [cursor, limit]
      );
      return result.rows;
    }
    const result = await this.client.query<BlockRow>(
      'SELECT * FROM blocks ORDER BY height DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }
}
