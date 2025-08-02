import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// Test database configuration
const testDbConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'grocery_deals_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password',
};

export const testPool = new Pool(testDbConfig);

// Setup test database
export const setupTestDatabase = async (): Promise<void> => {
  try {
    // Read and execute schema
    const schemaPath = join(__dirname, '../../database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    await testPool.query(schema);
    
    console.log('Test database setup completed');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
};

// Clean test database
export const cleanTestDatabase = async (): Promise<void> => {
  try {
    const tables = [
      'shopping_list_items',
      'deal_store_locations',
      'deals',
      'store_locations',
      'notification_subscriptions',
      'price_comparisons',
      'users'
    ];

    for (const table of tables) {
      await testPool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    }
    
    console.log('Test database cleaned');
  } catch (error) {
    console.error('Failed to clean test database:', error);
    throw error;
  }
};

// Close test database connection
export const closeTestDatabase = async (): Promise<void> => {
  try {
    await testPool.end();
    console.log('Test database connection closed');
  } catch (error) {
    console.error('Failed to close test database:', error);
  }
};

// Jest setup
beforeAll(async () => {
  await setupTestDatabase();
});

afterEach(async () => {
  await cleanTestDatabase();
});

afterAll(async () => {
  await closeTestDatabase();
});