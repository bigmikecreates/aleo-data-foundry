import type { DatabaseClient } from '../client.js';

export interface MappingChangeRow {
  id: number;
  tx_id: string;
  transition_id: string;
  program_id: string;
  mapping_name: string;
  mapping_id: string;
  action: string;
  key_id: string;
  value_id: string;
  index_in_transition: number;
  network: "testnet" | "mainnet";
  created_at: string;
}

export interface MappingChangeInsert {
  tx_id: string;
  transition_id: string;
  program_id: string;
  mapping_name: string;
  mapping_id: string;
  action: string;
  key_id: string;
  value_id: string;
  index_in_transition: number;
  network: "testnet" | "mainnet";
}

export class MappingChangeRepository {
  constructor(private client: DatabaseClient) {}

  async insert(change: MappingChangeInsert): Promise<MappingChangeRow> {
    const result = await this.client.query<MappingChangeRow>(
      `INSERT INTO mapping_changes (
        tx_id, transition_id, program_id, mapping_name, mapping_id,
        action, key_id, value_id, index_in_transition, network
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (tx_id, transition_id, index_in_transition) DO UPDATE SET
        program_id = EXCLUDED.program_id,
        mapping_name = EXCLUDED.mapping_name,
        mapping_id = EXCLUDED.mapping_id,
        action = EXCLUDED.action,
        key_id = EXCLUDED.key_id,
        value_id = EXCLUDED.value_id,
        network = EXCLUDED.network
      RETURNING *`,
      [
        change.tx_id,
        change.transition_id,
        change.program_id,
        change.mapping_name,
        change.mapping_id,
        change.action,
        change.key_id,
        change.value_id,
        change.index_in_transition,
        change.network,
      ]
    );
    return result.rows[0];
  }

  async findAll(limit: number = 100, cursor?: number): Promise<MappingChangeRow[]> {
    if (cursor !== undefined) {
      const result = await this.client.query<MappingChangeRow>(
        'SELECT * FROM mapping_changes WHERE id < $1 ORDER BY id DESC LIMIT $2',
        [cursor, limit]
      );
      return result.rows;
    }
    const result = await this.client.query<MappingChangeRow>(
      'SELECT * FROM mapping_changes ORDER BY id DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }
}
