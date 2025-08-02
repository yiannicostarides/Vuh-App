/**
 * @jest-environment node
 */

// Mock the database setup to prevent connection attempts
jest.mock('../../tests/setup', () => ({
  setupTestDatabase: jest.fn(),
  cleanTestDatabase: jest.fn(),
  closeTestDatabase: jest.fn(),
}));

// Mock the logger to avoid any database dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

import { PublixScraper, ScrapingResult } from '../../services/PublixScraper';
import { DealType } from '../../types/models';
import puppeteer, { Browser, Page } from 'puppeteer';

const mockPuppeteer = puppeteer as jest.Mocked<typeof puppeteer>;

describe('PublixScraper Unit Tests', () => {
  let scraper: PublixScraper;
  let mockBrowser: jest.Mocked<Browser>;
  let mockPage: jest.Mocked<Page>;

  beforeEach(() => {
    scraper = new PublixScraper();
    
    // Create mock browser and page
    mockPage = {
      goto: jest.fn(),
      setUserAgent: jest.fn(),
      setViewport: jest.fn(),
      setRequestInterception: jest.fn(),
      on: jest.fn(),
      waitForSelector: jest.fn(),
      evaluate: jest.fn(),
      close: jest.fn(),
    } as any;

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    } as any;

    mockPuppeteer.launch.mockResolvedValue(mockBrowser);
  });

  afterEach(async () => {
    if (scraper) {
      await scraper.cleanup();
    }
    jest.clearAllMocks();
  });

  describe('scrapeDeals', () => {
    it('should successfully scrape BOGO and discount deals', async () => {
      // Mock successful navigation
      mockPage.goto.mockResolvedValue({} as any);
      mockPage.waitForSelector.mockResolvedValue({} as any);

      // Mock BOGO deals extraction
      mockPage.evaluate
        .mockResolvedValueOnce([
          {
            title: 'Coca-Cola 12-Pack',
            description: 'Buy One Get One Free',
            originalPrice: 4.99,
            salePrice: 2.50,
            category: 'Beverages',
            dealType: 'bogo',
            imageUrl: 'https://example.com/coke.jpg'
          }
        ])
        .mockResolvedValueOnce([
          {
            title: 'Bread Loaf',
            description: '50% Off Regular Price',
            originalPrice: 2.99,
            salePrice: 1.49,
            category: 'Bakery',
            dealType: 'discount',
            imageUrl: 'https://example.com/bread.jpg'
          }
        ]);

      const result: ScrapingResult = await scraper.scrapeDeals();

      expect(result.success).toBe(true);
      expect(result.deals).toHaveLength(2);
      expect(result.error).toBeUndefined();
      
      // Check BOGO deal
      const bogoDeal = result.deals.find(deal => deal.dealType === DealType.BOGO);
      expect(bogoDeal).toBeDefined();
      expect(bogoDeal?.title).toBe('Coca-Cola 12-Pack');
      expect(bogoDeal?.originalPrice).toBe(4.99);
      expect(bogoDeal?.salePrice).toBe(2.50);
      expect(bogoDeal?.category).toBe('Beverages');

      // Check discount deal
      const discountDeal = result.deals.find(deal => deal.dealType === DealType.DISCOUNT);
      expect(discountDeal).toBeDefined();
      expect(discountDeal?.title).toBe('Bread Loaf');
      expect(discountDeal?.originalPrice).toBe(2.99);
      expect(discountDeal?.salePrice).toBe(1.49);
      expect(discountDeal?.category).toBe('Bakery');

      // Verify browser interactions
      expect(mockPuppeteer.launch).toHaveBeenCalledWith({
        headless: true,
        args: expect.arrayContaining([
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ])
      });
      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://www.publix.com/savings/weekly-ad',
        { waitUntil: 'networkidle2', timeout: 30000 }
      );
      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        '.weekly-ad-container, .deals-container, .ad-container',
        { timeout: 15000 }
      );
    });

    it('should handle navigation errors with retry logic', async () => {
      // Mock navigation failure on first two attempts, success on third
      mockPage.goto
        .mockRejectedValueOnce(new Error('Navigation timeout'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({} as any);
      
      mockPage.waitForSelector.mockResolvedValue({} as any);
      mockPage.evaluate
        .mockResolvedValueOnce([]) // BOGO deals
        .mockResolvedValueOnce([]); // Discount deals

      const result: ScrapingResult = await scraper.scrapeDeals();

      expect(result.success).toBe(true);
      expect(result.deals).toHaveLength(0);
      expect(mockPage.goto).toHaveBeenCalledTimes(3);
    });

    it('should return error result after max retries exceeded', async () => {
      // Mock all attempts to fail
      mockPage.goto.mockRejectedValue(new Error('Persistent network error'));

      const result: ScrapingResult = await scraper.scrapeDeals();

      expect(result.success).toBe(false);
      expect(result.deals).toHaveLength(0);
      expect(result.error).toBe('Persistent network error');
      expect(mockPage.goto).toHaveBeenCalledTimes(3); // Max retries
    });

    it('should handle browser initialization failure', async () => {
      mockPuppeteer.launch.mockRejectedValue(new Error('Browser launch failed'));

      const result: ScrapingResult = await scraper.scrapeDeals();

      expect(result.success).toBe(false);
      expect(result.deals).toHaveLength(0);
      expect(result.error).toBe('Failed to initialize browser for scraping');
    });

    it('should properly close page after scraping', async () => {
      mockPage.goto.mockResolvedValue({} as any);
      mockPage.waitForSelector.mockResolvedValue({} as any);
      mockPage.evaluate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await scraper.scrapeDeals();

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should set proper date ranges for deals', async () => {
      const mockDate = new Date('2024-01-15T10:00:00Z');
      const originalDate = global.Date;
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = originalDate.now;

      mockPage.goto.mockResolvedValue({} as any);
      mockPage.waitForSelector.mockResolvedValue({} as any);
      mockPage.evaluate
        .mockResolvedValueOnce([
          {
            title: 'Test Deal',
            description: 'Test Description',
            originalPrice: 5.99,
            salePrice: 2.99,
            category: 'Test',
            dealType: 'bogo'
          }
        ])
        .mockResolvedValueOnce([]);

      const result = await scraper.scrapeDeals();

      expect(result.success).toBe(true);
      expect(result.deals[0].validFrom).toEqual(mockDate);
      
      const expectedValidUntil = new Date(mockDate);
      expectedValidUntil.setDate(expectedValidUntil.getDate() + 7);
      expect(result.deals[0].validUntil).toEqual(expectedValidUntil);

      global.Date = originalDate;
    });

    it('should filter out deals with invalid prices', async () => {
      mockPage.goto.mockResolvedValue({} as any);
      mockPage.waitForSelector.mockResolvedValue({} as any);

      // Mock deals with invalid prices
      mockPage.evaluate
        .mockResolvedValueOnce([]) // BOGO deals
        .mockResolvedValueOnce([
          {
            title: 'Invalid Deal 1',
            description: 'No discount',
            originalPrice: 5.99,
            salePrice: 5.99, // Same price, no discount
            category: 'Test'
          },
          {
            title: 'Invalid Deal 2',
            description: 'Zero price',
            originalPrice: 5.99,
            salePrice: 0, // Zero sale price
            category: 'Test'
          },
          {
            title: 'Valid Deal',
            description: 'Real discount',
            originalPrice: 5.99,
            salePrice: 3.99,
            category: 'Test'
          }
        ]);

      const result = await scraper.scrapeDeals();

      expect(result.success).toBe(true);
      expect(result.deals).toHaveLength(1);
      expect(result.deals[0].title).toBe('Valid Deal');
    });
  });

  describe('cleanup', () => {
    it('should close browser when cleanup is called', async () => {
      // Initialize browser first
      mockPage.goto.mockResolvedValue({} as any);
      mockPage.waitForSelector.mockResolvedValue({} as any);
      mockPage.evaluate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await scraper.scrapeDeals();
      await scraper.cleanup();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle cleanup when browser is not initialized', async () => {
      // Should not throw error
      await expect(scraper.cleanup()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle page evaluation errors gracefully', async () => {
      mockPage.goto.mockResolvedValue({} as any);
      mockPage.waitForSelector.mockResolvedValue({} as any);
      
      // Mock page.evaluate to throw an error
      mockPage.evaluate.mockRejectedValue(new Error('Page evaluation failed'));

      const result = await scraper.scrapeDeals();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Page evaluation failed');
    });

    it('should handle selector timeout errors', async () => {
      mockPage.goto.mockResolvedValue({} as any);
      mockPage.waitForSelector.mockRejectedValue(new Error('Selector timeout'));

      const result = await scraper.scrapeDeals();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Selector timeout');
    });
  });
});