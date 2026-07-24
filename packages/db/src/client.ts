import pg from 'pg';

const { Pool } = pg;

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export class DatabaseClient {
  private pool: pg.Pool;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool(config);
  }

  async query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async end(): Promise<void> {
    return this.pool.end();
  }
}
