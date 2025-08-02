import express from 'express';
import { ApiResponse, ShoppingListItem, CreateShoppingListItemRequest, Priority, PaginatedResponse } from '../types/models';
import { ShoppingListRepository } from '../repositories/ShoppingListRepository';
import { DealRepository } from '../repositories/DealRepository';
import { createError } from '../middleware/errorHandler';

const router = express.Router();
const shoppingListRepository = new ShoppingListRepository();
const dealRepository = new DealRepository();

// GET /api/shopping-list/:userId - Get user's shopping list
router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { 
      page = 1, 
      limit = 50,
      category,
      priority,
      storeChain
    } = req.query as any;

    if (!userId || userId.trim().length === 0) {
      throw createError('User ID is required', 400);
    }

    // Build filters
    const filters: any = {};
    
    if (category) {
      filters.category = Array.isArray(category) ? category : [category];
    }

    if (priority) {
      const priorities = Array.isArray(priority) ? priority : [priority];
      filters.priority = priorities.filter(p => Object.values(Priority).includes(p));
    }

    if (storeChain) {
      filters.storeChain = Array.isArray(storeChain) ? storeChain : [storeChain];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const { items, total } = await shoppingListRepository.findByUserId(userId, filters, pageNum, limitNum);
    const totalPages = Math.ceil(total / limitNum);

    const response: ApiResponse<PaginatedResponse<ShoppingListItem>> = {
      success: true,
      data: {
        data: items,
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

// POST /api/shopping-list/items - Add item to shopping list
router.post('/items', async (req, res, next) => {
  try {
    const itemData: CreateShoppingListItemRequest & { userId: string } = req.body;
    
    // Validate required fields
    if (!itemData.userId || itemData.userId.trim().length === 0) {
      throw createError('User ID is required', 400);
    }

    if (!itemData.dealId || itemData.dealId.trim().length === 0) {
      throw createError('Deal ID is required', 400);
    }

    if (!itemData.itemName || itemData.itemName.trim().length === 0) {
      throw createError('Item name is required', 400);
    }

    if (!itemData.quantity || itemData.quantity <= 0) {
      throw createError('Quantity must be greater than 0', 400);
    }

    if (itemData.priority && !Object.values(Priority).includes(itemData.priority)) {
      throw createError('Invalid priority level', 400);
    }

    // Verify deal exists
    const deal = await dealRepository.findDealById(itemData.dealId);
    if (!deal) {
      throw createError('Deal not found', 404);
    }

    // Check if item already exists in user's shopping list
    const exists = await shoppingListRepository.existsForUser(itemData.userId, itemData.dealId);
    if (exists) {
      throw createError('Item already exists in shopping list', 409);
    }

    // Create shopping list item
    const newItem = await shoppingListRepository.create({
      userId: itemData.userId,
      dealId: itemData.dealId,
      itemName: itemData.itemName,
      quantity: itemData.quantity,
      priority: itemData.priority || Priority.MEDIUM,
      addedAt: new Date(),
      category: deal.category,
      notes: itemData.notes
    });

    const response: ApiResponse<ShoppingListItem> = {
      success: true,
      data: newItem,
      message: 'Item added to shopping list',
      timestamp: new Date().toISOString()
    };
    
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/shopping-list/items/:id - Update shopping list item
router.put('/items/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id || id.trim().length === 0) {
      throw createError('Item ID is required', 400);
    }

    // Validate priority if provided
    if (updateData.priority && !Object.values(Priority).includes(updateData.priority)) {
      throw createError('Invalid priority level', 400);
    }

    // Validate quantity if provided
    if (updateData.quantity !== undefined && updateData.quantity <= 0) {
      throw createError('Quantity must be greater than 0', 400);
    }

    const updatedItem = await shoppingListRepository.update(id, updateData);
    
    if (!updatedItem) {
      throw createError('Shopping list item not found', 404);
    }

    const response: ApiResponse<ShoppingListItem> = {
      success: true,
      data: updatedItem,
      message: 'Shopping list item updated',
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/shopping-list/items/:id - Remove item from shopping list
router.delete('/items/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id || id.trim().length === 0) {
      throw createError('Item ID is required', 400);
    }

    const deleted = await shoppingListRepository.delete(id);
    
    if (!deleted) {
      throw createError('Shopping list item not found', 404);
    }

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'Item removed from shopping list',
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/shopping-list/:userId/expiring - Get items with expiring deals
router.get('/:userId/expiring', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { hours = 24 } = req.query as any;

    if (!userId || userId.trim().length === 0) {
      throw createError('User ID is required', 400);
    }

    const hoursUntilExpiration = Math.max(1, parseInt(hours));
    const items = await shoppingListRepository.findItemsWithExpiringDeals(userId, hoursUntilExpiration);

    const response: ApiResponse<ShoppingListItem[]> = {
      success: true,
      data: items,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/shopping-list/:userId/statistics - Get shopping list statistics
router.get('/:userId/statistics', async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId || userId.trim().length === 0) {
      throw createError('User ID is required', 400);
    }

    const statistics = await shoppingListRepository.getStatistics(userId);

    const response: ApiResponse<typeof statistics> = {
      success: true,
      data: statistics,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;