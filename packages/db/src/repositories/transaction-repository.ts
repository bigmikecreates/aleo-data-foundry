import type { DatabaseClient } from '../client.js';

export interface TransactionRow {
  tx_id: string;
  block_height: bigint;
  block_hash: string;
  network: string;
  type: string;
  status: string;
  index_in_block: number;
  global_state_root: string;
  created_at: Date;
}

export interface TransactionInsert {
  tx_id: string;
  block_height: bigint;
  block_hash: string;
  network: string;
  type: string;
  status: string;
  index_in_block: number;
  global_state_root: string;
}

export class TransactionRepository {
  constructor(private client: DatabaseClient) {}

  async insert(tx: TransactionInsert): Promise<TransactionRow> {
    const result = await this.client.query<TransactionRow>(
      `INSERT INTO transactions (
        tx_id, block_height, block_hash, network, type, status,
        index_in_block, global_state_root
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (tx_id) DO UPDATE SET
        block_height = EXCLUDED.block_height,
        block_hash = EXCLUDED.block_hash,
        network = EXCLUDED.network,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        index_in_block = EXCLUDED.index_in_block,
        global_state_root = EXCLUDED.global_state_root
      RETURNING *`,
      [
        tx.tx_id,
        tx.block_height,
        tx.block_hash,
        tx.network,
        tx.type,
        tx.status,
        tx.index_in_block,
        tx.global_state_root,
      ]
    );
    return result.rows[0];
  }

  async findByTxId(txId: string): Promise<TransactionRow | null> {
    const result = await this.client.query<TransactionRow>(
      'SELECT * FROM transactions WHERE tx_id = $1',
      [txId]
    );
    return result.rows[0] ?? null;
  }

  async findAll(limit: number = 100, cursor?: string): Promise<TransactionRow[]> {
    if (cursor !== undefined) {
      const result = await this.client.query<TransactionRow>(
        'SELECT * FROM transactions WHERE tx_id < $1 ORDER BY tx_id DESC LIMIT $2',
        [cursor, limit]
      );
      return result.rows;
    }
    const result = await this.client.query<TransactionRow>(
      'SELECT * FROM transactions ORDER BY tx_id DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }
}
