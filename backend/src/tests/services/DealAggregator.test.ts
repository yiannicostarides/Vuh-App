import { DealAggregator, AggregationResult } from '../../services/DealAggregator';
import { KrogerAPIClient } from '../../services/KrogerAPIClient';
import { PublixScraper, ScrapingResult } from '../../services/PublixScraper';
import { DealRepository } from '../../repositories/DealRepository';
import { StoreRepository } from '../../repositories/StoreRepository';
import { Deal, StoreChain, DealType, StoreLocation } from '../../types/models';

// Mock dependencies
jest.mock('../../services/KrogerAPIClient');
jest.mock('../../services/PublixScraper');
jest.mock('../../repositories/DealRepository');
jest.mock('../../repositories/StoreRepository');
jest.mock('../../utils/logger');
jest.mock('node-cron');

const MockedKrogerAPIClient = KrogerAPIClient as jest.MockedClass<typeof KrogerAPIClient>;
const MockedPublixScraper = PublixScraper as jest.MockedClass<typeof PublixScraper>;
const MockedDealRepository = DealRepository as jest.MockedClass<typeof DealRepository>;
const MockedStoreRepository = StoreRepository as jest.MockedClass<typeof StoreRepository>;

describe('DealAggregator', () => {
  let dealAggregator: DealAggregator;
  let mockKrogerClient: jest.Mocked<KrogerAPIClient>;
  let mockPublixScraper: jest.Mocked<PublixScraper>;
  let mockDealRepository: jest.Mocked<DealRepository>;
  let mockStoreRepository: jest.Mocked<StoreRepository>;

  const mockKrogerStores: StoreLocation[] = [
    {
      id: 'kroger-1',
      storeChain: StoreChain.KROGER,
      name: 'Kroger Store 1',
      address: '123 Main St',
      latitude: 40.7128,
      longitude: -74.0060,
      phoneNumber: '555-0123',
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
  ];

  const mockPublixStores: StoreLocation[] = [
    {
      id: 'publix-1',
      storeChain: StoreChain.PUBLIX,
      name: 'Publix Store 1',
      address: '456 Oak Ave',
      latitude: 40.7589,
      longitude: -73.9851,
      phoneNumber: '555-0456',
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
  ];

  const mockKrogerDeal: Deal = {
    id: 'kroger-deal-1',
    storeId: 'kroger-1',
    storeName: StoreChain.KROGER,
    title: 'Test Kroger Deal',
    description: 'Test deal description',
    originalPrice: 5.99,
    salePrice: 3.99,
    discountPercentage: 33.39,
    dealType: DealType.DISCOUNT,
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2024-01-07'),
    category: 'Groceries',
    itemIds: ['12345'],
    restrictions: undefined,
    imageUrl: 'https://example.com/image.jpg',
    storeLocations: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockPublixScrapedDeal = {
    title: 'Test Publix Deal',
    description: 'Test BOGO deal',
    originalPrice: 4.99,
    salePrice: 2.49,
    dealType: DealType.BOGO,
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2024-01-07'),
    category: 'Dairy',
    restrictions: undefined,
    imageUrl: undefined
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocked instances
    mockKrogerClient = new MockedKrogerAPIClient() as jest.Mocked<KrogerAPIClient>;
    mockPublixScraper = new MockedPublixScraper() as jest.Mocked<PublixScraper>;
    mockDealRepository = new MockedDealRepository() as jest.Mocked<DealRepository>;
    mockStoreRepository = new MockedStoreRepository() as jest.Mocked<StoreRepository>;

    // Setup default mock implementations
    mockStoreRepository.findByChain.mockImplementation(async (storeChain) => {
      if (storeChain === StoreChain.KROGER) return mockKrogerStores;
      if (storeChain === StoreChain.PUBLIX) return mockPublixStores;
      return [];
    });

    mockDealRepository.create.mockImplementation(async (dealData) => ({
      ...dealData,
      id: `generated-id-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      storeLocations: []
    } as Deal));

    mockDealRepository.associateWithStoreLocations.mockResolvedValue(undefined);
    mockDealRepository.findExpired.mockResolvedValue([]);
    mockDealRepository.delete.mockResolvedValue(true);

    // Create DealAggregator instance with mocked dependencies
    dealAggregator = new DealAggregator(
      mockKrogerClient,
      mockPublixScraper,
      mockDealRepository,
      mockStoreRepository
    );
  });

  afterEach(() => {
    dealAggregator.stopScheduledJobs();
  });

  describe('constructor', () => {
    it('should initialize with provided dependencies', () => {
      expect(dealAggregator).toBeInstanceOf(DealAggregator);
      expect(dealAggregator.isAggregationRunning()).toBe(false);
    });

    it('should initialize with default dependencies when none provided', () => {
      const aggregator = new DealAggregator();
      expect(aggregator).toBeInstanceOf(DealAggregator);
    });
  });

  describe('aggregateKrogerDeals', () => {
    it('should successfully aggregate Kroger deals', async () => {
      // Setup mocks
      mockKrogerClient.fetchAllDeals.mockResolvedValue([mockKrogerDeal]);

      // Execute
      const result = await dealAggregator.aggregateKrogerDeals();

      // Verify
      expect(result.success).toBe(true);
      expect(result.source).toBe('kroger');
      expect(result.totalDealsProcessed).toBe(1);
      expect(result.newDeals).toBe(1);
      expect(result.updatedDeals).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockKrogerClient.fetchAllDeals).toHaveBeenCalledTimes(1);
      expect(mockStoreRepository.findByChain).toHaveBeenCalledWith(StoreChain.KROGER);
      expect(mockDealRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should handle empty deals from Kroger API', async () => {
      // Setup mocks
      mockKrogerClient.fetchAllDeals.mockResolvedValue([]);

      // Execute
      const result = await dealAggregator.aggregateKrogerDeals();

      // Verify
      expect(result.success).toBe(true);
      expect(result.totalDealsProcessed).toBe(0);
      expect(result.newDeals).toBe(0);
      expect(mockDealRepository.create).not.toHaveBeenCalled();
    });

    it('should handle Kroger API errors gracefully', async () => {
      // Setup mocks
      const error = new Error('Kroger API error');
      mockKrogerClient.fetchAllDeals.mockRejectedValue(error);

      // Execute
      const result = await dealAggregator.aggregateKrogerDeals();

      // Verify
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Kroger API error');
      expect(mockDealRepository.create).not.toHaveBeenCalled();
    });

    it('should handle individual deal processing errors', async () => {
      // Setup mocks - invalid deal with missing title
      const invalidDeal = { ...mockKrogerDeal, title: '' };
      mockKrogerClient.fetchAllDeals.mockResolvedValue([invalidDeal]);

      // Execute
      const result = await dealAggregator.aggregateKrogerDeals();

      // Verify
      expect(result.success).toBe(false); // Less than 50% success rate
      expect(result.totalDealsProcessed).toBe(1);
      expect(result.newDeals).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Title is required');
    });
  });

  describe('aggregatePublixDeals', () => {
    it('should successfully aggregate Publix deals', async () => {
      // Setup mocks
      const scrapingResult: ScrapingResult = {
        success: true,
        deals: [mockPublixScrapedDeal],
        scrapedAt: new Date()
      };
      mockPublixScraper.scrapeDeals.mockResolvedValue(scrapingResult);

      // Execute
      const result = await dealAggregator.aggregatePublixDeals();

      // Verify
      expect(result.success).toBe(true);
      expect(result.source).toBe('publix');
      expect(result.totalDealsProcessed).toBe(1);
      expect(result.newDeals).toBe(1);
      expect(result.updatedDeals).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockPublixScraper.scrapeDeals).toHaveBeenCalledTimes(1);
      expect(mockStoreRepository.findByChain).toHaveBeenCalledWith(StoreChain.PUBLIX);
      expect(mockDealRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should handle scraping failures', async () => {
      // Setup mocks
      const scrapingResult: ScrapingResult = {
        success: false,
        deals: [],
        error: 'Scraping failed',
        scrapedAt: new Date()
      };
      mockPublixScraper.scrapeDeals.mockResolvedValue(scrapingResult);

      // Execute
      const result = await dealAggregator.aggregatePublixDeals();

      // Verify
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Scraping failed');
      expect(mockDealRepository.create).not.toHaveBeenCalled();
    });

    it('should handle empty scraped deals', async () => {
      // Setup mocks
      const scrapingResult: ScrapingResult = {
        success: true,
        deals: [],
        scrapedAt: new Date()
      };
      mockPublixScraper.scrapeDeals.mockResolvedValue(scrapingResult);

      // Execute
      const result = await dealAggregator.aggregatePublixDeals();

      // Verify
      expect(result.success).toBe(true);
      expect(result.totalDealsProcessed).toBe(0);
      expect(result.newDeals).toBe(0);
      expect(mockDealRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('aggregateAllDeals', () => {
    it('should aggregate deals from both sources successfully', async () => {
      // Setup mocks
      mockKrogerClient.fetchAllDeals.mockResolvedValue([mockKrogerDeal]);
      const scrapingResult: ScrapingResult = {
        success: true,
        deals: [mockPublixScrapedDeal],
        scrapedAt: new Date()
      };
      mockPublixScraper.scrapeDeals.mockResolvedValue(scrapingResult);

      // Execute
      const results = await dealAggregator.aggregateAllDeals();

      // Verify
      expect(results).toHaveLength(2);
      expect(results.find(r => r.source === 'kroger')?.success).toBe(true);
      expect(results.find(r => r.source === 'publix')?.success).toBe(true);
      expect(dealAggregator.isAggregationRunning()).toBe(false);
    });

    it('should handle partial failures gracefully', async () => {
      // Setup mocks - Kroger succeeds, Publix fails
      mockKrogerClient.fetchAllDeals.mockResolvedValue([mockKrogerDeal]);
      mockPublixScraper.scrapeDeals.mockRejectedValue(new Error('Publix error'));

      // Execute
      const results = await dealAggregator.aggregateAllDeals();

      // Verify
      expect(results).toHaveLength(2);
      expect(results.find(r => r.source === 'kroger')?.success).toBe(true);
      expect(results.find(r => r.source === 'publix')?.success).toBe(false);
      expect(results.find(r => r.source === 'publix')?.errors).toContain('Publix error');
    });

    it('should prevent concurrent aggregation runs', async () => {
      // Setup mocks with delay
      mockKrogerClient.fetchAllDeals.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );
      mockPublixScraper.scrapeDeals.mockResolvedValue({
        success: true,
        deals: [],
        scrapedAt: new Date()
      });

      // Execute concurrent calls
      const promise1 = dealAggregator.aggregateAllDeals();
      
      // This should throw an error
      await expect(dealAggregator.aggregateAllDeals()).rejects.toThrow('Aggregation is already running');
      
      // Wait for first call to complete
      await promise1;
    });
  });

  describe('cleanupExpiredDeals', () => {
    it('should successfully cleanup expired deals', async () => {
      // Setup mocks
      const expiredDeals = [
        { ...mockKrogerDeal, id: 'expired-1' },
        { ...mockKrogerDeal, id: 'expired-2' }
      ];
      mockDealRepository.findExpired.mockResolvedValue(expiredDeals);

      // Execute
      const result = await dealAggregator.cleanupExpiredDeals();

      // Verify
      expect(result.deletedCount).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockDealRepository.findExpired).toHaveBeenCalledTimes(1);
      expect(mockDealRepository.delete).toHaveBeenCalledTimes(2);
      expect(mockDealRepository.delete).toHaveBeenCalledWith('expired-1');
      expect(mockDealRepository.delete).toHaveBeenCalledWith('expired-2');
    });

    it('should handle no expired deals', async () => {
      // Setup mocks
      mockDealRepository.findExpired.mockResolvedValue([]);

      // Execute
      const result = await dealAggregator.cleanupExpiredDeals();

      // Verify
      expect(result.deletedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockDealRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      // Setup mocks
      const expiredDeals = [{ ...mockKrogerDeal, id: 'expired-1' }];
      mockDealRepository.findExpired.mockResolvedValue(expiredDeals);
      mockDealRepository.delete.mockRejectedValue(new Error('Delete failed'));

      // Execute
      const result = await dealAggregator.cleanupExpiredDeals();

      // Verify
      expect(result.deletedCount).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Delete failed');
    });
  });

  describe('scheduled jobs', () => {
    it('should start and stop scheduled jobs', () => {
      // Start jobs
      dealAggregator.startScheduledJobs();
      
      // Stop jobs
      dealAggregator.stopScheduledJobs();
      
      // No errors should be thrown
      expect(true).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should track aggregation statistics', async () => {
      // Setup mocks
      mockKrogerClient.fetchAllDeals.mockResolvedValue([mockKrogerDeal]);
      const scrapingResult: ScrapingResult = {
        success: true,
        deals: [mockPublixScrapedDeal],
        scrapedAt: new Date()
      };
      mockPublixScraper.scrapeDeals.mockResolvedValue(scrapingResult);

      // Execute
      await dealAggregator.aggregateAllDeals();

      // Verify stats
      const stats = dealAggregator.getStats();
      expect(stats.totalRuns).toBe(1);
      expect(stats.successfulRuns).toBe(1);
      expect(stats.failedRuns).toBe(0);
      expect(stats.totalDealsProcessed).toBe(2);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      // Execute
      await dealAggregator.cleanup();

      // Verify
      expect(mockPublixScraper.cleanup).toHaveBeenCalledTimes(1);
    });
  });
});