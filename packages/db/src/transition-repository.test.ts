import { describe, it, expect, vi } from 'vitest';
import { TransitionRepository, type TransitionInsert } from './repositories/transition-repository.js';
import type { DatabaseClient } from './client.js';

function createMockClient() {
  return {
    query: vi.fn(),
  } as unknown as DatabaseClient;
}

function createTransitionInsert(overrides?: Partial<TransitionInsert>): TransitionInsert {
  return {
    transition_id: 'trans123abc',
    tx_id: 'tx123abc',
    program_id: 'aleo.aleo',
    function_name: 'transfer_public',
    inputs_json: '[{"type":"public","value":"100u64"}]',
    outputs_json: '[{"type":"public","value":"100u64"}]',
    tpk: 'tpk123',
    tcm: 'tcm456',
    ...overrides,
  };
}

function createTransitionRow(overrides?: Partial<TransitionInsert>) {
  const insert = createTransitionInsert(overrides);
  return {
    ...insert,
    created_at: new Date().toISOString(),
  };
}

describe('TransitionRepository', () => {
  describe('insert', () => {
    it('Positive case: inserts a transition', async () => {
      const mockClient = createMockClient();
      const repo = new TransitionRepository(mockClient);
      const transition = createTransitionInsert();
      const row = createTransitionRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      const result = await repo.insert(transition);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transitions'),
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
      expect(result).toEqual(row);
    });

    it('Positive case: upserts on conflict', async () => {
      const mockClient = createMockClient();
      const repo = new TransitionRepository(mockClient);
      const transition = createTransitionInsert();
      const row = createTransitionRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      await repo.insert(transition);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (transition_id) DO UPDATE SET'),
        expect.any(Array)
      );
    });

    it('Positive case: passes JSON fields as-is', async () => {
      const mockClient = createMockClient();
      const repo = new TransitionRepository(mockClient);
      const transition = createTransitionInsert();
      const row = createTransitionRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      await repo.insert(transition);

      const params = vi.mocked(mockClient.query).mock.calls[0][1] as unknown[];
      expect(params[4]).toBe(transition.inputs_json);
      expect(params[5]).toBe(transition.outputs_json);
    });
  });

  describe('findByTransitionId', () => {
    it('Positive case: finds transition by id', async () => {
      const mockClient = createMockClient();
      const repo = new TransitionRepository(mockClient);
      const row = createTransitionRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      const result = await repo.findByTransitionId('trans123abc');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM transitions WHERE transition_id = $1',
        ['trans123abc']
      );
      expect(result).toEqual(row);
    });

    it('Negative case: returns null when not found', async () => {
      const mockClient = createMockClient();
      const repo = new TransitionRepository(mockClient);

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [] } as never);

      const result = await repo.findByTransitionId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('Positive case: returns transitions with limit', async () => {
      const mockClient = createMockClient();
      const repo = new TransitionRepository(mockClient);
      const rows = [createTransitionRow(), createTransitionRow({ transition_id: 'trans456def' })];

      vi.mocked(mockClient.query).mockResolvedValue({ rows } as never);

      const result = await repo.findAll(10);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM transitions ORDER BY transition_id DESC LIMIT $1'),
        [10]
      );
      expect(result).toHaveLength(2);
    });

    it('Positive case: returns transitions with cursor', async () => {
      const mockClient = createMockClient();
      const repo = new TransitionRepository(mockClient);
      const rows = [createTransitionRow({ transition_id: 'trans456def' })];

      vi.mocked(mockClient.query).mockResolvedValue({ rows } as never);

      const result = await repo.findAll(10, 'trans789ghi');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE transition_id < $1'),
        ['trans789ghi', 10]
      );
      expect(result).toHaveLength(1);
    });
  });
});
