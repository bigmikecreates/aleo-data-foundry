import type { DatabaseClient } from '../client.js';

export interface ChainMetadataRow {
  network: string;
  latest_height: bigint;
  latest_hash: string;
  updated_at: Date;
}

export interface ChainMetadataInsert {
  network: string;
  latest_height: bigint;
  latest_hash: string;
}

export class ChainMetadataRepository {
  constructor(private client: DatabaseClient) {}

  async upsert(metadata: ChainMetadataInsert): Promise<ChainMetadataRow> {
    const result = await this.client.query<ChainMetadataRow>(
      `INSERT INTO chain_metadata (network, latest_height, latest_hash)
      VALUES ($1, $2, $3)
      ON CONFLICT (network) DO UPDATE SET
        latest_height = EXCLUDED.latest_height,
        latest_hash = EXCLUDED.latest_hash,
        updated_at = NOW()
      RETURNING *`,
      [metadata.network, metadata.latest_height, metadata.latest_hash]
    );
    return result.rows[0];
  }

  async findByNetwork(network: string): Promise<ChainMetadataRow | null> {
    const result = await this.client.query<ChainMetadataRow>(
      'SELECT * FROM chain_metadata WHERE network = $1',
      [network]
    );
    return result.rows[0] ?? null;
  }
}
