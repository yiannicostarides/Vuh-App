import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository';
import { User, UserRecord, UserPreferences, UserLocation } from '../types/models';
import { logger } from '../utils/logger';

export class UserRepository extends BaseRepository {
  constructor(poolInstance?: Pool) {
    super(poolInstance);
  }
  /**
   * Create a new user
   */
  async create(userData: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    this.validateUserData(userData);

    const query = `
      INSERT INTO users (
        device_id, max_radius, preferred_stores, categories,
        notification_deal_expiration, notification_new_deals, 
        notification_price_drops, notification_push_enabled,
        location_latitude, location_longitude, location_last_updated,
        last_login_at, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      userData.deviceId,
      userData.preferences.maxRadius,
      userData.preferences.preferredStores,
      userData.preferences.categories,
      userData.preferences.notificationSettings.dealExpirationReminders,
      userData.preferences.notificationSettings.newDealAlerts,
      userData.preferences.notificationSettings.priceDropAlerts,
      userData.preferences.notificationSettings.pushNotificationsEnabled,
      userData.location?.latitude,
      userData.location?.longitude,
      userData.location?.lastUpdated,
      userData.lastLoginAt,
      userData.isActive ?? true
    ];

    const result = await this.query<UserRecord>(query, values);
    return this.mapToModel(result.rows[0]);
  }

  /**
   * Get user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await this.query<UserRecord>(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows[0] ? this.mapToModel(result.rows[0]) : null;
  }

  /**
   * Get user by device ID
   */
  async findByDeviceId(deviceId: string): Promise<User | null> {
    const result = await this.query<UserRecord>(
      'SELECT * FROM users WHERE device_id = $1 AND is_active = true',
      [deviceId]
    );
    return result.rows[0] ? this.mapToModel(result.rows[0]) : null;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(id: string, preferences: Partial<UserPreferences>): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (preferences.maxRadius !== undefined) {
      updates.push(`max_radius = $${paramIndex++}`);
      values.push(preferences.maxRadius);
    }

    if (preferences.preferredStores !== undefined) {
      updates.push(`preferred_stores = $${paramIndex++}`);
      values.push(preferences.preferredStores);
    }

    if (preferences.categories !== undefined) {
      updates.push(`categories = $${paramIndex++}`);
      values.push(preferences.categories);
    }

    if (preferences.notificationSettings) {
      const { notificationSettings } = preferences;
      
      if (notificationSettings.dealExpirationReminders !== undefined) {
        updates.push(`notification_deal_expiration = $${paramIndex++}`);
        values.push(notificationSettings.dealExpirationReminders);
      }

      if (notificationSettings.newDealAlerts !== undefined) {
        updates.push(`notification_new_deals = $${paramIndex++}`);
        values.push(notificationSettings.newDealAlerts);
      }

      if (notificationSettings.priceDropAlerts !== undefined) {
        updates.push(`notification_price_drops = $${paramIndex++}`);
        values.push(notificationSettings.priceDropAlerts);
      }

      if (notificationSettings.pushNotificationsEnabled !== undefined) {
        updates.push(`notification_push_enabled = $${paramIndex++}`);
        values.push(notificationSettings.pushNotificationsEnabled);
      }
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND is_active = true
      RETURNING *
    `;

    const result = await this.query<UserRecord>(query, values);
    return result.rows[0] ? this.mapToModel(result.rows[0]) : null;
  }

