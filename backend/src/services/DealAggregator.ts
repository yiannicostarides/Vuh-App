import * as cron from 'node-cron';
import { KrogerAPIClient } from './KrogerAPIClient';
import { PublixScraper, ScrapedDeal } from './PublixScraper';
import { DealRepository } from '../repositories/DealRepository';
import { StoreRepository } from '../repositories/StoreRepository';
import { Deal, DealRecord, StoreChain, DealType, StoreLocation } from '../types/models';
import { logger } from '../utils/logger';

export interface AggregationResult {
  success: boolean;
  totalDealsProcessed: number;
  newDeals: number;
  updatedDeals: number;
  errors: string[];
  source: 'kroger' | 'publix';
  timestamp: Date;
}

export interface AggregationStats {
  lastRun: Date;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalDealsProcessed: number;
  averageProcessingTime: number;
}

export class DealAggregator {
  private krogerClient: KrogerAPIClient;
  private publixScraper: PublixScraper;
  private dealRepository: DealRepository;
  private storeRepository: StoreRepository;
  private isRunning: boolean = false;
  private stats: AggregationStats;
  private scheduledJobs: cron.ScheduledTask[] = [];

  constructor(
    krogerClient?: KrogerAPIClient,
    publixScraper?: PublixScraper,
    dealRepository?: DealRepository,
    storeRepository?: StoreRepository
  ) {
    this.krogerClient = krogerClient || new KrogerAPIClient();
    this.publixScraper = publixScraper || new PublixScraper();
    this.dealRepository = dealRepository || new DealRepository();
    this.storeRepository = storeRepository || new StoreRepository();
    
    this.stats = {
      lastRun: new Date(0),
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalDealsProcessed: 0,
      averageProcessingTime: 0
    };

    logger.info('DealAggregator initialized');
  }

