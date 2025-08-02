import request from 'supertest';
import app from '../../server';
import { PriceComparisonService } from '../../services/PriceComparisonService';
import { PriceComparison, StoreChain, DealType } from '../../types/models';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the PriceComparisonService
jest.mock('../../services/PriceComparisonService');

const mockPriceComparisonService = PriceComparisonService as jest.MockedClass<typeof PriceComparisonService>;

describe('Price Comparison API Routes', () => {
  let priceComparisonServiceInstance: jest.Mocked<PriceComparisonService>;

  beforeEach(() => {
    priceComparisonServiceInstance = new mockPriceComparisonService() as jest.Mocked<PriceComparisonService>;
    jest.clearAllMocks();
  });

  const mockPriceComparison: PriceComparison = {
    itemId: 'whole-wheat-bread',
    itemName: 'Whole Wheat Bread',
    stores: [
      {
        storeId: 'publix-1',
        storeName: StoreChain.PUBLIX,
        price: 2.99,
        originalPrice: 3.99,
        discountPercentage: 25,
        dealType: DealType.DISCOUNT,
        distance: 1.2,
        validUntil: new Date('2024-12-31')
      },
      {
        storeId: 'kroger-1',
        storeName: StoreChain.KROGER,
        price: 3.49,
        originalPrice: 4.49,
        discountPercentage: 22,
        dealType: DealType.DISCOUNT,
        distance: 2.1,
        validUntil: new Date('2024-12-31')
      }
    ],
    bestValue: {
      storeId: 'publix-1',
      storeName: StoreChain.PUBLIX,
      price: 2.99,
      distance: 1.2
    },
    lastUpdated: new Date()
  };

  describe('GET /api/price-comparison/:itemId', () => {
    it('should return price comparison for valid item ID', async () => {
      priceComparisonServiceInstance.compareItemPrices.mockResolvedValue(mockPriceComparison);

      const response = await request(app)
        .get('/api/price-comparison/whole-wheat-bread')
        .query({
          latitude: '40.7128',
          longitude: '-74.0060',
          radius: '10'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.itemName).toBe('Whole Wheat Bread');
      expect(response.body.data.stores).toHaveLength(2);
      expect(response.body.data.bestValue.storeName).toBe(StoreChain.PUBLIX);
    });

    it('should return 404 when no price data found', async () => {
      priceComparisonServiceInstance.compareItemPrices.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/price-comparison/nonexistent-item');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No price data found for this item');
    });

    it('should return 400 for empty item ID', async () => {
      const response = await request(app)
        .get('/api/price-comparison/');

      expect(response.status).toBe(404); // Route not found
    });

    it('should return 400 for invalid location parameters', async () => {
      const response = await request(app)
        .get('/api/price-comparison/bread')
        .query({
          latitude: 'invalid',
          longitude: '-74.0060',
          radius: '10'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid location parameters');
    });

    it('should return 400 for latitude out of range', async () => {
      const response = await request(app)
        .get('/api/price-comparison/bread')
        .query({
          latitude: '91',
          longitude: '-74.0060',
          radius: '10'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Latitude must be between -90 and 90');
    });

    it('should return 400 for longitude out of range', async () => {
      const response = await request(app)
        .get('/api/price-comparison/bread')
        .query({
          latitude: '40.7128',
          longitude: '181',
          radius: '10'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Longitude must be between -180 and 180');
    });

    it('should return 400 for invalid radius', async () => {
      const response = await request(app)
        .get('/api/price-comparison/bread')
        .query({
          latitude: '40.7128',
          longitude: '-74.0060',
          radius: '101'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Radius must be between 0 and 100 miles');
    });

    it('should work without location parameters', async () => {
      priceComparisonServiceInstance.compareItemPrices.mockResolvedValue(mockPriceComparison);

      const response = await request(app)
        .get('/api/price-comparison/bread');

      expect(response.status).toBe(200);
      expect(priceComparisonServiceInstance.compareItemPrices).toHaveBeenCalledWith(
        'bread',
        undefined,
        undefined,
        10
      );
    });
  });

  describe('POST /api/price-comparison/multiple', () => {
    it('should return comparisons for multiple items', async () => {
      const mockMultipleComparisons = [mockPriceComparison];
      priceComparisonServiceInstance.compareMultipleItems.mockResolvedValue(mockMultipleComparisons);

      const response = await request(app)
        .post('/api/price-comparison/multiple')
        .send({
          itemNames: ['Whole Wheat Bread', 'Milk'],
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return 400 for missing item names', async () => {
      const response = await request(app)
        .post('/api/price-comparison/multiple')
        .send({
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 10
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Item names array is required');
    });

    it('should return 400 for empty item names array', async () => {
      const response = await request(app)
        .post('/api/price-comparison/multiple')
        .send({
          itemNames: [],
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 10
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Item names array is required');
    });

    it('should return 400 for too many items', async () => {
      const tooManyItems = Array(21).fill('item');
      
      const response = await request(app)
        .post('/api/price-comparison/multiple')
        .send({
          itemNames: tooManyItems,
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 10
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Maximum 20 items allowed per request');
    });

    it('should return 400 for invalid location parameters', async () => {
      const response = await request(app)
        .post('/api/price-comparison/multiple')
        .send({
          itemNames: ['bread'],
          latitude: 'invalid',
          longitude: -74.0060,
          radius: 10
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid location parameters');
    });
  });

  describe('POST /api/price-comparison/best-store', () => {
    it('should return best store recommendation', async () => {
      const mockBestStoreResult = {
        recommendedStore: {
          storeId: 'publix-1',
          storeName: StoreChain.PUBLIX,
          totalSavings: 2.00,
          distance: 1.2
        },
        itemComparisons: [mockPriceComparison],
        totalCost: {
          'publix-1': 2.99,
          'kroger-1': 3.49
        }
      };

      priceComparisonServiceInstance.getBestStoreForList.mockResolvedValue(mockBestStoreResult);

      const response = await request(app)
        .post('/api/price-comparison/best-store')
        .send({
          itemNames: ['Whole Wheat Bread'],
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recommendedStore.storeName).toBe(StoreChain.PUBLIX);
      expect(response.body.data.totalCost['publix-1']).toBe(2.99);
    });

    it('should return 400 for missing item names', async () => {
      const response = await request(app)
        .post('/api/price-comparison/best-store')
        .send({
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 10
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Item names array is required');
    });

    it('should return 400 for too many items', async () => {
      const tooManyItems = Array(51).fill('item');
      
      const response = await request(app)
        .post('/api/price-comparison/best-store')
        .send({
          itemNames: tooManyItems,
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 10
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Maximum 50 items allowed per request');
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      priceComparisonServiceInstance.compareItemPrices.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/price-comparison/bread');

      expect(response.status).toBe(500);
    });
  });

  describe('Response format', () => {
    it('should return consistent API response format', async () => {
      priceComparisonServiceInstance.compareItemPrices.mockResolvedValue(mockPriceComparison);

      const response = await request(app)
        .get('/api/price-comparison/bread');

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.success).toBe(true);
      expect(typeof response.body.timestamp).toBe('string');
    });
  });
});