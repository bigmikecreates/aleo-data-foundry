import { describe, it, expect, vi } from 'vitest';
import { ProgramRepository, type ProgramInsert } from './repositories/program-repository.js';
import type { DatabaseClient } from './client.js';

function createMockClient() {
  return {
    query: vi.fn(),
  } as unknown as DatabaseClient;
}

function createProgramInsert(overrides?: Partial<ProgramInsert>): ProgramInsert {
  return {
    program_id: 'aleo.aleo',
    network: 'testnet',
    edition: 0,
    deployment_tx_id: 'tx123abc',
    deployed_at: '2024-01-15T10:30:00.000Z',
    ...overrides,
  };
}

function createProgramRow(overrides?: Partial<ProgramInsert>) {
  const insert = createProgramInsert(overrides);
  return {
    ...insert,
    created_at: new Date().toISOString(),
  };
}

describe('ProgramRepository', () => {
  describe('insert', () => {
    it('Positive case: inserts a program', async () => {
      const mockClient = createMockClient();
      const repo = new ProgramRepository(mockClient);
      const program = createProgramInsert();
      const row = createProgramRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      const result = await repo.insert(program);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO programs'),
        [
          program.program_id,
          program.network,
          program.edition,
          program.deployment_tx_id,
          program.deployed_at,
        ]
      );
      expect(result).toEqual(row);
    });

    it('Positive case: upserts on conflict', async () => {
      const mockClient = createMockClient();
      const repo = new ProgramRepository(mockClient);
      const program = createProgramInsert();
      const row = createProgramRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      await repo.insert(program);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (program_id) DO UPDATE SET'),
        expect.any(Array)
      );
    });
  });

  describe('findByProgramId', () => {
    it('Positive case: finds program by id', async () => {
      const mockClient = createMockClient();
      const repo = new ProgramRepository(mockClient);
      const row = createProgramRow();

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [row] } as never);

      const result = await repo.findByProgramId('aleo.aleo');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM programs WHERE program_id = $1',
        ['aleo.aleo']
      );
      expect(result).toEqual(row);
    });

    it('Negative case: returns null when not found', async () => {
      const mockClient = createMockClient();
      const repo = new ProgramRepository(mockClient);

      vi.mocked(mockClient.query).mockResolvedValue({ rows: [] } as never);

      const result = await repo.findByProgramId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('Positive case: returns programs with limit', async () => {
      const mockClient = createMockClient();
      const repo = new ProgramRepository(mockClient);
      const rows = [createProgramRow(), createProgramRow({ program_id: 'credits.aleo' })];

      vi.mocked(mockClient.query).mockResolvedValue({ rows } as never);

      const result = await repo.findAll(10);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM programs ORDER BY program_id DESC LIMIT $1'),
        [10]
      );
      expect(result).toHaveLength(2);
    });

    it('Positive case: returns programs with cursor', async () => {
      const mockClient = createMockClient();
      const repo = new ProgramRepository(mockClient);
      const rows = [createProgramRow({ program_id: 'credits.aleo' })];

      vi.mocked(mockClient.query).mockResolvedValue({ rows } as never);

      const result = await repo.findAll(10, 'token.aleo');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE program_id < $1'),
        ['token.aleo', 10]
      );
      expect(result).toHaveLength(1);
    });
  });
});
