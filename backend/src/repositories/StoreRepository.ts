import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository';
import { StoreLocation, StoreLocationRecord, StoreChain, LocationQuery } from '../types/models';
import { logger } from '../utils/logger';

export class StoreRepository extends BaseRepository {
  constructor(poolInstance?: Pool) {
    super(poolInstance);
  }
  /**
   * Create a new store location
   */
  async create(storeData: Omit<StoreLocationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoreLocation> {
    this.validateStoreData(storeData);

    const query = `
      INSERT INTO store_locations (
        store_chain, name, address, latitude, longitude, phone_number,
        hours_monday_open, hours_monday_close, hours_monday_closed,
        hours_tuesday_open, hours_tuesday_close, hours_tuesday_closed,
        hours_wednesday_open, hours_wednesday_close, hours_wednesday_closed,
        hours_thursday_open, hours_thursday_close, hours_thursday_closed,
        hours_friday_open, hours_friday_close, hours_friday_closed,
        hours_saturday_open, hours_saturday_close, hours_saturday_closed,
        hours_sunday_open, hours_sunday_close, hours_sunday_closed,
        is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26, $27
      )
      RETURNING *
    `;

    const values = [
      storeData.storeChain,
      storeData.name,
      storeData.address,
      storeData.latitude,
      storeData.longitude,
      storeData.phoneNumber,
      storeData.hours.monday.open,
      storeData.hours.monday.close,
      storeData.hours.monday.isClosed,
      storeData.hours.tuesday.open,
      storeData.hours.tuesday.close,
      storeData.hours.tuesday.isClosed,
      storeData.hours.wednesday.open,
      storeData.hours.wednesday.close,
      storeData.hours.wednesday.isClosed,
      storeData.hours.thursday.open,
      storeData.hours.thursday.close,
      storeData.hours.thursday.isClosed,
      storeData.hours.friday.open,
      storeData.hours.friday.close,
      storeData.hours.friday.isClosed,
      storeData.hours.saturday.open,
      storeData.hours.saturday.close,
      storeData.hours.saturday.isClosed,
      storeData.hours.sunday.open,
      storeData.hours.sunday.close,
      storeData.hours.sunday.isClosed,
      storeData.isActive ?? true
    ];

    const result = await this.query<StoreLocationRecord>(query, values);
    return this.mapToModel(result.rows[0]);
  }

  /**
   * Get store by ID
   */
  async findById(id: string): Promise<StoreLocation | null> {
    const result = await this.query<StoreLocationRecord>(
      'SELECT * FROM store_locations WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows[0] ? this.mapToModel(result.rows[0]) : null;
  }

  /**
   * Find stores by location within radius
   */
  async findByLocation(
    location: LocationQuery,
    storeChain?: StoreChain
  ): Promise<Array<StoreLocation & { distance: number }>> {
    const radius = location.radius || 10;
    let query = `
      SELECT *,
             calculate_distance($1, $2, latitude, longitude) as distance
      FROM store_locations
      WHERE is_active = true
        AND calculate_distance($1, $2, latitude, longitude) <= $3
    `;
    
    const values: any[] = [location.latitude, location.longitude, radius];

    if (storeChain) {
      query += ' AND store_chain = $4';
      values.push(storeChain);
    }

    query += ' ORDER BY distance ASC';

    const result = await this.query(query, values);
    return result.rows.map(row => ({
      ...this.mapToModel(row),
      distance: parseFloat(row.distance)
    }));
  }

  /**
   * Find stores by chain
   */
  async findByChain(storeChain: StoreChain): Promise<StoreLocation[]> {
    const result = await this.query<StoreLocationRecord>(
      'SELECT * FROM store_locations WHERE store_chain = $1 AND is_active = true ORDER BY name',
      [storeChain]
    );
    return result.rows.map(row => this.mapToModel(row));
  }

  /**
   * Find nearest store of a specific chain
   */
  async findNearestByChain(
    location: LocationQuery,
    storeChain: StoreChain
  ): Promise<(StoreLocation & { distance: number }) | null> {
    const query = `
      SELECT *,
             calculate_distance($1, $2, latitude, longitude) as distance
      FROM store_locations
      WHERE store_chain = $3 AND is_active = true
      ORDER BY distance ASC
      LIMIT 1
    `;

    const result = await this.query(query, [location.latitude, location.longitude, storeChain]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...this.mapToModel(result.rows[0]),
      distance: parseFloat(result.rows[0].distance)
    };
  }

  /**
   * Update store location
   */
  async update(id: string, updateData: Partial<StoreLocationRecord>): Promise<StoreLocation | null> {
    const allowedFields = [
      'name', 'address', 'latitude', 'longitude', 'phone_number',
      'hours_monday_open', 'hours_monday_close', 'hours_monday_closed',
      'hours_tuesday_open', 'hours_tuesday_close', 'hours_tuesday_closed',
      'hours_wednesday_open', 'hours_wednesday_close', 'hours_wednesday_closed',
      'hours_thursday_open', 'hours_thursday_close', 'hours_thursday_closed',
      'hours_friday_open', 'hours_friday_close', 'hours_friday_closed',
      'hours_saturday_open', 'hours_saturday_close', 'hours_saturday_closed',
      'hours_sunday_open', 'hours_sunday_close', 'hours_sunday_closed',
      'is_active'
    ];

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Handle nested hours object
    if (updateData.hours) {
      Object.entries(updateData.hours).forEach(([day, hours]) => {
        const dayPrefix = `hours_${day}`;
        if (hours.open !== undefined) {
          updates.push(`${dayPrefix}_open = $${paramIndex++}`);
          values.push(hours.open);
        }
        if (hours.close !== undefined) {
          updates.push(`${dayPrefix}_close = $${paramIndex++}`);
          values.push(hours.close);
        }
        if (hours.isClosed !== undefined) {
          updates.push(`${dayPrefix}_closed = $${paramIndex++}`);
          values.push(hours.isClosed);
        }
      });
    }

    // Handle other fields
    Object.entries(updateData).forEach(([key, value]) => {
      if (key === 'hours') return; // Already handled above
      
      const dbField = this.camelToSnake(key);
      if (allowedFields.includes(dbField) && value !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE store_locations 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND is_active = true
      RETURNING *
    `;

    const result = await this.query<StoreLocationRecord>(query, values);
    return result.rows[0] ? this.mapToModel(result.rows[0]) : null;
  }

  /**
   * Delete store location (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    return this.softDelete('store_locations', id);
  }

  /**
   * Get all store chains
   */
  async getStoreChains(): Promise<StoreChain[]> {
    const result = await this.query(
      'SELECT DISTINCT store_chain FROM store_locations WHERE is_active = true ORDER BY store_chain'
    );
    return result.rows.map(row => row.store_chain);
  }

  /**
   * Search stores by name or address
   */
  async search(
    searchTerm: string,
    location?: LocationQuery,
    limit: number = 20
  ): Promise<Array<StoreLocation & { distance?: number }>> {
    let query = `
      SELECT *
      ${location ? ', calculate_distance($2, $3, latitude, longitude) as distance' : ''}
      FROM store_locations
      WHERE is_active = true
        AND (name ILIKE $1 OR address ILIKE $1)
    `;

    const values: any[] = [`%${searchTerm}%`];

    if (location) {
      values.push(location.latitude, location.longitude);
      query += ' ORDER BY distance ASC';
    } else {
      query += ' ORDER BY name ASC';
    }

    query += ` LIMIT ${limit}`;

    const result = await this.query(query, values);
    return result.rows.map(row => ({
      ...this.mapToModel(row),
      ...(row.distance && { distance: parseFloat(row.distance) })
    }));
  }

  /**
   * Validate store data
   */
  private validateStoreData(storeData: Partial<StoreLocationRecord>): void {
    const errors: string[] = [];

    if (!storeData.name || storeData.name.trim().length === 0) {
      errors.push('Store name is required');
    }

    if (!storeData.address || storeData.address.trim().length === 0) {
      errors.push('Store address is required');
    }

    if (!storeData.latitude || storeData.latitude < -90 || storeData.latitude > 90) {
      errors.push('Valid latitude is required (-90 to 90)');
    }

    if (!storeData.longitude || storeData.longitude < -180 || storeData.longitude > 180) {
      errors.push('Valid longitude is required (-180 to 180)');
    }

    if (!Object.values(StoreChain).includes(storeData.storeChain as StoreChain)) {
      errors.push('Invalid store chain');
    }

    if (storeData.hours) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      days.forEach(day => {
        const dayHours = storeData.hours![day as keyof typeof storeData.hours];
        if (dayHours && !dayHours.isClosed) {
          if (!dayHours.open || !dayHours.close) {
            errors.push(`${day} hours must include open and close times when not closed`);
          }
        }
      });
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Map database record to model
   */
  private mapToModel(record: StoreLocationRecord): StoreLocation {
    return {
      id: record.id,
      storeChain: record.storeChain,
      name: record.name,
      address: record.address,
      latitude: parseFloat(record.latitude.toString()),
      longitude: parseFloat(record.longitude.toString()),
      phoneNumber: record.phoneNumber,
      hours: {
        monday: {
          open: record.hours_monday_open || '',
          close: record.hours_monday_close || '',
          isClosed: record.hours_monday_closed || false
        },
        tuesday: {
          open: record.hours_tuesday_open || '',
          close: record.hours_tuesday_close || '',
          isClosed: record.hours_tuesday_closed || false
        },
        wednesday: {
          open: record.hours_wednesday_open || '',
          close: record.hours_wednesday_close || '',
          isClosed: record.hours_wednesday_closed || false
        },
        thursday: {
          open: record.hours_thursday_open || '',
          close: record.hours_thursday_close || '',
          isClosed: record.hours_thursday_closed || false
        },
        friday: {
          open: record.hours_friday_open || '',
          close: record.hours_friday_close || '',
          isClosed: record.hours_friday_closed || false
        },
        saturday: {
          open: record.hours_saturday_open || '',
          close: record.hours_saturday_close || '',
          isClosed: record.hours_saturday_closed || false
        },
        sunday: {
          open: record.hours_sunday_open || '',
          close: record.hours_sunday_close || '',
          isClosed: record.hours_sunday_closed || false
        }
      },
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}