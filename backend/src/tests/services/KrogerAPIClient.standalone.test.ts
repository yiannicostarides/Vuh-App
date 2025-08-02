import axios from 'axios';
import { KrogerAPIClient } from '../../services/KrogerAPIClient';
import { DealType, StoreChain } from '../../types/models';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Override jest setup to avoid database connection
jest.mock('../setup', () => ({}));

describe('KrogerAPIClient (Standalone)', () => {
  let krogerClient: KrogerAPIClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.KROGER_CLIENT_ID = 'test-client-id';
    process.env.KROGER_CLIENT_SECRET = 'test-client-secret';

    // Mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Mock the authentication endpoint
    mockedAxios.post.mockResolvedValue({
      data: {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'product.compact',
      },
    });

    krogerClient = new KrogerAPIClient();
  });

  afterEach(() => {
    delete process.env.KROGER_CLIENT_ID;
    delete process.env.KROGER_CLIENT_SECRET;
  });

  describe('constructor', () => {
    it('should throw error if credentials are missing', () => {
      delete process.env.KROGER_CLIENT_ID;
      delete process.env.KROGER_CLIENT_SECRET;

      expect(() => new KrogerAPIClient()).toThrow('Kroger API credentials not found in environment variables');
    });

    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.kroger.com/v1',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
    });

    it('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('fetchDigitalCoupons', () => {
    const mockCouponsResponse = {
      data: {
        data: [
          {
            couponId: 'coupon-1',
            categoryId: 'cat-1',
            categoryName: 'Dairy',
            brandName: 'Test Brand',
            description: 'Save $1 on Test Product',
            shortDescription: '$1 off Test Product',
            value: 1.00,
            valueType: 'DOLLAR_OFF',
            minimumPurchase: 5.00,
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2024-01-31T23:59:59Z',
            items: [
              {
                upc: '123456789012',
                description: 'Test Product',
                brand: 'Test Brand',
                size: '16 oz',
              },
            ],
            images: [
              {
                id: 'img-1',
                perspective: 'front',
                featured: true,
                sizes: [
                  {
                    id: 'size-1',
                    size: 'medium',
                    url: 'https://example.com/image.jpg',
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    beforeEach(() => {
      mockAxiosInstance.get.mockResolvedValue(mockCouponsResponse);
    });

    it('should fetch digital coupons successfully', async () => {
      const deals = await krogerClient.fetchDigitalCoupons();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/coupons', {
        params: { 'filter.limit': 50 },
      });

      expect(deals).toHaveLength(1);
      expect(deals[0]).toMatchObject({
        id: 'kroger-coupon-coupon-1',
        storeName: StoreChain.KROGER,
        title: '$1 off Test Product',
        description: 'Save $1 on Test Product',
        originalPrice: 5.00,
        salePrice: 4.00,
        discountPercentage: 20,
        dealType: DealType.COUPON,
        category: 'Dairy',
        itemIds: ['123456789012'],
        restrictions: 'Minimum purchase: $5',
        imageUrl: 'https://example.com/image.jpg',
      });
    });

    it('should include location filter when provided', async () => {
      await krogerClient.fetchDigitalCoupons('location-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/coupons', {
        params: {
          'filter.limit': 50,
          'filter.locationId': 'location-123',
        },
      });
    });

    it('should handle PERCENT_OFF coupon type', async () => {
      const percentOffResponse = {
        data: {
          data: [
            {
              ...mockCouponsResponse.data.data[0],
              value: 25,
              valueType: 'PERCENT_OFF',
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(percentOffResponse);

      const deals = await krogerClient.fetchDigitalCoupons();

      expect(deals[0]).toMatchObject({
        originalPrice: 5.00,
        salePrice: 3.75,
        discountPercentage: 25,
        dealType: DealType.COUPON,
      });
    });

    it('should handle BOGO coupon type', async () => {
      const bogoResponse = {
        data: {
          data: [
            {
              ...mockCouponsResponse.data.data[0],
              valueType: 'BOGO',
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(bogoResponse);

      const deals = await krogerClient.fetchDigitalCoupons();

      expect(deals[0]).toMatchObject({
        originalPrice: 5.00,
        salePrice: 2.50,
        discountPercentage: 50,
        dealType: DealType.BOGO,
      });
    });

    it('should handle API errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      await expect(krogerClient.fetchDigitalCoupons()).rejects.toThrow('Failed to fetch Kroger digital coupons');
    });
  });

  describe('fetchPromotions', () => {
    const mockPromotionsResponse = {
      data: {
        data: [
          {
            promotionId: 'promo-1',
            description: 'Weekly Sale on Dairy Products',
            shortDescription: 'Dairy Sale',
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2024-01-07T23:59:59Z',
            promotionType: 'SALE',
            items: [
              {
                upc: '987654321098',
                description: 'Milk 2%',
                brand: 'Local Farm',
                size: '1 gallon',
                price: {
                  regular: 4.99,
                  promo: 3.99,
                },
              },
              {
                upc: '876543210987',
                description: 'Cheese Slices',
                brand: 'Dairy Co',
                size: '8 oz',
                price: {
                  regular: 5.49,
                  promo: 4.49,
                },
              },
            ],
          },
        ],
      },
    };

    beforeEach(() => {
      mockAxiosInstance.get.mockResolvedValue(mockPromotionsResponse);
    });

    it('should fetch promotions successfully', async () => {
      const deals = await krogerClient.fetchPromotions();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/promotions', {
        params: { 'filter.limit': 50 },
      });

      expect(deals).toHaveLength(2);
      
      expect(deals[0]).toMatchObject({
        id: 'kroger-promo-promo-1-987654321098',
        storeName: StoreChain.KROGER,
        title: 'Milk 2%',
        description: 'Dairy Sale - Local Farm 1 gallon',
        originalPrice: 4.99,
        salePrice: 3.99,
        discountPercentage: 20.04,
        dealType: DealType.DISCOUNT,
        itemIds: ['987654321098'],
      });

      expect(deals[1]).toMatchObject({
        id: 'kroger-promo-promo-1-876543210987',
        storeName: StoreChain.KROGER,
        title: 'Cheese Slices',
        description: 'Dairy Sale - Dairy Co 8 oz',
        originalPrice: 5.49,
        salePrice: 4.49,
        discountPercentage: 18.21,
        dealType: DealType.DISCOUNT,
        itemIds: ['876543210987'],
      });
    });

    it('should include location filter when provided', async () => {
      await krogerClient.fetchPromotions('location-456');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/promotions', {
        params: {
          'filter.limit': 50,
          'filter.locationId': 'location-456',
        },
      });
    });

    it('should handle BOGO promotion type', async () => {
      const bogoResponse = {
        data: {
          data: [
            {
              ...mockPromotionsResponse.data.data[0],
              promotionType: 'BOGO',
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(bogoResponse);

      const deals = await krogerClient.fetchPromotions();

      expect(deals[0]).toMatchObject({
        dealType: DealType.BOGO,
      });
    });

    it('should handle API errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      await expect(krogerClient.fetchPromotions()).rejects.toThrow('Failed to fetch Kroger promotions');
    });
  });

  describe('fetchAllDeals', () => {
    beforeEach(() => {
      // Mock both endpoints
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: {
            data: [
              {
                couponId: 'coupon-1',
                categoryName: 'Dairy',
                description: 'Test Coupon',
                shortDescription: 'Test',
                value: 1.00,
                valueType: 'DOLLAR_OFF',
                minimumPurchase: 5.00,
                startDate: '2024-01-01T00:00:00Z',
                endDate: '2024-01-31T23:59:59Z',
                items: [{ upc: '123456789012' }],
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: [
              {
                promotionId: 'promo-1',
                description: 'Test Promotion',
                shortDescription: 'Test Promo',
                startDate: '2024-01-01T00:00:00Z',
                endDate: '2024-01-07T23:59:59Z',
                promotionType: 'SALE',
                items: [
                  {
                    upc: '987654321098',
                    description: 'Test Item',
                    brand: 'Test Brand',
                    size: '1 unit',
                    price: { regular: 4.99, promo: 3.99 },
                  },
                ],
              },
            ],
          },
        });
    });

    it('should fetch all deals successfully', async () => {
      const deals = await krogerClient.fetchAllDeals();

      expect(deals).toHaveLength(2);
      expect(deals[0].id).toContain('kroger-coupon-');
      expect(deals[1].id).toContain('kroger-promo-');
    });

    it('should handle partial failures gracefully', async () => {
      // Mock coupon fetch to fail, promotion to succeed
      mockAxiosInstance.get
        .mockRejectedValueOnce(new Error('Coupon API Error'))
        .mockResolvedValueOnce({
          data: {
            data: [
              {
                promotionId: 'promo-1',
                description: 'Test Promotion',
                shortDescription: 'Test Promo',
                startDate: '2024-01-01T00:00:00Z',
                endDate: '2024-01-07T23:59:59Z',
                promotionType: 'SALE',
                items: [
                  {
                    upc: '987654321098',
                    description: 'Test Item',
                    brand: 'Test Brand',
                    size: '1 unit',
                    price: { regular: 4.99, promo: 3.99 },
                  },
                ],
              },
            ],
          },
        });

      const deals = await krogerClient.fetchAllDeals();

      // Should still return the successful promotion
      expect(deals).toHaveLength(1);
      expect(deals[0].id).toContain('kroger-promo-');
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { data: [] },
      });

      const result = await krogerClient.testConnection();

      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/coupons', {
        params: { 'filter.limit': 1 },
      });
    });

    it('should return false for failed connection', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection failed'));

      const result = await krogerClient.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return current rate limit status', () => {
      const status = krogerClient.getRateLimitStatus();

      expect(status).toHaveProperty('requestCount');
      expect(status).toHaveProperty('windowStart');
      expect(status).toHaveProperty('maxRequests');
      expect(status.maxRequests).toBe(100);
    });
  });
});