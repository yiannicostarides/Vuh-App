import { PriceComparisonService } from '../../services/PriceComparisonService';
import { DealRepository } from '../../repositories/DealRepository';
import { Deal, StoreChain, DealType } from '../../types/models';

// Mock the repositories
jest.mock('../../repositories/DealRepository');

const mockDealRepository = DealRepository as jest.MockedClass<typeof DealRepository>;

describe('PriceComparisonService', () => {
  let service: PriceComparisonService;
  let dealRepositoryInstance: jest.Mocked<DealRepository>;

  beforeEach(() => {
    dealRepositoryInstance = new mockDealRepository() as jest.Mocked<DealRepository>;
    service = new PriceComparisonService();
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
      storeLocations: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  describe('compareItemPrices', () => {
    it('should return price comparison for valid item', async () => {
      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: mockDeals,
        total: 1
      });

      const result = await service.compareItemPrices('bread', 40.7128, -74.0060, 10);

      expect(result).toBeDefined();
      expect(result!.itemName).toBe('bread');
      expect(result!.stores).toHaveLength(1);
    });

    it('should return null when no deals found', async () => {
      dealRepositoryInstance.findByLocation.mockResolvedValue({
        deals: [],
        total: 0
      });

      const result = await service.compareItemPrices('nonexistent', 40.7128, -74.0060, 10);

      expect(result).toBeNull();
    });
  });
});