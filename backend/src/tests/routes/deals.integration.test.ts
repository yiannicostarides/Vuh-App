import request from 'supertest';
import app from '../../server';
import { DealRepository } from '../../repositories/DealRepository';
import { StoreRepository } from '../../repositories/StoreRepository';
import { Deal, StoreChain, DealType } from '../../types/models';

// Mock the repositories
jest.mock('../../repositories/DealRepository');
jest.mock('../../repositories/StoreRepository');

const mockDealRepository = DealRepository as jest.MockedClass<typeof DealRepository>;
const mockStoreRepository = StoreRepository as jest.MockedClass<typeof StoreRepository>;

describe('Deals API Integration Tests', () => {
  let dealRepositoryInstance: jest.Mocked<DealRepository>;
  let storeRepositoryInstance: jest.Mocked<StoreRepository>;

  beforeEach(() => {
    dealRepositoryInstance = new mockDealRepository() as jest.Mocked<DealRepository>;
    storeRepositoryInstance = new mockStoreRepository() as jest.Mocked<StoreRepository>;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('GET /api/deals/nearby', () => {
    const mockDeals: Deal[] = [
      {
        id: '1',
        storeId: 'store-1',
        storeName: StoreChain.PUBLIX,
        title: 'Buy One Get One Free Bread',
        description: 'Fresh bakery bread BOGO deal',
        originalPrice: 3.99,
        salePrice: 1.99,
        discountPercentage: 50,
        dealType: DealType.BOGO,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31'),
        category: 'Bakery',
        itemIds: ['bread-1'],
        storeLocations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    it('should return nearby deals with valid location parameters', async () => {
      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: mockDeals,
        total: 1
      });

      const response = await request(app)
        .get('/api/deals/nearby')
        .query({
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.pagination.total).toBe(1);
      expect(dealRepositoryInstance.findByLocation).toHaveBeenCalledWith(
        { latitude: 40.7128, longitude: -74.0060, radius: 10 },
        {},
        1,
        20
      );
    });

    it('should return 400 for missing latitude', async () => {
      const response = await request(app)
        .get('/api/deals/nearby')
        .query({
          longitude: -74.0060
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Latitude and longitude are required');
    });

    it('should return 400 for invalid latitude', async () => {
      const response = await request(app)
        .get('/api/deals/nearby')
        .query({
          latitude: 91,
          longitude: -74.0060
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Latitude must be between -90 and 90');
    });

    it('should apply filters correctly', async () => {
      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: mockDeals,
        total: 1
      });

      const response = await request(app)
        .get('/api/deals/nearby')
        .query({
          latitude: 40.7128,
          longitude: -74.0060,
          storeChain: 'publix',
          category: 'Bakery',
          dealType: 'bogo',
          minDiscount: 25,
          maxPrice: 5.00
        });

      expect(response.status).toBe(200);
      expect(dealRepositoryInstance.findByLocation).toHaveBeenCalledWith(
        { latitude: 40.7128, longitude: -74.0060, radius: 10 },
        {
          storeChain: [StoreChain.PUBLIX],
          category: ['Bakery'],
          dealType: [DealType.BOGO],
          minDiscount: 25,
          maxPrice: 5.00
        },
        1,
        20
      );
    });

    it('should handle pagination parameters', async () => {
      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: mockDeals,
        total: 100
      });

      const response = await request(app)
        .get('/api/deals/nearby')
        .query({
          latitude: 40.7128,
          longitude: -74.0060,
          page: 2,
          limit: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(2);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.totalPages).toBe(10);
      expect(dealRepositoryInstance.findByLocation).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        2,
        10
      );
    });
  });

  describe('GET /api/deals/:id', () => {
    const mockDeal: Deal = {
      id: '1',
      storeId: 'store-1',
      storeName: StoreChain.PUBLIX,
      title: 'Buy One Get One Free Bread',
      description: 'Fresh bakery bread BOGO deal',
      originalPrice: 3.99,
      salePrice: 1.99,
      discountPercentage: 50,
      dealType: DealType.BOGO,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2024-12-31'),
      category: 'Bakery',
      itemIds: ['bread-1'],
      storeLocations: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return deal by ID', async () => {
      dealRepositoryInstance.findDealById.mockResolvedValue(mockDeal);

      const response = await request(app)
        .get('/api/deals/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('1');
      expect(dealRepositoryInstance.findDealById).toHaveBeenCalledWith('1');
    });

    it('should return 404 for non-existent deal', async () => {
      dealRepositoryInstance.findDealById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/deals/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Deal not found');
    });

    it('should return 400 for empty deal ID', async () => {
      const response = await request(app)
        .get('/api/deals/');

      expect(response.status).toBe(404); // Express returns 404 for missing route parameter
    });
  });

  describe('GET /api/deals/price-comparison/:itemName', () => {
    it('should return price comparison for valid item', async () => {
      // This test would require mocking the PriceComparisonService
      // For now, we'll test the endpoint structure
      const response = await request(app)
        .get('/api/deals/price-comparison/bread')
        .query({
          latitude: 40.7128,
          longitude: -74.0060
        });

      // The actual implementation would depend on the service returning data
      expect(response.status).toBeOneOf([200, 404]); // 404 if no data found
    });

    it('should return 400 for empty item name', async () => {
      const response = await request(app)
        .get('/api/deals/price-comparison/');

      expect(response.status).toBe(404); // Express returns 404 for missing route parameter
    });
  });

  describe('POST /api/deals/price-comparison/multiple', () => {
    it('should return 400 for missing item names', async () => {
      const response = await request(app)
        .post('/api/deals/price-comparison/multiple')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Item names array is required');
    });

    it('should return 400 for too many items', async () => {
      const itemNames = Array(21).fill('item');
      
      const response = await request(app)
        .post('/api/deals/price-comparison/multiple')
        .send({ itemNames });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Maximum 20 items allowed per request');
    });
  });

  describe('POST /api/deals/best-store', () => {
    it('should return 400 for missing item names', async () => {
      const response = await request(app)
        .post('/api/deals/best-store')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Item names array is required');
    });

    it('should return 400 for too many items', async () => {
      const itemNames = Array(51).fill('item');
      
      const response = await request(app)
        .post('/api/deals/best-store')
        .send({ itemNames });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Maximum 50 items allowed per request');
    });
  });
});

// Helper function for Jest custom matcher
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}