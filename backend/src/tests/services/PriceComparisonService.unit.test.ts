import { PriceComparisonService } from '../../services/PriceComparisonService';
import { DealRepository } from '../../repositories/DealRepository';
import { StoreRepository } from '../../repositories/StoreRepository';
import { Deal, StoreChain, DealType } from '../../types/models';

// Mock the repositories
jest.mock('../../repositories/DealRepository');
jest.mock('../../repositories/StoreRepository');

const mockDealRepository = DealRepository as jest.MockedClass<typeof DealRepository>;
const mockStoreRepository = StoreRepository as jest.MockedClass<typeof StoreRepository>;

describe('PriceComparisonService', () => {
  let service: PriceComparisonService;
  let dealRepositoryInstance: jest.Mocked<DealRepository>;
  let storeRepositoryInstance: jest.Mocked<StoreRepository>;

  beforeEach(() => {
    dealRepositoryInstance = new mockDealRepository() as jest.Mocked<DealRepository>;
    storeRepositoryInstance = new mockStoreRepository() as jest.Mocked<StoreRepository>;
    service = new PriceComparisonService();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  const mockDeals: Deal[] = [
    {
      id: '1',
      storeId: 'publix-1',
      storeName: StoreChain.PUBLIX,
      title: 'Whole Wheat Bread',
      description: 'Fresh baked whole wheat bread',
      originalPrice: 3.99,
      salePrice: 2.99,
      discountPercentage: 25,
      dealType: DealType.DISCOUNT,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2024-12-31'),
      category: 'Bakery',
      itemIds: ['bread-1'],
      storeLocations: [
        {
          id: 'loc-1',
          storeChain: StoreChain.PUBLIX,
          name: 'Publix Downtown',
          address: '123 Main St',
          latitude: 40.7128,
          longitude: -74.0060,
          hours: {
            monday: { open: '07:00', close: '22:00', isClosed: false },
            tuesday: { open: '07:00', close: '22:00', isClosed: false },
            wednesday: { open: '07:00', close: '22:00', isClosed: false },
            thursday: { open: '07:00', close: '22:00', isClosed: false },
            friday: { open: '07:00', close: '22:00', isClosed: false },
            saturday: { open: '07:00', close: '22:00', isClosed: false },
            sunday: { open: '08:00', close: '21:00', isClosed: false }
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      storeId: 'kroger-1',
      storeName: StoreChain.KROGER,
      title: 'Artisan Bread',
      description: 'Premium artisan bread',
      originalPrice: 4.49,
      salePrice: 3.49,
      discountPercentage: 22,
      dealType: DealType.DISCOUNT,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2024-12-31'),
      category: 'Bakery',
      itemIds: ['bread-2'],
      storeLocations: [
        {
          id: 'loc-2',
          storeChain: StoreChain.KROGER,
          name: 'Kroger Midtown',
          address: '456 Oak Ave',
          latitude: 40.7589,
          longitude: -73.9851,
          hours: {
            monday: { open: '06:00', close: '23:00', isClosed: false },
            tuesday: { open: '06:00', close: '23:00', isClosed: false },
            wednesday: { open: '06:00', close: '23:00', isClosed: false },
            thursday: { open: '06:00', close: '23:00', isClosed: false },
            friday: { open: '06:00', close: '23:00', isClosed: false },
            saturday: { open: '06:00', close: '23:00', isClosed: false },
            sunday: { open: '07:00', close: '22:00', isClosed: false }
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  describe('compareItemPrices', () => {
    it('should return price comparison for valid item', async () => {
      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: mockDeals,
        total: 2
      });

      const result = await service.compareItemPrices('bread', 40.7128, -74.0060, 10);

      expect(result).toBeDefined();
      expect(result!.itemName).toBe('bread');
      expect(result!.stores).toHaveLength(2);
      expect(result!.bestValue.storeName).toBe('publix'); // Cheapest option
    });

    it('should return null when no deals found', async () => {
      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: [],
        total: 0
      });

      const result = await service.compareItemPrices('nonexistent', 40.7128, -74.0060, 10);

      expect(result).toBeNull();
    });

    it('should return null when no location provided', async () => {
      const result = await service.compareItemPrices('bread');

      expect(result).toBeNull();
    });
  });

  describe('compareMultipleItems', () => {
    it('should return comparisons for multiple items', async () => {
      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: mockDeals,
        total: 2
      });

      const result = await service.compareMultipleItems(['bread', 'milk'], 40.7128, -74.0060, 10);

      expect(result).toHaveLength(2);
      expect(result[0].itemName).toBe('bread');
      expect(result[1].itemName).toBe('milk');
    });

    it('should filter out null results', async () => {
      // First call returns deals, second call returns empty
      dealRepositoryInstance.findByLocation
        .mockResolvedValueOnce({ deals: mockDeals, total: 2 })
        .mockResolvedValueOnce({ deals: [], total: 0 });

      const result = await service.compareMultipleItems(['bread', 'nonexistent'], 40.7128, -74.0060, 10);

      expect(result).toHaveLength(1);
      expect(result[0].itemName).toBe('bread');
    });
  });

  describe('getBestStoreForList', () => {
    it('should return best store recommendation', async () => {
      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: mockDeals,
        total: 2
      });

      const result = await service.getBestStoreForList(['bread'], 40.7128, -74.0060, 10);

      expect(result.recommendedStore.storeName).toBe('publix');
      expect(result.totalCost['publix-1']).toBe(2.99);
      expect(result.itemComparisons).toHaveLength(1);
    });

    it('should consider distance as tiebreaker for similar prices', async () => {
      // Create deals with similar prices but different distances
      const similarPriceDeals = [
        {
          ...mockDeals[0],
          salePrice: 3.00,
          storeLocations: [{
            ...mockDeals[0].storeLocations[0],
            latitude: 40.7128, // Same location as user
            longitude: -74.0060
          }]
        },
        {
          ...mockDeals[1],
          salePrice: 3.01, // Slightly more expensive
          storeLocations: [{
            ...mockDeals[1].storeLocations[0],
            latitude: 41.0000, // Far from user
            longitude: -75.0000
          }]
        }
      ];

      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: similarPriceDeals,
        total: 2
      });

      const result = await service.getBestStoreForList(['bread'], 40.7128, -74.0060, 10);

      // Should recommend Publix due to closer distance despite slightly higher price
      expect(result.recommendedStore.storeName).toBe('publix');
    });
  });

  describe('distance calculation', () => {
    it('should calculate distances correctly', async () => {
      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: mockDeals,
        total: 2
      });

      const result = await service.compareItemPrices('bread', 40.7128, -74.0060, 10);

      expect(result).toBeDefined();
      expect(result!.stores[0].distance).toBeGreaterThan(0);
      expect(result!.stores[1].distance).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      dealRepositoryInstance.findByLocation.mockRejectedValue(new Error('Database error'));

      await expect(service.compareItemPrices('bread', 40.7128, -74.0060, 10))
        .rejects.toThrow('Database error');
    });
  });

  describe('item ID generation', () => {
    it('should generate consistent item IDs', async () => {
      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: mockDeals,
        total: 2
      });

      const result1 = await service.compareItemPrices('Whole Wheat Bread', 40.7128, -74.0060, 10);
      const result2 = await service.compareItemPrices('whole wheat bread', 40.7128, -74.0060, 10);

      expect(result1?.itemId).toBe(result2?.itemId);
      expect(result1?.itemId).toBe('whole-wheat-bread');
    });
  });

  describe('price ranking algorithms', () => {
    it('should rank stores by lowest price', async () => {
      const rankedDeals = [
        { ...mockDeals[0], salePrice: 2.99 }, // Cheapest
        { ...mockDeals[1], salePrice: 3.49 }  // More expensive
      ];

      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: rankedDeals,
        total: 2
      });

      const result = await service.compareItemPrices('bread', 40.7128, -74.0060, 10);

      expect(result!.stores[0].price).toBeLessThan(result!.stores[1].price);
      expect(result!.bestValue.storeName).toBe('publix');
    });

    it('should use distance as tiebreaker for similar prices', async () => {
      const tieDeals = [
        {
          ...mockDeals[0],
          salePrice: 3.00,
          storeLocations: [{
            ...mockDeals[0].storeLocations[0],
            latitude: 40.7128, // Close to user
            longitude: -74.0060
          }]
        },
        {
          ...mockDeals[1],
          salePrice: 3.00, // Same price
          storeLocations: [{
            ...mockDeals[1].storeLocations[0],
            latitude: 41.0000, // Far from user
            longitude: -75.0000
          }]
        }
      ];

      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: tieDeals,
        total: 2
      });

      const result = await service.compareItemPrices('bread', 40.7128, -74.0060, 10);

      expect(result!.bestValue.storeName).toBe('publix'); // Closer store wins
      expect(result!.bestValue.distance).toBeLessThan(result!.stores[1].distance!);
    });

    it('should handle edge case with no store locations', async () => {
      const noLocationDeals = [
        { ...mockDeals[0], storeLocations: [] },
        { ...mockDeals[1], storeLocations: [] }
      ];

      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: noLocationDeals,
        total: 2
      });

      const result = await service.compareItemPrices('bread', 40.7128, -74.0060, 10);

      expect(result).toBeDefined();
      expect(result!.stores[0].distance).toBeUndefined();
      expect(result!.stores[1].distance).toBeUndefined();
    });
  });

  describe('deal type handling', () => {
    it('should handle different deal types correctly', async () => {
      const mixedDeals = [
        { ...mockDeals[0], dealType: DealType.BOGO, salePrice: 1.99 },
        { ...mockDeals[1], dealType: DealType.COUPON, salePrice: 2.49 }
      ];

      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: mixedDeals,
        total: 2
      });

      const result = await service.compareItemPrices('bread', 40.7128, -74.0060, 10);

      expect(result!.stores[0].dealType).toBe(DealType.BOGO);
      expect(result!.stores[1].dealType).toBe(DealType.COUPON);
      expect(result!.bestValue.storeName).toBe('publix'); // BOGO is cheaper
    });
  });

  describe('data freshness', () => {
    it('should include valid until dates in comparison', async () => {
      const expiringDeals = [
        { ...mockDeals[0], validUntil: new Date('2024-01-15') },
        { ...mockDeals[1], validUntil: new Date('2024-02-15') }
      ];

      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: expiringDeals,
        total: 2
      });

      const result = await service.compareItemPrices('bread', 40.7128, -74.0060, 10);

      expect(result!.stores[0].validUntil).toEqual(new Date('2024-01-15'));
      expect(result!.stores[1].validUntil).toEqual(new Date('2024-02-15'));
    });
  });
});