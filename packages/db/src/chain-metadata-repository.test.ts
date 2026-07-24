import { describe, it, expect, vi } from 'vitest';
import { ChainMetadataRepository, type ChainMetadataInsert } from './repositories/chain-metadata-repository.js';
import type { DatabaseClient } from './client.js';

function createMockClient() {
  return {
    query: vi.fn(),
  } as unknown as DatabaseClient;
}

function createChainMetadataInsert(overrides?: Partial<ChainMetadataInsert>): ChainMetadataInsert {
  return {
    network: 'testnet',
    latest_height: 12345n,
    latest_hash: 'abc123def456',
    ...overrides,
  };
}

function createChainMetadataRow(overrides?: Partial<ChainMetadataInsert>) {
  const insert = createChainMetadataInsert(overrides);
  return {
    ...insert,
    updated_at: new Date(),
  };
}

describe('ChainMetadataRepository', () => {
  describe('upsert', () => {
    it('Positive case: inserts chain metadata', async () => {
      const mockClient = createMockClient();
      const repo = new ChainMetadataRepository(mockClient);
      const metadata = createChainMetadataInsert();
      const row = createChainMetadataRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      const result = await repo.upsert(metadata);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO chain_metadata'),
        [metadata.network, metadata.latest_height, metadata.latest_hash]
      );
      expect(result).toEqual(row);
    });

    it('Positive case: upserts on conflict', async () => {
      const mockClient = createMockClient();
      const repo = new ChainMetadataRepository(mockClient);
      const metadata = createChainMetadataInsert();
      const row = createChainMetadataRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      await repo.upsert(metadata);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (network) DO UPDATE SET'),
        expect.any(Array)
      );
    });
  });

  describe('findByNetwork', () => {
    it('Positive case: finds metadata by network', async () => {
      const mockClient = createMockClient();
      const repo = new ChainMetadataRepository(mockClient);
      const row = createChainMetadataRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      const result = await repo.findByNetwork('testnet');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM chain_metadata WHERE network = $1',
        ['testnet']
      );
      expect(result).toEqual(row);
    });

    it('Negative case: returns null when not found', async () => {
      const mockClient = createMockClient();
      const repo = new ChainMetadataRepository(mockClient);

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [] } as never);

      const result = await repo.findByNetwork('nonexistent');

      expect(result).toBeNull();
    });
  });
});
