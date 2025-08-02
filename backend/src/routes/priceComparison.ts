import express from 'express';
import { PriceComparisonService } from '../services/PriceComparisonService';
import { ApiResponse, PriceComparison } from '../types/models';
import { createError } from '../middleware/errorHandler';

const router = express.Router();
const priceComparisonService = new PriceComparisonService();

// GET /api/price-comparison/:itemId - Compare prices for an item across stores
router.get('/:itemId', async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { latitude, longitude, radius = 10 } = req.query as any;
    
    if (!itemId || itemId.trim().length === 0) {
      throw createError('Item ID is required', 400);
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

    // Convert itemId back to item name for the service
    const itemName = itemId.replace(/-/g, ' ');
    
    const comparison = await priceComparisonService.compareItemPrices(
      itemName,
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

// POST /api/price-comparison/multiple - Compare prices for multiple items
router.post('/multiple', async (req, res, next) => {
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

// GET /api/price-comparison/best-store - Get best store for a shopping list
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

    const result = await priceComparisonService.getBestStoreForList(
      itemNames,
      lat,
      lng,
      rad
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;