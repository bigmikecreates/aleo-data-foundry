import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from './migrate.js';
import type { DatabaseClient } from './client.js';

function createMockClient() {
  return {
    query: vi.fn(),
  } as unknown as DatabaseClient;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../migrations');

interface MigrationFile {
  name: string;
  checksum: string;
  sql: string;
}

function listMigrations(): MigrationFile[] {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => {
      const sql = readFileSync(join(migrationsDir, name), 'utf-8');
      return {
        name,
        checksum: createHash('sha256').update(sql).digest('hex'),
        sql,
      };
    });
}

describe('migrate', () => {
  it('Positive case: applies all pending migrations in order inside a transaction', async () => {
    const migrations = listMigrations();
    expect(migrations.length).toBeGreaterThan(0);
    const mockClient = createMockClient();
    vi.mocked(mockClient.query).mockResolvedValue({ rows: [] } as never);

    await migrate(mockClient);

    const calls = vi.mocked(mockClient.query).mock.calls;
    // 1 create-table + 1 applied-SELECT + N migration applications
    expect(calls).toHaveLength(2 + migrations.length);

    expect(String(calls[0][0])).toContain(
      'CREATE TABLE IF NOT EXISTS _migrations',
    );
    expect(String(calls[1][0])).toContain('SELECT name, checksum FROM _migrations');

    migrations.forEach((migration, i) => {
      const call = String(calls[i + 2][0]);
      expect(call).toContain('BEGIN;');
      expect(call).toContain(migration.sql);
      expect(call).toContain('INSERT INTO _migrations');
      expect(call).toContain(`'${migration.checksum}'`);
      expect(call).toContain('COMMIT;');
    });
  });

  it('Positive case: skips migrations already applied with matching checksums', async () => {
    const migrations = listMigrations().map((m) => ({
      name: m.name,
      checksum: m.checksum,
    }));
    const mockClient = createMockClient();
    vi.mocked(mockClient.query)
      .mockResolvedValueOnce({ rows: [] } as never) // create table
      .mockResolvedValueOnce({ rows: migrations } as never); // load applied

    await migrate(mockClient);

    const calls = vi.mocked(mockClient.query).mock.calls;
    const applied = calls.filter((call) =>
      String(call[0]).includes('INSERT INTO _migrations'),
    );
    expect(applied).toHaveLength(0);
  });

  it('Negative case: throws when an applied migration checksum changed', async () => {
    const migrations = listMigrations();
    const applied = [
      { name: migrations[0].name, checksum: 'deadbeef' }, // wrong checksum
    ];
    const mockClient = createMockClient();
    vi.mocked(mockClient.query)
      .mockResolvedValueOnce({ rows: [] } as never) // create table
      .mockResolvedValueOnce({ rows: applied } as never); // load applied

    await expect(migrate(mockClient)).rejects.toThrow(/different checksum/);
  });

  it('Negative case: propagates the failure when a migration errors', async () => {
    const mockClient = createMockClient();
    vi.mocked(mockClient.query)
      .mockResolvedValueOnce({ rows: [] } as never) // create table
      .mockResolvedValueOnce({ rows: [] } as never) // load applied (none)
      .mockRejectedValueOnce(new Error('syntax error')); // first migration apply

    await expect(migrate(mockClient)).rejects.toThrow('syntax error');
  });
});