  /**
   * Update user location
   */
  async updateLocation(id: string, location: UserLocation): Promise<User | null> {
    this.validateLocation(location);

    const query = `
      UPDATE users 
      SET location_latitude = $1,
          location_longitude = $2,
          location_last_updated = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND is_active = true
      RETURNING *
    `;

    const values = [location.latitude, location.longitude, location.lastUpdated, id];
    const result = await this.query<UserRecord>(query, values);
    return result.rows[0] ? this.mapToModel(result.rows[0]) : null;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<User | null> {
    const query = `
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;

    const result = await this.query<UserRecord>(query, [id]);
    return result.rows[0] ? this.mapToModel(result.rows[0]) : null;
  }

  /**
   * Delete user (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    return this.softDelete('users', id);
  }

  /**
   * Find users by location within radius
   */
  async findByLocation(
    latitude: number,
    longitude: number,
    radius: number = 10
  ): Promise<Array<User & { distance: number }>> {
    const query = `
      SELECT *,
             calculate_distance($1, $2, location_latitude, location_longitude) as distance
      FROM users
      WHERE is_active = true
        AND location_latitude IS NOT NULL
        AND location_longitude IS NOT NULL
        AND calculate_distance($1, $2, location_latitude, location_longitude) <= $3
      ORDER BY distance ASC
    `;

    const result = await this.query(query, [latitude, longitude, radius]);
    return result.rows.map(row => ({
      ...this.mapToModel(row),
      distance: parseFloat(row.distance)
    }));
  }

  /**
   * Find users with specific notification preferences
   */
  async findByNotificationPreference(
    notificationType: 'dealExpiration' | 'newDeals' | 'priceDrops',
    enabled: boolean = true
  ): Promise<User[]> {
    const columnMap = {
      dealExpiration: 'notification_deal_expiration',
      newDeals: 'notification_new_deals',
      priceDrops: 'notification_price_drops'
    };

    const column = columnMap[notificationType];
    const query = `
      SELECT * FROM users 
      WHERE is_active = true 
        AND notification_push_enabled = true 
        AND ${column} = $1
      ORDER BY created_at DESC
    `;

    const result = await this.query<UserRecord>(query, [enabled]);
    return result.rows.map(row => this.mapToModel(row));
  }

  /**
   * Find users interested in specific store chains
   */
  async findByPreferredStores(storeChains: string[]): Promise<User[]> {
    const query = `
      SELECT * FROM users 
      WHERE is_active = true 
        AND preferred_stores && $1
      ORDER BY created_at DESC
    `;

    const result = await this.query<UserRecord>(query, [storeChains]);
    return result.rows.map(row => this.mapToModel(row));
  }

  /**
   * Find users interested in specific categories
   */
  async findByCategories(categories: string[]): Promise<User[]> {
    const query = `
      SELECT * FROM users 
      WHERE is_active = true 
        AND categories && $1
      ORDER BY created_at DESC
    `;

    const result = await this.query<UserRecord>(query, [categories]);
    return result.rows.map(row => this.mapToModel(row));
  }

  /**
   * Get user statistics
   */
  async getStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersWithLocation: number;
    usersWithNotifications: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE is_active = true AND location_latitude IS NOT NULL) as users_with_location,
        COUNT(*) FILTER (WHERE is_active = true AND notification_push_enabled = true) as users_with_notifications
      FROM users
    `;

    const result = await this.query(query);
    const row = result.rows[0];

    return {
      totalUsers: parseInt(row.total_users),
      activeUsers: parseInt(row.active_users),
      usersWithLocation: parseInt(row.users_with_location),
      usersWithNotifications: parseInt(row.users_with_notifications)
    };
  }

  /**
   * Validate user data
   */
  private validateUserData(userData: Partial<UserRecord>): void {
    const errors: string[] = [];

    if (!userData.deviceId || userData.deviceId.trim().length === 0) {
      errors.push('Device ID is required');
    }

    if (userData.preferences) {
      if (userData.preferences.maxRadius && (userData.preferences.maxRadius <= 0 || userData.preferences.maxRadius > 100)) {
        errors.push('Max radius must be between 0 and 100 miles');
      }
    }

    if (userData.location) {
      this.validateLocation(userData.location);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate location data
   */
  private validateLocation(location: UserLocation): void {
    const errors: string[] = [];

    if (!location.latitude || location.latitude < -90 || location.latitude > 90) {
      errors.push('Valid latitude is required (-90 to 90)');
    }

    if (!location.longitude || location.longitude < -180 || location.longitude > 180) {
      errors.push('Valid longitude is required (-180 to 180)');
    }

    if (!location.lastUpdated) {
      errors.push('Location last updated timestamp is required');
    }

    if (errors.length > 0) {
      throw new Error(`Location validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Map database record to model
   */
  private mapToModel(record: UserRecord): User {
    return {
      id: record.id,
      deviceId: record.deviceId,
      preferences: {
        maxRadius: parseFloat(record.max_radius?.toString() || '10'),
        preferredStores: record.preferred_stores || [],
        categories: record.categories || [],
        notificationSettings: {
          dealExpirationReminders: record.notification_deal_expiration ?? true,
          newDealAlerts: record.notification_new_deals ?? true,
          priceDropAlerts: record.notification_price_drops ?? true,
          pushNotificationsEnabled: record.notification_push_enabled ?? true
        }
      },
      location: record.location_latitude && record.location_longitude ? {
        latitude: parseFloat(record.location_latitude.toString()),
        longitude: parseFloat(record.location_longitude.toString()),
        lastUpdated: record.location_last_updated!
      } : undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }
}