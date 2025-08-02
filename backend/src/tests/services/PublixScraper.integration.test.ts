/**
 * @jest-environment node
 */

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

// Mock the logger to avoid any database dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

import { PublixScraper } from '../../services/PublixScraper';
import { DealType } from '../../types/models';
import puppeteer, { Browser, Page } from 'puppeteer';

const mockPuppeteer = puppeteer as jest.Mocked<typeof puppeteer>;

describe('PublixScraper Integration Tests', () => {
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

  describe('Integration with mock HTML pages', () => {
    it('should successfully parse deals from mock HTML content', async () => {
      // Mock successful navigation
      mockPage.goto.mockResolvedValue({} as any);
      mockPage.waitForSelector.mockResolvedValue({} as any);

      // Mock HTML parsing results that would come from actual HTML
      mockPage.evaluate
        .mockResolvedValueOnce([
          // BOGO deals extracted from mock HTML
          {
            title: 'Coca-Cola 12-Pack Cans',
            description: 'Buy One Get One Free',
            originalPrice: 4.99,
            salePrice: 2.50,
            category: 'Beverages',
            dealType: 'bogo',
            imageUrl: 'https://example.com/coke.jpg'
          }
        ])
        .mockResolvedValueOnce([
          // Discount deals extracted from mock HTML
          {
            title: 'Ground Beef 80/20',
            description: 'Save $2.00 per lb',
            originalPrice: 5.99,
            salePrice: 3.99,
            category: 'Meat',
            dealType: 'discount',
            imageUrl: 'https://example.com/beef.jpg'
          }
        ]);

      const result = await scraper.scrapeDeals();

      expect(result.success).toBe(true);
      expect(result.deals).toHaveLength(2);
      expect(result.error).toBeUndefined();

      // Verify BOGO deal
      const bogoDeal = result.deals.find(deal => deal.dealType === DealType.BOGO);
      expect(bogoDeal).toBeDefined();
      expect(bogoDeal?.title).toBe('Coca-Cola 12-Pack Cans');
      expect(bogoDeal?.originalPrice).toBe(4.99);
      expect(bogoDeal?.salePrice).toBe(2.50);

      // Verify discount deal
      const discountDeal = result.deals.find(deal => deal.dealType === DealType.DISCOUNT);
      expect(discountDeal).toBeDefined();
      expect(discountDeal?.title).toBe('Ground Beef 80/20');
      expect(discountDeal?.originalPrice).toBe(5.99);
      expect(discountDeal?.salePrice).toBe(3.99);

      // Verify proper navigation occurred
      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://www.publix.com/savings/weekly-ad',
        { waitUntil: 'networkidle2', timeout: 30000 }
      );
    });

    it('should handle empty HTML pages gracefully', async () => {
      mockPage.goto.mockResolvedValue({} as any);
      mockPage.waitForSelector.mockResolvedValue({} as any);
      mockPage.evaluate
        .mockResolvedValueOnce([]) // No BOGO deals
        .mockResolvedValueOnce([]); // No discount deals

      const result = await scraper.scrapeDeals();

      expect(result.success).toBe(true);
      expect(result.deals).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });

    it('should filter invalid deals from HTML parsing', async () => {
      mockPage.goto.mockResolvedValue({} as any);
      mockPage.waitForSelector.mockResolvedValue({} as any);
      mockPage.evaluate
        .mockResolvedValueOnce([]) // No BOGO deals
        .mockResolvedValueOnce([
          // Valid deal
          {
            title: 'Valid Deal',
            description: 'Real discount',
            originalPrice: 10.99,
            salePrice: 7.99,
            category: 'Test',
            dealType: 'discount'
          },
          // Invalid deal - no discount
          {
            title: 'Invalid Deal',
            description: 'Same price',
            originalPrice: 5.99,
            salePrice: 5.99,
            category: 'Test',
            dealType: 'discount'
          }
        ]);

      const result = await scraper.scrapeDeals();

      expect(result.success).toBe(true);
      expect(result.deals).toHaveLength(1);
      expect(result.deals[0].title).toBe('Valid Deal');
    });

    it('should handle HTML parsing errors gracefully', async () => {
      mockPage.goto.mockResolvedValue({} as any);
      mockPage.waitForSelector.mockResolvedValue({} as any);
      mockPage.evaluate.mockRejectedValue(new Error('HTML parsing failed'));

      const result = await scraper.scrapeDeals();

      expect(result.success).toBe(false);
      expect(result.deals).toHaveLength(0);
      expect(result.error).toBe('HTML parsing failed');
    });

    it('should handle missing selectors in HTML', async () => {
      mockPage.goto.mockResolvedValue({} as any);
      mockPage.waitForSelector.mockRejectedValue(new Error('Selector not found'));

      const result = await scraper.scrapeDeals();

      expect(result.success).toBe(false);
      expect(result.deals).toHaveLength(0);
      expect(result.error).toBe('Selector not found');
    });

    it('should properly set date ranges for scraped deals', async () => {
      const testDate = new Date('2024-01-15T10:00:00Z');
      const originalDate = global.Date;
      global.Date = jest.fn(() => testDate) as any;
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
      expect(result.deals[0].validFrom).toEqual(testDate);
      
      const expectedValidUntil = new Date(testDate);
      expectedValidUntil.setDate(expectedValidUntil.getDate() + 7);
      expect(result.deals[0].validUntil).toEqual(expectedValidUntil);

      global.Date = originalDate;
    });

    it('should properly configure browser and page settings', async () => {
      mockPage.goto.mockResolvedValue({} as any);
      mockPage.waitForSelector.mockResolvedValue({} as any);
      mockPage.evaluate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await scraper.scrapeDeals();

      // Verify browser launch configuration
      expect(mockPuppeteer.launch).toHaveBeenCalledWith({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      // Verify page configuration
      expect(mockPage.setUserAgent).toHaveBeenCalledWith(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );
      expect(mockPage.setViewport).toHaveBeenCalledWith({ width: 1920, height: 1080 });
      expect(mockPage.setRequestInterception).toHaveBeenCalledWith(true);
    });
  });

  describe('End-to-end workflow simulation', () => {
    it('should complete full scraping workflow with retry logic', async () => {
      // Simulate first attempt failure, second attempt success
      mockPage.goto
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({} as any);
      
      mockPage.waitForSelector.mockResolvedValue({} as any);
      mockPage.evaluate
        .mockResolvedValueOnce([
          {
            title: 'Retry Success Deal',
            description: 'Deal found after retry',
            originalPrice: 3.99,
            salePrice: 1.99,
            category: 'Test',
            dealType: 'bogo'
          }
        ])
        .mockResolvedValueOnce([]);

      const result = await scraper.scrapeDeals();

      expect(result.success).toBe(true);
      expect(result.deals).toHaveLength(1);
      expect(result.deals[0].title).toBe('Retry Success Deal');
      expect(mockPage.goto).toHaveBeenCalledTimes(2); // First failed, second succeeded
    });

    it('should properly cleanup resources after scraping', async () => {
      mockPage.goto.mockResolvedValue({} as any);
      mockPage.waitForSelector.mockResolvedValue({} as any);
      mockPage.evaluate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await scraper.scrapeDeals();

      // Verify page was closed after scraping
      expect(mockPage.close).toHaveBeenCalled();

      // Verify browser cleanup
      await scraper.cleanup();
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });
});