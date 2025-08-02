import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

export abstract class BaseRepository {
  protected pool: Pool;

  constructor(poolInstance?: Pool) {
    this.pool = poolInstance || pool;
  }

  /**
   * Execute a query with parameters
   */
  protected async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Database query error', { text, params, error });
      throw error;
    }
  }

  /**
   * Execute a query within a transaction
   */
  protected async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction error', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if a record exists by ID
   */
  protected async exists(tableName: string, id: string): Promise<boolean> {
    const result = await this.query(
      `SELECT 1 FROM ${tableName} WHERE id = $1 LIMIT 1`,
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  /**
   * Get a record by ID
   */
  protected async findById<T extends QueryResultRow>(
    tableName: string,
    id: string,
    columns: string = '*'
  ): Promise<T | null> {
    const result = await this.query<T>(
      `SELECT ${columns} FROM ${tableName} WHERE id = $1 AND is_active = true`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Soft delete a record
   */
  protected async softDelete(tableName: string, id: string): Promise<boolean> {
    const result = await this.query(
      `UPDATE ${tableName} SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  /**
   * Build WHERE clause from filters
   */
  protected buildWhereClause(
    filters: Record<string, any>,
    startIndex: number = 1
  ): { whereClause: string; values: any[]; nextIndex: number } {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = startIndex;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
            conditions.push(`${key} = ANY(ARRAY[${placeholders}])`);
            values.push(...value);
          }
        } else {
          conditions.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }
    });

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values, nextIndex: paramIndex };
  }

  /**
   * Build pagination clause
   */
  protected buildPaginationClause(
    page: number = 1,
    limit: number = 20
  ): { offset: number; limit: number } {
    const offset = (page - 1) * limit;
    return { offset, limit };
  }
}