import type { DatabaseClient } from '../client.js';

export interface TransitionRow {
  transition_id: string;
  tx_id: string;
  program_id: string;
  function_name: string;
  inputs_json: string;
  outputs_json: string;
  tpk: string;
  tcm: string;
  created_at: string;
}

export interface TransitionInsert {
  transition_id: string;
  tx_id: string;
  program_id: string;
  function_name: string;
  inputs_json: string;
  outputs_json: string;
  tpk: string;
  tcm: string;
}

export class TransitionRepository {
  constructor(private client: DatabaseClient) {}

  async insert(transition: TransitionInsert): Promise<TransitionRow> {
    const result = await this.client.query<TransitionRow>(
      `INSERT INTO transitions (
        transition_id, tx_id, program_id, function_name,
        inputs_json, outputs_json, tpk, tcm
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (transition_id) DO UPDATE SET
        tx_id = EXCLUDED.tx_id,
        program_id = EXCLUDED.program_id,
        function_name = EXCLUDED.function_name,
        inputs_json = EXCLUDED.inputs_json,
        outputs_json = EXCLUDED.outputs_json,
        tpk = EXCLUDED.tpk,
        tcm = EXCLUDED.tcm
      RETURNING *`,
      [
        transition.transition_id,
        transition.tx_id,
        transition.program_id,
        transition.function_name,
        transition.inputs_json,
        transition.outputs_json,
        transition.tpk,
        transition.tcm,
      ]
    );
    return result.rows[0];
  }

  async findByTransitionId(id: string): Promise<TransitionRow | null> {
    const result = await this.client.query<TransitionRow>(
      'SELECT * FROM transitions WHERE transition_id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(limit: number = 100, cursor?: string): Promise<TransitionRow[]> {
    if (cursor !== undefined) {
      const result = await this.client.query<TransitionRow>(
        'SELECT * FROM transitions WHERE transition_id < $1 ORDER BY transition_id DESC LIMIT $2',
        [cursor, limit]
      );
      return result.rows;
    }
    const result = await this.client.query<TransitionRow>(
      'SELECT * FROM transitions ORDER BY transition_id DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }
}