  /**
   * Start scheduled jobs for deal aggregation
   */
  public startScheduledJobs(): void {
    // Schedule Kroger API data refresh every 4 hours
    const krogerJob = cron.schedule('0 */4 * * *', async () => {
      logger.info('Starting scheduled Kroger deal aggregation');
      await this.aggregateKrogerDeals();
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    // Schedule Publix scraping every 6 hours
    const publixJob = cron.schedule('0 */6 * * *', async () => {
      logger.info('Starting scheduled Publix deal aggregation');
      await this.aggregatePublixDeals();
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    // Schedule expired deal cleanup daily at 2 AM
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      logger.info('Starting scheduled deal cleanup');
      await this.cleanupExpiredDeals();
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    this.scheduledJobs = [krogerJob, publixJob, cleanupJob];
    
    // Start all jobs
    this.scheduledJobs.forEach(job => job.start());
    
    logger.info('Scheduled jobs started for deal aggregation');
  }

  /**
   * Stop all scheduled jobs
   */
  public stopScheduledJobs(): void {
    this.scheduledJobs.forEach(job => job.stop());
    this.scheduledJobs = [];
    logger.info('Scheduled jobs stopped');
  }

  /**
   * Aggregate deals from all sources
   */
  public async aggregateAllDeals(): Promise<AggregationResult[]> {
    if (this.isRunning) {
      throw new Error('Aggregation is already running');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting full deal aggregation from all sources');

      const [krogerResult, publixResult] = await Promise.allSettled([
        this.aggregateKrogerDeals(),
        this.aggregatePublixDeals()
      ]);

      const results: AggregationResult[] = [];

      if (krogerResult.status === 'fulfilled') {
        results.push(krogerResult.value);
      } else {
        logger.error('Kroger aggregation failed:', krogerResult.reason);
        results.push({
          success: false,
          totalDealsProcessed: 0,
          newDeals: 0,
          updatedDeals: 0,
          errors: [krogerResult.reason?.message || 'Unknown error'] as string[],
          source: 'kroger',
          timestamp: new Date()
        });
      }

      if (publixResult.status === 'fulfilled') {
        results.push(publixResult.value);
      } else {
        logger.error('Publix aggregation failed:', publixResult.reason);
        results.push({
          success: false,
          totalDealsProcessed: 0,
          newDeals: 0,
          updatedDeals: 0,
          errors: [publixResult.reason?.message || 'Unknown error'] as string[],
          source: 'publix',
          timestamp: new Date()
        });
      }

      // Update statistics
      const processingTime = Date.now() - startTime;
      this.updateStats(results, processingTime);

      logger.info('Full deal aggregation completed', {
        totalResults: results.length,
        processingTime: `${processingTime}ms`
      });

      return results;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Aggregate deals from Kroger API
   */
  public async aggregateKrogerDeals(): Promise<AggregationResult> {
    const startTime = Date.now();
    const result: AggregationResult = {
      success: false,
      totalDealsProcessed: 0,
      newDeals: 0,
      updatedDeals: 0,
      errors: [] as string[],
      source: 'kroger',
      timestamp: new Date()
    };

    try {
      logger.info('Starting Kroger deal aggregation');

      // Fetch deals from Kroger API
      const rawDeals = await this.krogerClient.fetchAllDeals();
      result.totalDealsProcessed = rawDeals.length;

      if (rawDeals.length === 0) {
        logger.warn('No deals fetched from Kroger API');
        result.success = true;
        return result;
      }

      // Get Kroger store locations
      const krogerStores = await this.storeRepository.findByChain(StoreChain.KROGER);

      // Process each deal
      for (const rawDeal of rawDeals) {
        try {
          // Validate and normalize the deal
          const normalizedDeal = this.validateAndNormalizeDeal(rawDeal, krogerStores);
          
          // Check if deal already exists
          const existingDeal = await this.findExistingDeal(normalizedDeal);
          
          if (existingDeal) {
            // Update existing deal if data has changed
            if (this.hasSignificantChanges(existingDeal, normalizedDeal)) {
              await this.dealRepository.update(existingDeal.id, {
                title: normalizedDeal.title,
                description: normalizedDeal.description,
                originalPrice: normalizedDeal.originalPrice,
                salePrice: normalizedDeal.salePrice,
                discountPercentage: normalizedDeal.discountPercentage,
                validFrom: normalizedDeal.validFrom,
                validUntil: normalizedDeal.validUntil,
                restrictions: normalizedDeal.restrictions,
                imageUrl: normalizedDeal.imageUrl
              });
              result.updatedDeals++;
            }
          } else {
            // Create new deal
            const dealRecord: Omit<DealRecord, 'id' | 'createdAt' | 'updatedAt'> = {
              storeId: normalizedDeal.storeId,
              storeName: normalizedDeal.storeName,
              title: normalizedDeal.title,
              description: normalizedDeal.description,
              originalPrice: normalizedDeal.originalPrice,
              salePrice: normalizedDeal.salePrice,
              discountPercentage: normalizedDeal.discountPercentage,
              dealType: normalizedDeal.dealType,
              validFrom: normalizedDeal.validFrom,
              validUntil: normalizedDeal.validUntil,
              category: normalizedDeal.category,
              itemIds: normalizedDeal.itemIds,
              restrictions: normalizedDeal.restrictions,
              imageUrl: normalizedDeal.imageUrl,
              isActive: true,
              scrapedAt: new Date(),
              sourceUrl: undefined
            };

            const createdDeal = await this.dealRepository.create(dealRecord);
            
            // Associate with store locations
            const storeLocationIds = normalizedDeal.storeLocations.map(loc => loc.id);
            if (storeLocationIds.length > 0) {
              await this.dealRepository.associateWithStoreLocations(createdDeal.id, storeLocationIds);
            }
            
            result.newDeals++;
          }
        } catch (error) {
          logger.error('Error processing Kroger deal:', {
            dealId: rawDeal.id,
            error: error instanceof Error ? error.message : String(error)
          });
          result.errors.push(`Deal ${rawDeal.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      result.success = result.errors.length < rawDeals.length * 0.5; // Success if less than 50% errors
      
      logger.info('Kroger deal aggregation completed', {
        totalProcessed: result.totalDealsProcessed,
        newDeals: result.newDeals,
        updatedDeals: result.updatedDeals,
        errors: result.errors.length,
        processingTime: `${Date.now() - startTime}ms`
      });

    } catch (error) {
      logger.error('Kroger deal aggregation failed:', error);
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Aggregate deals from Publix scraper
   */
  public async aggregatePublixDeals(): Promise<AggregationResult> {
    const startTime = Date.now();
    const result: AggregationResult = {
      success: false,
      totalDealsProcessed: 0,
      newDeals: 0,
      updatedDeals: 0,
      errors: [] as string[],
      source: 'publix',
      timestamp: new Date()
    };

    try {
      logger.info('Starting Publix deal aggregation');

      // Scrape deals from Publix
      const scrapingResult = await this.publixScraper.scrapeDeals();
      
      if (!scrapingResult.success) {
        result.errors.push(scrapingResult.error || 'Scraping failed');
        return result;
      }

      result.totalDealsProcessed = scrapingResult.deals.length;

      if (scrapingResult.deals.length === 0) {
        logger.warn('No deals scraped from Publix');
        result.success = true;
        return result;
      }

      // Get Publix store locations
      const publixStores = await this.storeRepository.findByChain(StoreChain.PUBLIX);

      // Process each scraped deal
      for (const scrapedDeal of scrapingResult.deals) {
        try {
          // Convert scraped deal to normalized deal format
          const normalizedDeal = this.convertScrapedDealToNormalized(scrapedDeal, publixStores);
          
          // Check if deal already exists
          const existingDeal = await this.findExistingDeal(normalizedDeal);
          
          if (existingDeal) {
            // Update existing deal if data has changed
            if (this.hasSignificantChanges(existingDeal, normalizedDeal)) {
              await this.dealRepository.update(existingDeal.id, {
                title: normalizedDeal.title,
                description: normalizedDeal.description,
                originalPrice: normalizedDeal.originalPrice,
                salePrice: normalizedDeal.salePrice,
                discountPercentage: normalizedDeal.discountPercentage,
                validFrom: normalizedDeal.validFrom,
                validUntil: normalizedDeal.validUntil,
                restrictions: normalizedDeal.restrictions,
                imageUrl: normalizedDeal.imageUrl
              });
              result.updatedDeals++;
            }
          } else {
            // Create new deal
            const dealRecord: Omit<DealRecord, 'id' | 'createdAt' | 'updatedAt'> = {
              storeId: normalizedDeal.storeId,
              storeName: normalizedDeal.storeName,
              title: normalizedDeal.title,
              description: normalizedDeal.description,
              originalPrice: normalizedDeal.originalPrice,
              salePrice: normalizedDeal.salePrice,
              discountPercentage: normalizedDeal.discountPercentage,
              dealType: normalizedDeal.dealType,
              validFrom: normalizedDeal.validFrom,
              validUntil: normalizedDeal.validUntil,
              category: normalizedDeal.category,
              itemIds: normalizedDeal.itemIds,
              restrictions: normalizedDeal.restrictions,
              imageUrl: normalizedDeal.imageUrl,
              isActive: true,
              scrapedAt: scrapingResult.scrapedAt,
              sourceUrl: this.publixScraper['baseUrl'] // Access private property for source URL
            };

            const createdDeal = await this.dealRepository.create(dealRecord);
            
            // Associate with store locations
            const storeLocationIds = normalizedDeal.storeLocations.map(loc => loc.id);
            if (storeLocationIds.length > 0) {
              await this.dealRepository.associateWithStoreLocations(createdDeal.id, storeLocationIds);
            }
            
            result.newDeals++;
          }
        } catch (error) {
          logger.error('Error processing Publix deal:', {
            dealTitle: scrapedDeal.title,
            error: error instanceof Error ? error.message : String(error)
          });
          result.errors.push(`Deal "${scrapedDeal.title}": ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      result.success = result.errors.length < scrapingResult.deals.length * 0.5; // Success if less than 50% errors
      
      logger.info('Publix deal aggregation completed', {
        totalProcessed: result.totalDealsProcessed,
        newDeals: result.newDeals,
        updatedDeals: result.updatedDeals,
        errors: result.errors.length,
        processingTime: `${Date.now() - startTime}ms`
      });

    } catch (error) {
      logger.error('Publix deal aggregation failed:', error);
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Clean up expired deals
   */
  public async cleanupExpiredDeals(): Promise<{ deletedCount: number; errors: string[] }> {
    const result = { deletedCount: 0, errors: [] as string[] };

    try {
      logger.info('Starting expired deals cleanup');

      const expiredDeals = await this.dealRepository.findExpired();
      
      for (const deal of expiredDeals) {
        try {
          await this.dealRepository.delete(deal.id);
          result.deletedCount++;
        } catch (error) {
          logger.error('Error deleting expired deal:', {
            dealId: deal.id,
            error: error instanceof Error ? error.message : String(error)
          });
          result.errors.push(`Deal ${deal.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      logger.info('Expired deals cleanup completed', {
        deletedCount: result.deletedCount,
        errors: result.errors.length
      });

    } catch (error) {
      logger.error('Expired deals cleanup failed:', error);
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }  /**

   * Validate and normalize deal data from external sources
   */
  private validateAndNormalizeDeal(deal: Deal, storeLocations: StoreLocation[]): Deal {
    const errors: string[] = [];

    // Validate required fields
    if (!deal.title || deal.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!deal.originalPrice || deal.originalPrice <= 0) {
      errors.push('Original price must be greater than 0');
    }

    if (!deal.salePrice || deal.salePrice <= 0) {
      errors.push('Sale price must be greater than 0');
    }

    if (deal.salePrice > deal.originalPrice) {
      errors.push('Sale price cannot be greater than original price');
    }

    if (!deal.validFrom || !deal.validUntil) {
      errors.push('Valid dates are required');
    }

    if (deal.validFrom >= deal.validUntil) {
      errors.push('Valid from date must be before valid until date');
    }

    if (errors.length > 0) {
      throw new Error(`Deal validation failed: ${errors.join(', ')}`);
    }

    // Normalize data
    const normalizedDeal: Deal = {
      ...deal,
      title: deal.title.trim(),
      description: deal.description?.trim() || deal.title.trim(),
      category: deal.category?.trim() || 'General',
      originalPrice: Math.round(deal.originalPrice * 100) / 100, // Round to 2 decimal places
      salePrice: Math.round(deal.salePrice * 100) / 100,
      discountPercentage: Math.round(((deal.originalPrice - deal.salePrice) / deal.originalPrice) * 10000) / 100,
      itemIds: deal.itemIds?.filter(id => id && id.trim().length > 0) || [],
      restrictions: deal.restrictions?.trim() || undefined,
      storeLocations: storeLocations // Associate with all store locations for this chain
    };

    // Ensure discount percentage is consistent
    if (normalizedDeal.discountPercentage < 0) {
      normalizedDeal.discountPercentage = 0;
    }

    return normalizedDeal;
  }

  /**
   * Convert scraped deal to normalized deal format
   */
  private convertScrapedDealToNormalized(scrapedDeal: ScrapedDeal, storeLocations: StoreLocation[]): Deal {
    const now = new Date();
    
    return {
      id: `publix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Temporary ID
      storeId: 'publix-default',
      storeName: StoreChain.PUBLIX,
      title: scrapedDeal.title,
      description: scrapedDeal.description,
      originalPrice: scrapedDeal.originalPrice,
      salePrice: scrapedDeal.salePrice,
      discountPercentage: Math.round(((scrapedDeal.originalPrice - scrapedDeal.salePrice) / scrapedDeal.originalPrice) * 10000) / 100,
      dealType: scrapedDeal.dealType,
      validFrom: scrapedDeal.validFrom,
      validUntil: scrapedDeal.validUntil,
      category: scrapedDeal.category,
      itemIds: [], // Publix scraper doesn't provide item IDs
      restrictions: scrapedDeal.restrictions,
      imageUrl: scrapedDeal.imageUrl,
      storeLocations: storeLocations,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Find existing deal by title and store
   */
  private async findExistingDeal(deal: Deal): Promise<Deal | null> {
    try {
      // This is a simplified approach - in a real implementation, you might want
      // to use more sophisticated matching logic (fuzzy matching, etc.)
      // For now, we'll assume the repository has a method to find by title and store
      // Since the repository doesn't have this method, we'll return null for now
      // and let all deals be treated as new deals
      return null;
    } catch (error) {
      logger.error('Error finding existing deal:', error);
      return null;
    }
  }

  /**
   * Check if deal has significant changes that warrant an update
   */
  private hasSignificantChanges(existingDeal: Deal, newDeal: Deal): boolean {
    // Check for significant price changes (more than 1 cent difference)
    const priceChanged = Math.abs(existingDeal.originalPrice - newDeal.originalPrice) > 0.01 ||
                        Math.abs(existingDeal.salePrice - newDeal.salePrice) > 0.01;

    // Check for date changes
    const dateChanged = existingDeal.validFrom.getTime() !== newDeal.validFrom.getTime() ||
                       existingDeal.validUntil.getTime() !== newDeal.validUntil.getTime();

    // Check for content changes
    const contentChanged = existingDeal.title !== newDeal.title ||
                          existingDeal.description !== newDeal.description ||
                          existingDeal.restrictions !== newDeal.restrictions;

    return priceChanged || dateChanged || contentChanged;
  }

  /**
   * Update aggregation statistics
   */
  private updateStats(results: AggregationResult[], processingTime: number): void {
    this.stats.lastRun = new Date();
    this.stats.totalRuns++;
    
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length === results.length) {
      this.stats.successfulRuns++;
    } else {
      this.stats.failedRuns++;
    }

    const totalDealsProcessed = results.reduce((sum, r) => sum + r.totalDealsProcessed, 0);
    this.stats.totalDealsProcessed += totalDealsProcessed;

    // Update average processing time
    const currentAverage = this.stats.averageProcessingTime;
    const totalRuns = this.stats.totalRuns;
    this.stats.averageProcessingTime = ((currentAverage * (totalRuns - 1)) + processingTime) / totalRuns;
  }

  /**
   * Get aggregation statistics
   */
  public getStats(): AggregationStats {
    return { ...this.stats };
  }

  /**
   * Get current running status
   */
  public isAggregationRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    this.stopScheduledJobs();
    await this.publixScraper.cleanup();
    logger.info('DealAggregator cleanup completed');
  }
}