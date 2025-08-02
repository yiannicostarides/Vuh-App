import { DealRepository } from '../repositories/DealRepository';
import { StoreRepository } from '../repositories/StoreRepository';
import { PriceComparison, StorePrice, Deal, StoreLocation } from '../types/models';
import { logger } from '../utils/logger';

export class PriceComparisonService {
  private dealRepository: DealRepository;
  private storeRepository: StoreRepository;

  constructor() {
    this.dealRepository = new DealRepository();
    this.storeRepository = new StoreRepository();
  }

  /**
   * Compare prices for a specific item across stores
   */
  async compareItemPrices(
    itemName: string,
    userLatitude?: number,
    userLongitude?: number,
    radius: number = 10
  ): Promise<PriceComparison | null> {
    try {
      // Find deals that match the item name
      const deals = await this.findDealsForItem(itemName, userLatitude, userLongitude, radius);
      
      if (deals.length === 0) {
        return null;
      }

      // Group deals by store and find best price per store
      const storeDeals = this.groupDealsByStore(deals);
      const storePrices = await this.calculateStorePrices(storeDeals, userLatitude, userLongitude);
      
      // Find the best value option
      const bestValue = this.findBestValue(storePrices);

      return {
        itemId: this.generateItemId(itemName),
        itemName,
        stores: storePrices,
        bestValue,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error comparing item prices:', error);
      throw error;
    }
  }

  /**
   * Compare prices for multiple items
   */
  async compareMultipleItems(
    itemNames: string[],
    userLatitude?: number,
    userLongitude?: number,
    radius: number = 10
  ): Promise<PriceComparison[]> {
    const comparisons = await Promise.all(
      itemNames.map(itemName => 
        this.compareItemPrices(itemName, userLatitude, userLongitude, radius)
      )
    );

    return comparisons.filter(comparison => comparison !== null) as PriceComparison[];
  }

  /**
   * Get best store for a shopping list
   */
  async getBestStoreForList(
    itemNames: string[],
    userLatitude?: number,
    userLongitude?: number,
    radius: number = 10
  ): Promise<{
    recommendedStore: {
      storeId: string;
      storeName: string;
      totalSavings: number;
      distance?: number;
    };
    itemComparisons: PriceComparison[];
    totalCost: Record<string, number>;
  }> {
    const itemComparisons = await this.compareMultipleItems(itemNames, userLatitude, userLongitude, radius);
    
    // Calculate total cost per store
    const storeTotals: Record<string, { cost: number; savings: number; distance?: number }> = {};
    
    itemComparisons.forEach(comparison => {
      comparison.stores.forEach(storePrice => {
        if (!storeTotals[storePrice.storeId]) {
          storeTotals[storePrice.storeId] = { 
            cost: 0, 
            savings: 0, 
            distance: storePrice.distance 
          };
        }
        
        storeTotals[storePrice.storeId].cost += storePrice.price;
        
        if (storePrice.originalPrice) {
          storeTotals[storePrice.storeId].savings += (storePrice.originalPrice - storePrice.price);
        }
      });
    });

    // Find the store with the lowest total cost
    let recommendedStore = {
      storeId: '',
      storeName: '',
      totalSavings: 0,
      distance: undefined as number | undefined
    };

    let lowestCost = Infinity;
    
    Object.entries(storeTotals).forEach(([storeId, totals]) => {
      // Use distance as tiebreaker for similar costs (within $2)
      const costDifference = Math.abs(totals.cost - lowestCost);
      const shouldUpdate = totals.cost < lowestCost || 
        (costDifference <= 2 && totals.distance && totals.distance < (recommendedStore.distance || Infinity));
      
      if (shouldUpdate) {
        lowestCost = totals.cost;
        const storeInfo = this.getStoreInfo(storeId, itemComparisons);
        recommendedStore = {
          storeId,
          storeName: storeInfo.storeName,
          totalSavings: totals.savings,
          distance: totals.distance
        };
      }
    });

    return {
      recommendedStore,
      itemComparisons,
      totalCost: Object.fromEntries(
        Object.entries(storeTotals).map(([storeId, totals]) => [storeId, totals.cost])
      )
    };
  }

  /**
   * Find deals for a specific item
   */
  private async findDealsForItem(
    itemName: string,
    userLatitude?: number,
    userLongitude?: number,
    radius: number = 10
  ): Promise<Deal[]> {
    if (userLatitude && userLongitude) {
      const { deals } = await this.dealRepository.findByLocation(
        { latitude: userLatitude, longitude: userLongitude, radius },
        {},
        1,
        100
      );
      
      return deals.filter(deal => 
        deal.title.toLowerCase().includes(itemName.toLowerCase()) ||
        deal.description.toLowerCase().includes(itemName.toLowerCase())
      );
    } else {
      // If no location provided, search all active deals
      // This would require a different method in DealRepository
      return [];
    }
  }

  /**
   * Group deals by store
   */
  private groupDealsByStore(deals: Deal[]): Record<string, Deal[]> {
    return deals.reduce((groups, deal) => {
      const storeKey = `${deal.storeName}-${deal.storeId}`;
      if (!groups[storeKey]) {
        groups[storeKey] = [];
      }
      groups[storeKey].push(deal);
      return groups;
    }, {} as Record<string, Deal[]>);
  }

  /**
   * Calculate store prices with distance information
   */
  private async calculateStorePrices(
    storeDeals: Record<string, Deal[]>,
    userLatitude?: number,
    userLongitude?: number
  ): Promise<StorePrice[]> {
    const storePrices: StorePrice[] = [];

    for (const [storeKey, deals] of Object.entries(storeDeals)) {
      // Find the best deal for this store
      const bestDeal = deals.reduce((best, current) => 
        current.salePrice < best.salePrice ? current : best
      );

      let distance: number | undefined;
      
      if (userLatitude && userLongitude && bestDeal.storeLocations.length > 0) {
        // Calculate distance to nearest store location
        distance = Math.min(
          ...bestDeal.storeLocations.map(location => 
            this.calculateDistance(userLatitude, userLongitude, location.latitude, location.longitude)
          )
        );
      }

      storePrices.push({
        storeId: bestDeal.storeId,
        storeName: bestDeal.storeName,
        price: bestDeal.salePrice,
        originalPrice: bestDeal.originalPrice,
        discountPercentage: bestDeal.discountPercentage,
        dealType: bestDeal.dealType,
        distance,
        validUntil: bestDeal.validUntil
      });
    }

    return storePrices.sort((a, b) => a.price - b.price);
  }

  /**
   * Find the best value option
   */
  private findBestValue(storePrices: StorePrice[]): PriceComparison['bestValue'] {
    if (storePrices.length === 0) {
      return {
        storeId: '',
        storeName: '',
        price: 0
      };
    }

    // Sort by price first, then by distance for tiebreakers
    const sorted = [...storePrices].sort((a, b) => {
      const priceDiff = a.price - b.price;
      if (Math.abs(priceDiff) <= 0.50) { // Within 50 cents
        return (a.distance || Infinity) - (b.distance || Infinity);
      }
      return priceDiff;
    });

    const best = sorted[0];
    return {
      storeId: best.storeId,
      storeName: best.storeName.toString(),
      price: best.price,
      distance: best.distance
    };
  }

  /**
   * Get store information from comparisons
   */
  private getStoreInfo(storeId: string, comparisons: PriceComparison[]): { storeName: string } {
    for (const comparison of comparisons) {
      const store = comparison.stores.find(s => s.storeId === storeId);
      if (store) {
        return { storeName: store.storeName.toString() };
      }
    }
    return { storeName: 'Unknown Store' };
  }

  /**
   * Generate a consistent item ID from item name
   */
  private generateItemId(itemName: string): string {
    return itemName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}