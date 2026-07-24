import { describe, it, expect, vi } from 'vitest';
import { MappingChangeRepository, type MappingChangeInsert } from './repositories/mapping-change-repository.js';
import type { DatabaseClient } from './client.js';

function createMockClient() {
  return {
    query: vi.fn(),
  } as unknown as DatabaseClient;
}

function createMappingChangeInsert(overrides?: Partial<MappingChangeInsert>): MappingChangeInsert {
  return {
    tx_id: 'tx123abc',
    transition_id: 'trans123abc',
    program_id: 'token.aleo',
    mapping_name: 'accounts',
    mapping_id: 'mapping123',
    action: 'set',
    key_id: 'key123',
    value_id: 'value456',
    index_in_transition: 0,
    network: 'testnet',
    ...overrides,
  };
}

function createMappingChangeRow(overrides?: Partial<MappingChangeInsert> & { id?: bigint }) {
  const insert = createMappingChangeInsert(overrides);
  return {
    id: 1n,
    ...insert,
    created_at: new Date(),
    ...('id' in (overrides ?? {}) ? { id: overrides?.id } : {}),
  };
}

describe('MappingChangeRepository', () => {
  describe('insert', () => {
    it('Positive case: inserts a mapping change', async () => {
      const mockClient = createMockClient();
      const repo = new MappingChangeRepository(mockClient);
      const change = createMappingChangeInsert();
      const row = createMappingChangeRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      const result = await repo.insert(change);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO mapping_changes'),
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
      expect(result).toEqual(row);
    });
  });

  describe('findAll', () => {
    it('Positive case: returns mapping changes with limit', async () => {
      const mockClient = createMockClient();
      const repo = new MappingChangeRepository(mockClient);
      const rows = [createMappingChangeRow(), createMappingChangeRow({ id: 2n })];

      vi.mocked(mockClient.query).mockResolvedValue({ rows } as never);

      const result = await repo.findAll(10);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM mapping_changes ORDER BY id DESC LIMIT $1'),
        [10]
      );
      expect(result).toHaveLength(2);
    });

    it('Positive case: returns mapping changes with cursor', async () => {
      const mockClient = createMockClient();
      const repo = new MappingChangeRepository(mockClient);
      const rows = [createMappingChangeRow({ id: 2n })];

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
