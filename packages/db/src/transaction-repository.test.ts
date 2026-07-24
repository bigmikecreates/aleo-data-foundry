import { describe, it, expect, vi } from 'vitest';
import { TransactionRepository, type TransactionInsert } from './repositories/transaction-repository.js';
import type { DatabaseClient } from './client.js';

function createMockClient() {
  return {
    query: vi.fn(),
  } as unknown as DatabaseClient;
}

function createTxInsert(overrides?: Partial<TransactionInsert>): TransactionInsert {
  return {
    tx_id: 'tx123abc',
    block_height: 12345,
    block_hash: 'abc123def456',
    network: 'testnet',
    type: 'execute',
    status: 'accepted',
    index_in_block: 0,
    global_state_root: 'stateRoot123',
    ...overrides,
  };
}

function createTxRow(overrides?: Partial<TransactionInsert>) {
  const insert = createTxInsert(overrides);
  return {
    ...insert,
    created_at: new Date().toISOString(),
  };
}

describe('TransactionRepository', () => {
  describe('insert', () => {
    it('Positive case: inserts a transaction', async () => {
      const mockClient = createMockClient();
      const repo = new TransactionRepository(mockClient);
      const tx = createTxInsert();
      const row = createTxRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      const result = await repo.insert(tx);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
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
      expect(result).toEqual(row);
    });

    it('Positive case: upserts on conflict', async () => {
      const mockClient = createMockClient();
      const repo = new TransactionRepository(mockClient);
      const tx = createTxInsert();
      const row = createTxRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      await repo.insert(tx);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (tx_id) DO UPDATE SET'),
        expect.any(Array)
      );
    });
  });

  describe('findByTxId', () => {
    it('Positive case: finds transaction by txId', async () => {
      const mockClient = createMockClient();
      const repo = new TransactionRepository(mockClient);
      const row = createTxRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      const result = await repo.findByTxId('tx123abc');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM transactions WHERE tx_id = $1',
        ['tx123abc']
      );
      expect(result).toEqual(row);
    });

    it('Negative case: returns null when not found', async () => {
      const mockClient = createMockClient();
      const repo = new TransactionRepository(mockClient);

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [] } as never);

      const result = await repo.findByTxId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('Positive case: returns transactions with limit', async () => {
      const mockClient = createMockClient();
      const repo = new TransactionRepository(mockClient);
      const rows = [createTxRow(), createTxRow({ tx_id: 'tx456def' })];

      vi.mocked(mockClient.query).mockResolvedValue({ rows } as never);

      const result = await repo.findAll(10);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM transactions ORDER BY tx_id DESC LIMIT $1'),
        [10]
      );
      expect(result).toHaveLength(2);
    });

    it('Positive case: returns transactions with cursor', async () => {
      const mockClient = createMockClient();
      const repo = new TransactionRepository(mockClient);
      const rows = [createTxRow({ tx_id: 'tx456def' })];

      vi.mocked(mockClient.query).mockResolvedValue({ rows } as never);

      const result = await repo.findAll(10, 'tx789ghi');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tx_id < $1'),
        ['tx789ghi', 10]
      );
      expect(result).toHaveLength(1);
    });
  });
});
