import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository';
import { ShoppingListItem, Priority } from '../types/models';
import { logger } from '../utils/logger';

export class ShoppingListRepository extends BaseRepository {
  constructor(poolInstance?: Pool) {
    super(poolInstance);
  }
  /**
   * Create a new shopping list item
   */
  async create(itemData: Omit<ShoppingListItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShoppingListItem> {
    this.validateItemData(itemData);

    const query = `
      INSERT INTO shopping_list_items (
        user_id, deal_id, item_name, quantity, priority, added_at, category, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      itemData.userId,
      itemData.dealId,
      itemData.itemName,
      itemData.quantity,
      itemData.priority,
      itemData.addedAt,
      itemData.category,
      itemData.notes
    ];

    const result = await this.query(query, values);
    return this.mapToModel(result.rows[0]);
  }

  /**
   * Get shopping list item by ID
   */
  async findById(id: string): Promise<ShoppingListItem | null> {
    const result = await this.query(
      'SELECT * FROM shopping_list_items WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapToModel(result.rows[0]) : null;
  }

  /**
   * Get all shopping list items for a user
   */
  async findByUserId(
    userId: string,
    filters: {
      category?: string[];
      priority?: Priority[];
      storeChain?: string[];
    } = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ items: ShoppingListItem[]; total: number }> {
    const { offset, limit: queryLimit } = this.buildPaginationClause(page, limit);
    
    let whereConditions = ['sli.user_id = $1'];
    let values: any[] = [userId];
    let paramIndex = 2;

    // Add category filter
    if (filters.category && filters.category.length > 0) {
      const placeholders = filters.category.map(() => `$${paramIndex++}`).join(', ');
      whereConditions.push(`sli.category = ANY(ARRAY[${placeholders}])`);
      values.push(...filters.category);
    }

    // Add priority filter
    if (filters.priority && filters.priority.length > 0) {
      const placeholders = filters.priority.map(() => `$${paramIndex++}`).join(', ');
      whereConditions.push(`sli.priority = ANY(ARRAY[${placeholders}])`);
      values.push(...filters.priority);
    }

    // Add store chain filter (through deals)
    if (filters.storeChain && filters.storeChain.length > 0) {
      const placeholders = filters.storeChain.map(() => `$${paramIndex++}`).join(', ');
      whereConditions.push(`d.store_name = ANY(ARRAY[${placeholders}])`);
      values.push(...filters.storeChain);
    }

    const whereClause = whereConditions.join(' AND ');

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM shopping_list_items sli
      LEFT JOIN deals d ON sli.deal_id = d.id
      WHERE ${whereClause}
    `;

    // Main query with deal information
    const query = `
      SELECT sli.*,
             d.title as deal_title,
             d.store_name,
             d.sale_price,
             d.original_price,
             d.discount_percentage,
             d.valid_until,
             d.image_url as deal_image_url
      FROM shopping_list_items sli
      LEFT JOIN deals d ON sli.deal_id = d.id
      WHERE ${whereClause}
      ORDER BY sli.priority DESC, sli.added_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    values.push(queryLimit, offset);

    const [countResult, itemsResult] = await Promise.all([
      this.query(countQuery, values.slice(0, -2)), // Remove limit and offset for count
      this.query(query, values)
    ]);

    return {
      items: itemsResult.rows.map(row => this.mapToModelWithDeal(row)),
      total: parseInt(countResult.rows[0].total)
    };
  }

  /**
   * Update shopping list item
   */
  async update(id: string, updateData: Partial<ShoppingListItem>): Promise<ShoppingListItem | null> {
    const allowedFields = ['item_name', 'quantity', 'priority', 'category', 'notes'];
    
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
      return this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE shopping_list_items 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.query(query, values);
    return result.rows[0] ? this.mapToModel(result.rows[0]) : null;
  }

  /**
   * Delete shopping list item
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM shopping_list_items WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Delete all items for a user
   */
  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.query(
      'DELETE FROM shopping_list_items WHERE user_id = $1',
      [userId]
    );
    return result.rowCount;
  }

  /**
   * Find items with upcoming deal expirations
   */
  async findItemsWithExpiringDeals(
    userId: string,
    hoursUntilExpiration: number = 24
  ): Promise<ShoppingListItem[]> {
    const query = `
      SELECT sli.*,
             d.title as deal_title,
             d.store_name,
             d.sale_price,
             d.original_price,
             d.discount_percentage,
             d.valid_until,
             d.image_url as deal_image_url
      FROM shopping_list_items sli
      JOIN deals d ON sli.deal_id = d.id
      WHERE sli.user_id = $1
        AND d.is_active = true
        AND d.valid_until > CURRENT_TIMESTAMP
        AND d.valid_until <= CURRENT_TIMESTAMP + INTERVAL '${hoursUntilExpiration} hours'
      ORDER BY d.valid_until ASC
    `;

    const result = await this.query(query, [userId]);
    return result.rows.map(row => this.mapToModelWithDeal(row));
  }

  /**
   * Find items by category
   */
  async findByCategory(userId: string, category: string): Promise<ShoppingListItem[]> {
    const query = `
      SELECT sli.*,
             d.title as deal_title,
             d.store_name,
             d.sale_price,
             d.original_price,
             d.discount_percentage,
             d.valid_until,
             d.image_url as deal_image_url
      FROM shopping_list_items sli
      LEFT JOIN deals d ON sli.deal_id = d.id
      WHERE sli.user_id = $1 AND sli.category = $2
      ORDER BY sli.priority DESC, sli.added_at DESC
    `;

    const result = await this.query(query, [userId, category]);
    return result.rows.map(row => this.mapToModelWithDeal(row));
  }

  /**
   * Get shopping list statistics for a user
   */
  async getStatistics(userId: string): Promise<{
    totalItems: number;
    itemsByPriority: Record<Priority, number>;
    itemsByCategory: Record<string, number>;
    totalSavings: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
        COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority,
        COUNT(*) FILTER (WHERE priority = 'low') as low_priority,
        COALESCE(SUM((d.original_price - d.sale_price) * sli.quantity), 0) as total_savings,
        json_object_agg(sli.category, category_count) as categories
      FROM shopping_list_items sli
      LEFT JOIN deals d ON sli.deal_id = d.id AND d.is_active = true
      LEFT JOIN (
        SELECT category, COUNT(*) as category_count
        FROM shopping_list_items
        WHERE user_id = $1
        GROUP BY category
      ) cat_counts ON sli.category = cat_counts.category
      WHERE sli.user_id = $1
    `;

    const result = await this.query(query, [userId]);
    const row = result.rows[0];

    return {
      totalItems: parseInt(row.total_items),
      itemsByPriority: {
        [Priority.HIGH]: parseInt(row.high_priority),
        [Priority.MEDIUM]: parseInt(row.medium_priority),
        [Priority.LOW]: parseInt(row.low_priority)
      },
      itemsByCategory: row.categories || {},
      totalSavings: parseFloat(row.total_savings)
    };
  }

  /**
   * Check if item already exists in user's shopping list
   */
  async existsForUser(userId: string, dealId: string): Promise<boolean> {
    const result = await this.query(
      'SELECT 1 FROM shopping_list_items WHERE user_id = $1 AND deal_id = $2 LIMIT 1',
      [userId, dealId]
    );
    return result.rowCount > 0;
  }

  /**
   * Validate shopping list item data
   */
  private validateItemData(itemData: Partial<ShoppingListItem>): void {
    const errors: string[] = [];

    if (!itemData.userId || itemData.userId.trim().length === 0) {
      errors.push('User ID is required');
    }

    if (!itemData.dealId || itemData.dealId.trim().length === 0) {
      errors.push('Deal ID is required');
    }

    if (!itemData.itemName || itemData.itemName.trim().length === 0) {
      errors.push('Item name is required');
    }

    if (!itemData.quantity || itemData.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (!itemData.category || itemData.category.trim().length === 0) {
      errors.push('Category is required');
    }

    if (itemData.priority && !Object.values(Priority).includes(itemData.priority)) {
      errors.push('Invalid priority level');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Map database record to model
   */
  private mapToModel(record: any): ShoppingListItem {
    return {
      id: record.id,
      userId: record.user_id,
      dealId: record.deal_id,
      itemName: record.item_name,
      quantity: record.quantity,
      priority: record.priority,
      addedAt: record.added_at,
      category: record.category,
      notes: record.notes,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }

  /**
   * Map database record with deal information to model
   */
  private mapToModelWithDeal(record: any): ShoppingListItem & { dealInfo?: any } {
    const item = this.mapToModel(record);
    
    if (record.deal_title) {
      (item as any).dealInfo = {
        title: record.deal_title,
        storeName: record.store_name,
        salePrice: parseFloat(record.sale_price),
        originalPrice: parseFloat(record.original_price),
        discountPercentage: parseFloat(record.discount_percentage),
        validUntil: record.valid_until,
        imageUrl: record.deal_image_url
      };
    }

    return item;
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}