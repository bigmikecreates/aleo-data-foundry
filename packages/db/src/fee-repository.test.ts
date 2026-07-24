import { describe, it, expect, vi } from 'vitest';
import { FeeRepository, type FeeInsert } from './repositories/fee-repository.js';
import type { DatabaseClient } from './client.js';

function createMockClient() {
  return {
    query: vi.fn(),
  } as unknown as DatabaseClient;
}

function createFeeInsert(overrides?: Partial<FeeInsert>): FeeInsert {
  return {
    tx_id: 'tx123abc',
    transition_id: 'trans123abc',
    payer: 'aleo1abc123',
    amount: 1000000n,
    global_state_root: 'stateRoot123',
    network: 'testnet',
    ...overrides,
  };
}

function createFeeRow(overrides?: Partial<FeeInsert> & { id?: bigint }) {
  const insert = createFeeInsert(overrides);
  return {
    id: 1n,
    ...insert,
    created_at: new Date(),
    ...('id' in (overrides ?? {}) ? { id: overrides?.id } : {}),
  };
}

describe('FeeRepository', () => {
  describe('insert', () => {
    it('Positive case: inserts a fee', async () => {
      const mockClient = createMockClient();
      const repo = new FeeRepository(mockClient);
      const fee = createFeeInsert();
      const row = createFeeRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      const result = await repo.insert(fee);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fees'),
        [
          fee.tx_id,
          fee.transition_id,
          fee.payer,
          fee.amount,
          fee.global_state_root,
          fee.network,
        ]
      );
      expect(result).toEqual(row);
    });
  });

  describe('findByTxId', () => {
    it('Positive case: finds fees by txId', async () => {
      const mockClient = createMockClient();
      const repo = new FeeRepository(mockClient);
      const rows = [createFeeRow(), createFeeRow({ id: 2n })];

      vi.mocked(mockClient.query).mockResolvedValue({ rows } as never);

      const result = await repo.findByTxId('tx123abc');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM fees WHERE tx_id = $1',
        ['tx123abc']
      );
      expect(result).toHaveLength(2);
    });

    it('Negative case: returns empty array when not found', async () => {
      const mockClient = createMockClient();
      const repo = new FeeRepository(mockClient);

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [] } as never);

      const result = await repo.findByTxId('nonexistent');

      expect(result).toHaveLength(0);
    });
  });

  describe('findAll', () => {
    it('Positive case: returns fees with limit', async () => {
      const mockClient = createMockClient();
      const repo = new FeeRepository(mockClient);
      const rows = [createFeeRow(), createFeeRow({ id: 2n })];

      vi.mocked(mockClient.query).mockResolvedValue({ rows } as never);

      const result = await repo.findAll(10);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM fees ORDER BY id DESC LIMIT $1'),
        [10]
      );
      expect(result).toHaveLength(2);
    });

    it('Positive case: returns fees with cursor', async () => {
      const mockClient = createMockClient();
      const repo = new FeeRepository(mockClient);
      const rows = [createFeeRow({ id: 2n })];

      vi.mocked(mockClient.query).mockResolvedValue({ rows } as never);

      const result = await repo.findAll(10, 5n);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id < $1'),
        [5n, 10]
      );
      expect(result).toHaveLength(1);
    });
  });
});
