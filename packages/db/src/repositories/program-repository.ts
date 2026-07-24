import type { DatabaseClient } from '../client.js';

export interface ProgramRow {
  program_id: string;
  network: "testnet" | "mainnet";
  edition: number;
  deployment_tx_id: string;
  deployed_at: string;
  created_at: string;
}

export interface ProgramInsert {
  program_id: string;
  network: "testnet" | "mainnet";
  edition: number;
  deployment_tx_id: string;
  deployed_at: string;
}

export class ProgramRepository {
  constructor(private client: DatabaseClient) {}

  async insert(program: ProgramInsert): Promise<ProgramRow> {
    const result = await this.client.query<ProgramRow>(
      `INSERT INTO programs (
        program_id, network, edition, deployment_tx_id, deployed_at
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (program_id) DO UPDATE SET
        network = EXCLUDED.network,
        edition = EXCLUDED.edition,
        deployment_tx_id = EXCLUDED.deployment_tx_id,
        deployed_at = EXCLUDED.deployed_at
      RETURNING *`,
      [
        program.program_id,
        program.network,
        program.edition,
        program.deployment_tx_id,
        program.deployed_at,
      ]
    );
    return result.rows[0];
  }

  async findByProgramId(id: string): Promise<ProgramRow | null> {
    const result = await this.client.query<ProgramRow>(
      'SELECT * FROM programs WHERE program_id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(limit: number = 100, cursor?: string): Promise<ProgramRow[]> {
    if (cursor !== undefined) {
      const result = await this.client.query<ProgramRow>(
        'SELECT * FROM programs WHERE program_id < $1 ORDER BY program_id DESC LIMIT $2',
        [cursor, limit]
      );
      return result.rows;
    }
    const result = await this.client.query<ProgramRow>(
      'SELECT * FROM programs ORDER BY program_id DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }
}
