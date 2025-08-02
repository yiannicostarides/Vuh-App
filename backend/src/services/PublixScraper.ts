import puppeteer, { Browser, Page } from 'puppeteer';
import { Deal, DealType, StoreChain } from '../types/models';
import { logger } from '../utils/logger';

export interface ScrapedDeal {
  title: string;
  description: string;
  originalPrice: number;
  salePrice: number;
  dealType: DealType;
  validFrom: Date;
  validUntil: Date;
  category: string;
  restrictions?: string;
  imageUrl?: string;
}

export interface ScrapingResult {
  success: boolean;
  deals: ScrapedDeal[];
  error?: string;
  scrapedAt: Date;
}

export class PublixScraper {
  private browser: Browser | null = null;
  private readonly baseUrl = 'https://www.publix.com/savings/weekly-ad';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // Base delay in milliseconds

  constructor() {
    logger.info('PublixScraper initialized');
  }

  /**
   * Initialize the browser instance
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) {
      return;
    }

    try {
      this.browser = await puppeteer.launch({
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
      logger.info('Puppeteer browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Puppeteer browser', { error });
      throw new Error('Failed to initialize browser for scraping');
    }
  }

  /**
   * Close the browser instance
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Puppeteer browser closed');
    }
  }

  /**
   * Create a new page with proper configuration
   */
  private async createPage(): Promise<Page> {
    if (!this.browser) {
      await this.initBrowser();
    }

    const page = await this.browser!.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set request interception to block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'stylesheet' || resourceType === 'font' || resourceType === 'media') {
        req.abort();
      } else {
        req.continue();
      }
    });

    return page;
  }

  /**
   * Navigate to weekly ad page with retry logic
   */
  private async navigateToWeeklyAd(page: Page): Promise<void> {
    await page.goto(this.baseUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for the weekly ad content to load
    await page.waitForSelector('.weekly-ad-container, .deals-container, .ad-container', {
      timeout: 15000
    });

    logger.info('Successfully navigated to Publix weekly ad page');
  }

  /**
   * Extract BOGO deals from the page
   */
  private async extractBOGODeals(page: Page): Promise<ScrapedDeal[]> {
    const bogoDeals = await page.evaluate(() => {
      const deals: any[] = [];
      
      // Look for BOGO deal elements (these selectors may need adjustment based on actual HTML)
      const bogoElements = document.querySelectorAll('[data-deal-type="bogo"], .bogo-deal, .buy-one-get-one');
      
      bogoElements.forEach((element) => {
        try {
          const titleElement = element.querySelector('.deal-title, .product-title, h3, h4');
          const descElement = element.querySelector('.deal-description, .product-description, .description');
          const priceElement = element.querySelector('.price, .deal-price, .original-price');
          const imageElement = element.querySelector('img');
          const categoryElement = element.querySelector('.category, .deal-category');
          
          if (titleElement && priceElement) {
            const title = titleElement.textContent?.trim() || '';
            const description = descElement?.textContent?.trim() || title;
            const priceText = priceElement.textContent?.trim() || '';
            const imageUrl = imageElement?.getAttribute('src') || '';
            const category = categoryElement?.textContent?.trim() || 'General';
            
            // Extract price from text (e.g., "$4.99" -> 4.99)
            const priceMatch = priceText.match(/\$?(\d+\.?\d*)/);
            const originalPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;
            
            deals.push({
              title,
              description,
              originalPrice,
              salePrice: originalPrice / 2, // BOGO typically means 50% off
              priceText,
              imageUrl,
              category,
              dealType: 'bogo'
            });
          }
        } catch (error) {
          console.error('Error extracting BOGO deal:', error);
        }
      });
      
      return deals;
    });

    return this.transformScrapedDeals(bogoDeals, DealType.BOGO);
  }

  /**
   * Extract discount deals from the page
   */
  private async extractDiscountDeals(page: Page): Promise<ScrapedDeal[]> {
    const discountDeals = await page.evaluate(() => {
      const deals: any[] = [];
      
      // Look for discount deal elements
      const discountElements = document.querySelectorAll('.discount-deal, .sale-item, .weekly-ad-item');
      
      discountElements.forEach((element) => {
        try {
          const titleElement = element.querySelector('.deal-title, .product-title, h3, h4');
          const descElement = element.querySelector('.deal-description, .product-description, .description');
          const originalPriceElement = element.querySelector('.original-price, .was-price');
          const salePriceElement = element.querySelector('.sale-price, .now-price, .deal-price');
          const imageElement = element.querySelector('img');
          const categoryElement = element.querySelector('.category, .deal-category');
          
          if (titleElement && (originalPriceElement || salePriceElement)) {
            const title = titleElement.textContent?.trim() || '';
            const description = descElement?.textContent?.trim() || title;
            const originalPriceText = originalPriceElement?.textContent?.trim() || '';
            const salePriceText = salePriceElement?.textContent?.trim() || '';
            const imageUrl = imageElement?.getAttribute('src') || '';
            const category = categoryElement?.textContent?.trim() || 'General';
            
            // Extract prices
            const originalPriceMatch = originalPriceText.match(/\$?(\d+\.?\d*)/);
            const salePriceMatch = salePriceText.match(/\$?(\d+\.?\d*)/);
            
            const originalPrice = originalPriceMatch ? parseFloat(originalPriceMatch[1]) : 0;
            const salePrice = salePriceMatch ? parseFloat(salePriceMatch[1]) : originalPrice;
            
            // Only include if there's actually a discount
            if (originalPrice > salePrice && salePrice > 0) {
              deals.push({
                title,
                description,
                originalPrice,
                salePrice,
                imageUrl,
                category,
                dealType: 'discount'
              });
            }
          }
        } catch (error) {
          console.error('Error extracting discount deal:', error);
        }
      });
      
      return deals;
    });

    return this.transformScrapedDeals(discountDeals, DealType.DISCOUNT);
  }

  /**
   * Transform scraped deal data into proper ScrapedDeal objects
   */
  private transformScrapedDeals(rawDeals: any[], dealType: DealType): ScrapedDeal[] {
    const currentDate = new Date();
    const validFrom = new Date(currentDate);
    const validUntil = new Date(currentDate);
    validUntil.setDate(validUntil.getDate() + 7); // Assume weekly deals are valid for 7 days

    return rawDeals.map((deal) => ({
      title: deal.title,
      description: deal.description,
      originalPrice: deal.originalPrice,
      salePrice: deal.salePrice,
      dealType,
      validFrom,
      validUntil,
      category: deal.category,
      imageUrl: deal.imageUrl || undefined,
      restrictions: undefined
    }));
  }

  /**
   * Scrape deals with retry logic and exponential backoff
   */
  public async scrapeDeals(): Promise<ScrapingResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Starting Publix scraping attempt ${attempt}/${this.maxRetries}`);
        
        const page = await this.createPage();
        
        try {
          await this.navigateToWeeklyAd(page);
          
          // Extract both BOGO and discount deals
          const [bogoDeals, discountDeals] = await Promise.all([
            this.extractBOGODeals(page),
            this.extractDiscountDeals(page)
          ]);
          
          const allDeals = [...bogoDeals, ...discountDeals];
          
          logger.info(`Successfully scraped ${allDeals.length} deals from Publix`, {
            bogoCount: bogoDeals.length,
            discountCount: discountDeals.length
          });
          
          return {
            success: true,
            deals: allDeals,
            scrapedAt: new Date()
          };
          
        } finally {
          await page.close();
        }
        
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Publix scraping attempt ${attempt} failed`, { 
          error: error instanceof Error ? error.message : String(error),
          attempt 
        });
        
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          logger.info(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    logger.error('All Publix scraping attempts failed', { 
      error: lastError?.message,
      maxRetries: this.maxRetries 
    });
    
    return {
      success: false,
      deals: [],
      error: lastError?.message || 'Unknown scraping error',
      scrapedAt: new Date()
    };
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    await this.closeBrowser();
    logger.info('PublixScraper cleanup completed');
  }
}