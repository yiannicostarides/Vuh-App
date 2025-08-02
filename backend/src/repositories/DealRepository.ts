import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository';
import { Deal, DealRecord, StoreChain, DealType, LocationQuery, DealFilters } from '../types/models';
import { logger } from '../utils/logger';

export class DealRepository extends BaseRepository {
  constructor(poolInstance?: Pool) {
    super(poolInstance);
  }
  /**
   * Create a new deal
   */
  async create(dealData: Omit<DealRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deal> {
    this.validateDealData(dealData);

    const query = `
      INSERT INTO deals (
        store_id, store_name, title, description, original_price, sale_price,
        discount_percentage, deal_type, valid_from, valid_until, category,
        item_ids, restrictions, image_url, is_active, scraped_at, source_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      dealData.storeId,
      dealData.storeName,
      dealData.title,
      dealData.description,
      dealData.originalPrice,
      dealData.salePrice,
      dealData.discountPercentage,
      dealData.dealType,
      dealData.validFrom,
      dealData.validUntil,
      dealData.category,
      dealData.itemIds,
      dealData.restrictions,
      dealData.imageUrl,
      dealData.isActive ?? true,
      dealData.scrapedAt,
      dealData.sourceUrl
    ];

    const result = await this.query<DealRecord>(query, values);
    return this.mapToModel(result.rows[0]);
  }

  /**
   * Get deal by ID
   */
  async findDealById(id: string): Promise<Deal | null> {
    const query = `
      SELECT d.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', sl.id,
                   'storeChain', sl.store_chain,
                   'name', sl.name,
                   'address', sl.address,
                   'latitude', sl.latitude,
                   'longitude', sl.longitude,
                   'phoneNumber', sl.phone_number,
                   'hours', json_build_object(
                     'monday', json_build_object('open', sl.hours_monday_open, 'close', sl.hours_monday_close, 'isClosed', sl.hours_monday_closed),
                     'tuesday', json_build_object('open', sl.hours_tuesday_open, 'close', sl.hours_tuesday_close, 'isClosed', sl.hours_tuesday_closed),
                     'wednesday', json_build_object('open', sl.hours_wednesday_open, 'close', sl.hours_wednesday_close, 'isClosed', sl.hours_wednesday_closed),
                     'thursday', json_build_object('open', sl.hours_thursday_open, 'close', sl.hours_thursday_close, 'isClosed', sl.hours_thursday_closed),
                     'friday', json_build_object('open', sl.hours_friday_open, 'close', sl.hours_friday_close, 'isClosed', sl.hours_friday_closed),
                     'saturday', json_build_object('open', sl.hours_saturday_open, 'close', sl.hours_saturday_close, 'isClosed', sl.hours_saturday_closed),
                     'sunday', json_build_object('open', sl.hours_sunday_open, 'close', sl.hours_sunday_close, 'isClosed', sl.hours_sunday_closed)
                   ),
                   'createdAt', sl.created_at,
                   'updatedAt', sl.updated_at
                 )
               ) FILTER (WHERE sl.id IS NOT NULL), '[]'
             ) as store_locations
      FROM deals d
      LEFT JOIN deal_store_locations dsl ON d.id = dsl.deal_id
      LEFT JOIN store_locations sl ON dsl.store_location_id = sl.id AND sl.is_active = true
      WHERE d.id = $1 AND d.is_active = true
      GROUP BY d.id
    `;

    const result = await this.query(query, [id]);
    return result.rows[0] ? this.mapToModelWithLocations(result.rows[0]) : null;
  }

  /**
   * Find deals by location with filters
   */
  async findByLocation(
    location: LocationQuery,
    filters: DealFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ deals: Deal[]; total: number }> {
    const { offset, limit: queryLimit } = this.buildPaginationClause(page, limit);
    
    let whereConditions = ['d.is_active = true', 'd.valid_until > CURRENT_TIMESTAMP'];
    let values: any[] = [location.latitude, location.longitude];
    let paramIndex = 3;

    // Add radius filter
    const radius = location.radius || 10;
    whereConditions.push(`calculate_distance($1, $2, sl.latitude, sl.longitude) <= $${paramIndex++}`);
    values.push(radius);

    // Add store chain filter
    if (filters.storeChain && filters.storeChain.length > 0) {
      const placeholders = filters.storeChain.map(() => `$${paramIndex++}`).join(', ');
      whereConditions.push(`d.store_name = ANY(ARRAY[${placeholders}])`);
      values.push(...filters.storeChain);
    }

    // Add category filter
    if (filters.category && filters.category.length > 0) {
      const placeholders = filters.category.map(() => `$${paramIndex++}`).join(', ');
      whereConditions.push(`d.category = ANY(ARRAY[${placeholders}])`);
      values.push(...filters.category);
    }

    // Add deal type filter
    if (filters.dealType && filters.dealType.length > 0) {
      const placeholders = filters.dealType.map(() => `$${paramIndex++}`).join(', ');
      whereConditions.push(`d.deal_type = ANY(ARRAY[${placeholders}])`);
      values.push(...filters.dealType);
    }

    // Add minimum discount filter
    if (filters.minDiscount) {
      whereConditions.push(`d.discount_percentage >= $${paramIndex++}`);
      values.push(filters.minDiscount);
    }

    // Add maximum price filter
    if (filters.maxPrice) {
      whereConditions.push(`d.sale_price <= $${paramIndex++}`);
      values.push(filters.maxPrice);
    }

    const whereClause = whereConditions.join(' AND ');

    // Count query
    const countQuery = `
      SELECT COUNT(DISTINCT d.id) as total
      FROM deals d
      JOIN deal_store_locations dsl ON d.id = dsl.deal_id
      JOIN store_locations sl ON dsl.store_location_id = sl.id AND sl.is_active = true
      WHERE ${whereClause}
    `;

    // Main query
    const query = `
      SELECT DISTINCT d.*,
             MIN(calculate_distance($1, $2, sl.latitude, sl.longitude)) as distance
      FROM deals d
      JOIN deal_store_locations dsl ON d.id = dsl.deal_id
      JOIN store_locations sl ON dsl.store_location_id = sl.id AND sl.is_active = true
      WHERE ${whereClause}
      GROUP BY d.id
      ORDER BY distance ASC, d.discount_percentage DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    values.push(queryLimit, offset);

    const [countResult, dealsResult] = await Promise.all([
      this.query(countQuery, values.slice(0, -2)), // Remove limit and offset for count
      this.query(query, values)
    ]);

    const deals = await Promise.all(
      dealsResult.rows.map(row => this.findDealById(row.id))
    );

    return {
      deals: deals.filter(deal => deal !== null) as Deal[],
      total: parseInt(countResult.rows[0].total)
    };
  }

  /**
   * Update deal
   */
  async update(id: string, updateData: Partial<DealRecord>): Promise<Deal | null> {
    const allowedFields = [
      'title', 'description', 'original_price', 'sale_price', 'discount_percentage',
      'valid_from', 'valid_until', 'category', 'restrictions', 'image_url', 'is_active'
    ];

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      const dbField = this.camelToSnake(key);
      if (allowedFields.includes(dbField) && value !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.findDealById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE deals 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND is_active = true
      RETURNING *
    `;

    const result = await this.query<DealRecord>(query, values);
    return result.rows[0] ? this.findDealById(result.rows[0].id) : null;
  }

  /**
   * Delete deal (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    return this.softDelete('deals', id);
  }

  /**
   * Find expired deals
   */
  async findExpired(): Promise<Deal[]> {
    const query = `
      SELECT * FROM deals 
      WHERE valid_until < CURRENT_TIMESTAMP AND is_active = true
      ORDER BY valid_until DESC
    `;

    const result = await this.query<DealRecord>(query);
    return Promise.all(result.rows.map(row => this.findDealById(row.id))).then(
      deals => deals.filter(deal => deal !== null) as Deal[]
    );
  }

  /**
   * Associate deal with store locations
   */
  async associateWithStoreLocations(dealId: string, storeLocationIds: string[]): Promise<void> {
    await this.transaction(async (client) => {
      // Remove existing associations
      await client.query('DELETE FROM deal_store_locations WHERE deal_id = $1', [dealId]);

      // Add new associations
      if (storeLocationIds.length > 0) {
        const values = storeLocationIds.map((locationId, index) => 
          `($1, $${index + 2})`
        ).join(', ');

        const query = `INSERT INTO deal_store_locations (deal_id, store_location_id) VALUES ${values}`;
        await client.query(query, [dealId, ...storeLocationIds]);
      }
    });
  }

  /**
   * Validate deal data
   */
  private validateDealData(dealData: Partial<DealRecord>): void {
    const errors: string[] = [];

    if (!dealData.title || dealData.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!dealData.originalPrice || dealData.originalPrice <= 0) {
      errors.push('Original price must be greater than 0');
    }

    if (!dealData.salePrice || dealData.salePrice <= 0) {
      errors.push('Sale price must be greater than 0');
    }

    if (dealData.originalPrice && dealData.salePrice && dealData.salePrice > dealData.originalPrice) {
      errors.push('Sale price cannot be greater than original price');
    }

    if (!dealData.validFrom || !dealData.validUntil) {
      errors.push('Valid from and valid until dates are required');
    }

    if (dealData.validFrom && dealData.validUntil && dealData.validFrom >= dealData.validUntil) {
      errors.push('Valid from date must be before valid until date');
    }

    if (!dealData.category || dealData.category.trim().length === 0) {
      errors.push('Category is required');
    }

    if (!Object.values(StoreChain).includes(dealData.storeName as StoreChain)) {
      errors.push('Invalid store name');
    }

    if (!Object.values(DealType).includes(dealData.dealType as DealType)) {
      errors.push('Invalid deal type');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Map database record to model
   */
  private mapToModel(record: DealRecord): Deal {
    return {
      id: record.id,
      storeId: record.storeId,
      storeName: record.storeName,
      title: record.title,
      description: record.description,
      originalPrice: parseFloat(record.originalPrice.toString()),
      salePrice: parseFloat(record.salePrice.toString()),
      discountPercentage: parseFloat(record.discountPercentage.toString()),
      dealType: record.dealType,
      validFrom: record.validFrom,
      validUntil: record.validUntil,
      category: record.category,
      itemIds: record.itemIds || [],
      restrictions: record.restrictions,
      imageUrl: record.imageUrl,
      storeLocations: [], // Will be populated by findDealById
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  /**
   * Map database record with store locations to model
   */
  private mapToModelWithLocations(record: any): Deal {
    return {
      id: record.id,
      storeId: record.store_id,
      storeName: record.store_name,
      title: record.title,
      description: record.description,
      originalPrice: parseFloat(record.original_price),
      salePrice: parseFloat(record.sale_price),
      discountPercentage: parseFloat(record.discount_percentage),
      dealType: record.deal_type,
      validFrom: record.valid_from,
      validUntil: record.valid_until,
      category: record.category,
      itemIds: record.item_ids || [],
      restrictions: record.restrictions,
      imageUrl: record.image_url,
      storeLocations: record.store_locations || [],
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}