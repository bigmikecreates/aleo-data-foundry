import { describe, it, expect, vi } from 'vitest';
import { BlockRepository, type BlockInsert } from './repositories/block-repository.js';
import type { DatabaseClient } from './client.js';

function createMockClient() {
  return {
    query: vi.fn(),
  } as unknown as DatabaseClient;
}

function createBlockInsert(overrides?: Partial<BlockInsert>): BlockInsert {
  return {
    height: 12345n,
    block_hash: 'abc123def456',
    previous_hash: '000000000000',
    network: 'testnet',
    timestamp: new Date('2024-01-15T10:30:00Z'),
    coinbase_target: '1000000',
    proof_target: '1000000000',
    last_coinbase_target: '1000000',
    last_coinbase_ratio: '1',
    round: '1',
    transactions_root: 'txRoot123',
    previous_state_root: 'stateRoot456',
    transactions_count: 5,
    aborted_transactions_count: 1,
    ...overrides,
  };
}

function createBlockRow(overrides?: Partial<BlockInsert>) {
  const insert = createBlockInsert(overrides);
  return {
    ...insert,
    created_at: new Date(),
  };
}

describe('BlockRepository', () => {
  describe('insert', () => {
    it('Positive case: inserts a block', async () => {
      const mockClient = createMockClient();
      const repo = new BlockRepository(mockClient);
      const block = createBlockInsert();
      const row = createBlockRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      const result = await repo.insert(block);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO blocks'),
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
      expect(result).toEqual(row);
    });

    it('Positive case: upserts on conflict', async () => {
      const mockClient = createMockClient();
      const repo = new BlockRepository(mockClient);
      const block = createBlockInsert();
      const row = createBlockRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      await repo.insert(block);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (height) DO UPDATE SET'),
        expect.any(Array)
      );
    });
  });

  describe('findByHeight', () => {
    it('Positive case: finds block by height', async () => {
      const mockClient = createMockClient();
      const repo = new BlockRepository(mockClient);
      const row = createBlockRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      const result = await repo.findByHeight(12345n);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM blocks WHERE height = $1',
        [12345n]
      );
      expect(result).toEqual(row);
    });

    it('Negative case: returns null when not found', async () => {
      const mockClient = createMockClient();
      const repo = new BlockRepository(mockClient);

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [] } as never);

      const result = await repo.findByHeight(99999n);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('Positive case: returns blocks with limit', async () => {
      const mockClient = createMockClient();
      const repo = new BlockRepository(mockClient);
      const rows = [createBlockRow(), createBlockRow({ height: 12344n })];

      vi.mocked(mockClient.query).mockResolvedValue({ rows } as never);

      const result = await repo.findAll(10);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM blocks ORDER BY height DESC LIMIT $1'),
        [10]
      );
      expect(result).toHaveLength(2);
    });

    it('Positive case: returns blocks with cursor', async () => {
      const mockClient = createMockClient();
      const repo = new BlockRepository(mockClient);
      const rows = [createBlockRow({ height: 12344n })];

      vi.mocked(mockClient.query).mockResolvedValue({ rows } as never);

      const result = await repo.findAll(10, 12345n);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE height < $1'),
        [12345n, 10]
      );
      expect(result).toHaveLength(1);
    });
  });
});
