import type { DatabaseClient } from '../client.js';

export interface FeeRow {
  id: bigint;
  tx_id: string;
  transition_id: string;
  payer: string;
  amount: bigint;
  global_state_root: string;
  network: string;
  created_at: Date;
}

export interface FeeInsert {
  tx_id: string;
  transition_id: string;
  payer: string;
  amount: bigint;
  global_state_root: string;
  network: string;
}

export class FeeRepository {
  constructor(private client: DatabaseClient) {}

  async insert(fee: FeeInsert): Promise<FeeRow> {
    const result = await this.client.query<FeeRow>(
      `INSERT INTO fees (
        tx_id, transition_id, payer, amount, global_state_root, network
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        fee.tx_id,
        fee.transition_id,
        fee.payer,
        fee.amount,
        fee.global_state_root,
        fee.network,
      ]
    );
    return result.rows[0];
  }

  async findByTxId(txId: string): Promise<FeeRow[]> {
    const result = await this.client.query<FeeRow>(
      'SELECT * FROM fees WHERE tx_id = $1',
      [txId]
    );
    return result.rows;
  }

  async findAll(limit: number = 100, cursor?: bigint): Promise<FeeRow[]> {
    if (cursor !== undefined) {
      const result = await this.client.query<FeeRow>(
        'SELECT * FROM fees WHERE id < $1 ORDER BY id DESC LIMIT $2',
        [cursor, limit]
      );
      return result.rows;
    }
    const result = await this.client.query<FeeRow>(
      'SELECT * FROM fees ORDER BY id DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }
}
