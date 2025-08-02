import express from 'express';
import { ApiResponse, Deal, LocationQuery, DealFilters, PaginatedResponse, StoreChain, DealType, PriceComparison } from '../types/models';
import { DealRepository } from '../repositories/DealRepository';
import { PriceComparisonService } from '../services/PriceComparisonService';
import { createError } from '../middleware/errorHandler';

const router = express.Router();
const dealRepository = new DealRepository();
const priceComparisonService = new PriceComparisonService();

// GET /api/deals/nearby - Get deals near a location
router.get('/nearby', async (req, res, next) => {
  try {
    const { 
      latitude, 
      longitude, 
      radius = 10,
      page = 1,
      limit = 20,
      storeChain,
      category,
      dealType,
      minDiscount,
      maxPrice
    } = req.query as any;

    // Validate required parameters
    if (!latitude || !longitude) {
      throw createError('Latitude and longitude are required', 400);
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseFloat(radius);

    if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
      throw createError('Invalid location parameters', 400);
    }

    if (lat < -90 || lat > 90) {
      throw createError('Latitude must be between -90 and 90', 400);
    }

    if (lng < -180 || lng > 180) {
      throw createError('Longitude must be between -180 and 180', 400);
    }

    if (rad <= 0 || rad > 100) {
      throw createError('Radius must be between 0 and 100 miles', 400);
    }

    const location: LocationQuery = {
      latitude: lat,
      longitude: lng,
      radius: rad
    };

    // Build filters
    const filters: DealFilters = {};
    
    if (storeChain) {
      const chains = Array.isArray(storeChain) ? storeChain : [storeChain];
      filters.storeChain = chains.filter(chain => Object.values(StoreChain).includes(chain));
    }

    if (category) {
      filters.category = Array.isArray(category) ? category : [category];
    }

    if (dealType) {
      const types = Array.isArray(dealType) ? dealType : [dealType];
      filters.dealType = types.filter(type => Object.values(DealType).includes(type));
    }

    if (minDiscount) {
      const discount = parseFloat(minDiscount);
      if (!isNaN(discount) && discount >= 0) {
        filters.minDiscount = discount;
      }
    }

    if (maxPrice) {
      const price = parseFloat(maxPrice);
      if (!isNaN(price) && price > 0) {
        filters.maxPrice = price;
      }
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const { deals, total } = await dealRepository.findByLocation(location, filters, pageNum, limitNum);
    const totalPages = Math.ceil(total / limitNum);

    const response: ApiResponse<PaginatedResponse<Deal>> = {
      success: true,
      data: {
        data: deals,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/deals/price-comparison/:itemName - Compare prices for an item across stores
router.get('/price-comparison/:itemName', async (req, res, next) => {
  try {
    const { itemName } = req.params;
    const { latitude, longitude, radius = 10 } = req.query as any;
    
    if (!itemName || itemName.trim().length === 0) {
      throw createError('Item name is required', 400);
    }

    let lat: number | undefined;
    let lng: number | undefined;
    let rad = 10;

    if (latitude && longitude) {
      lat = parseFloat(latitude);
      lng = parseFloat(longitude);
      rad = parseFloat(radius);

      if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
        throw createError('Invalid location parameters', 400);
      }

      if (lat < -90 || lat > 90) {
        throw createError('Latitude must be between -90 and 90', 400);
      }

      if (lng < -180 || lng > 180) {
        throw createError('Longitude must be between -180 and 180', 400);
      }

      if (rad <= 0 || rad > 100) {
        throw createError('Radius must be between 0 and 100 miles', 400);
      }
    }

    const comparison = await priceComparisonService.compareItemPrices(
      decodeURIComponent(itemName),
      lat,
      lng,
      rad
    );

    if (!comparison) {
      throw createError('No price data found for this item', 404);
    }

    const response: ApiResponse<PriceComparison> = {
      success: true,
      data: comparison,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/deals/price-comparison/multiple - Compare prices for multiple items
router.post('/price-comparison/multiple', async (req, res, next) => {
  try {
    const { itemNames, latitude, longitude, radius = 10 } = req.body;
    
    if (!itemNames || !Array.isArray(itemNames) || itemNames.length === 0) {
      throw createError('Item names array is required', 400);
    }

    if (itemNames.length > 20) {
      throw createError('Maximum 20 items allowed per request', 400);
    }

    let lat: number | undefined;
    let lng: number | undefined;
    let rad = 10;

    if (latitude && longitude) {
      lat = parseFloat(latitude);
      lng = parseFloat(longitude);
      rad = parseFloat(radius);

      if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
        throw createError('Invalid location parameters', 400);
      }

      if (lat < -90 || lat > 90) {
        throw createError('Latitude must be between -90 and 90', 400);
      }

      if (lng < -180 || lng > 180) {
        throw createError('Longitude must be between -180 and 180', 400);
      }

      if (rad <= 0 || rad > 100) {
        throw createError('Radius must be between 0 and 100 miles', 400);
      }
    }

    const comparisons = await priceComparisonService.compareMultipleItems(
      itemNames,
      lat,
      lng,
      rad
    );

    const response: ApiResponse<PriceComparison[]> = {
      success: true,
      data: comparisons,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/deals/best-store - Get best store recommendation for a shopping list
router.post('/best-store', async (req, res, next) => {
  try {
    const { itemNames, latitude, longitude, radius = 10 } = req.body;
    
    if (!itemNames || !Array.isArray(itemNames) || itemNames.length === 0) {
      throw createError('Item names array is required', 400);
    }

    if (itemNames.length > 50) {
      throw createError('Maximum 50 items allowed per request', 400);
    }

    let lat: number | undefined;
    let lng: number | undefined;
    let rad = 10;

    if (latitude && longitude) {
      lat = parseFloat(latitude);
      lng = parseFloat(longitude);
      rad = parseFloat(radius);

      if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
        throw createError('Invalid location parameters', 400);
      }

      if (lat < -90 || lat > 90) {
        throw createError('Latitude must be between -90 and 90', 400);
      }

      if (lng < -180 || lng > 180) {
        throw createError('Longitude must be between -180 and 180', 400);
      }

      if (rad <= 0 || rad > 100) {
        throw createError('Radius must be between 0 and 100 miles', 400);
      }
    }

    const recommendation = await priceComparisonService.getBestStoreForList(
      itemNames,
      lat,
      lng,
      rad
    );

    const response: ApiResponse<typeof recommendation> = {
      success: true,
      data: recommendation,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/deals/:id - Get specific deal
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id || id.trim().length === 0) {
      throw createError('Deal ID is required', 400);
    }

    const deal = await dealRepository.findDealById(id);
    
    if (!deal) {
      throw createError('Deal not found', 404);
    }

    const response: ApiResponse<Deal> = {
      success: true,
      data: deal,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;