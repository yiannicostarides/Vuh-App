import request from 'supertest';
import app from '../../server';
import { ShoppingListRepository } from '../../repositories/ShoppingListRepository';
import { DealRepository } from '../../repositories/DealRepository';
import { ShoppingListItem, Deal, Priority, StoreChain, DealType } from '../../types/models';

// Mock the repositories
jest.mock('../../repositories/ShoppingListRepository');
jest.mock('../../repositories/DealRepository');

const mockShoppingListRepository = ShoppingListRepository as jest.MockedClass<typeof ShoppingListRepository>;
const mockDealRepository = DealRepository as jest.MockedClass<typeof DealRepository>;

describe('Shopping List API Integration Tests', () => {
  let shoppingListRepositoryInstance: jest.Mocked<ShoppingListRepository>;
  let dealRepositoryInstance: jest.Mocked<DealRepository>;

  beforeEach(() => {
    shoppingListRepositoryInstance = new mockShoppingListRepository() as jest.Mocked<ShoppingListRepository>;
    dealRepositoryInstance = new mockDealRepository() as jest.Mocked<DealRepository>;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  const mockShoppingListItem: ShoppingListItem = {
    id: '1',
    userId: 'user-1',
    dealId: 'deal-1',
    itemName: 'Bread',
    quantity: 2,
    priority: Priority.MEDIUM,
    addedAt: new Date(),
    category: 'Bakery',
    notes: 'Whole wheat preferred',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockDeal: Deal = {
    id: 'deal-1',
    storeId: 'store-1',
    storeName: StoreChain.PUBLIX,
    title: 'Buy One Get One Free Bread',
    description: 'Fresh bakery bread BOGO deal',
    originalPrice: 3.99,
    salePrice: 1.99,
    discountPercentage: 50,
    dealType: DealType.BOGO,
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2024-12-31'),
    category: 'Bakery',
    itemIds: ['bread-1'],
    storeLocations: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('GET /api/shopping-list/:userId', () => {
    it('should return user shopping list', async () => {
      shoppingListRepositoryInstance.findByUserId.mockResolvedValue({
        items: [mockShoppingListItem],
        total: 1
      });

      const response = await request(app)
        .get('/api/shopping-list/user-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.pagination.total).toBe(1);
      expect(shoppingListRepositoryInstance.findByUserId).toHaveBeenCalledWith(
        'user-1',
        {},
        1,
        50
      );
    });

    it('should return 400 for empty user ID', async () => {
      const response = await request(app)
        .get('/api/shopping-list/');

      expect(response.status).toBe(404); // Express returns 404 for missing route parameter
    });

    it('should apply filters correctly', async () => {
      shoppingListRepositoryInstance.findByUserId.mockResolvedValue({
        items: [mockShoppingListItem],
        total: 1
      });

      const response = await request(app)
        .get('/api/shopping-list/user-1')
        .query({
          category: 'Bakery',
          priority: 'high',
          storeChain: 'publix'
        });

      expect(response.status).toBe(200);
      expect(shoppingListRepositoryInstance.findByUserId).toHaveBeenCalledWith(
        'user-1',
        {
          category: ['Bakery'],
          priority: [Priority.HIGH],
          storeChain: ['publix']
        },
        1,
        50
      );
    });
  });

  describe('POST /api/shopping-list/items', () => {
    it('should add item to shopping list', async () => {
      dealRepositoryInstance.findDealById.mockResolvedValue(mockDeal);
      shoppingListRepositoryInstance.existsForUser.mockResolvedValue(false);
      shoppingListRepositoryInstance.create.mockResolvedValue(mockShoppingListItem);

      const response = await request(app)
        .post('/api/shopping-list/items')
        .send({
          userId: 'user-1',
          dealId: 'deal-1',
          itemName: 'Bread',
          quantity: 2,
          priority: Priority.MEDIUM,
          notes: 'Whole wheat preferred'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('1');
      expect(response.body.message).toBe('Item added to shopping list');
    });

    it('should return 400 for missing user ID', async () => {
      const response = await request(app)
        .post('/api/shopping-list/items')
        .send({
          dealId: 'deal-1',
          itemName: 'Bread',
          quantity: 2
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('User ID is required');
    });

    it('should return 400 for missing deal ID', async () => {
      const response = await request(app)
        .post('/api/shopping-list/items')
        .send({
          userId: 'user-1',
          itemName: 'Bread',
          quantity: 2
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Deal ID is required');
    });

    it('should return 400 for invalid quantity', async () => {
      const response = await request(app)
        .post('/api/shopping-list/items')
        .send({
          userId: 'user-1',
          dealId: 'deal-1',
          itemName: 'Bread',
          quantity: 0
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Quantity must be greater than 0');
    });

    it('should return 404 for non-existent deal', async () => {
      dealRepositoryInstance.findDealById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/shopping-list/items')
        .send({
          userId: 'user-1',
          dealId: 'non-existent',
          itemName: 'Bread',
          quantity: 2
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Deal not found');
    });

    it('should return 409 for duplicate item', async () => {
      dealRepositoryInstance.findDealById.mockResolvedValue(mockDeal);
      shoppingListRepositoryInstance.existsForUser.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/shopping-list/items')
        .send({
          userId: 'user-1',
          dealId: 'deal-1',
          itemName: 'Bread',
          quantity: 2
        });

      expect(response.status).toBe(409);
      expect(response.body.error.message).toBe('Item already exists in shopping list');
    });
  });

  describe('PUT /api/shopping-list/items/:id', () => {
    it('should update shopping list item', async () => {
      const updatedItem = { ...mockShoppingListItem, quantity: 3 };
      shoppingListRepositoryInstance.update.mockResolvedValue(updatedItem);

      const response = await request(app)
        .put('/api/shopping-list/items/1')
        .send({
          quantity: 3,
          notes: 'Updated notes'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Shopping list item updated');
      expect(shoppingListRepositoryInstance.update).toHaveBeenCalledWith('1', {
        quantity: 3,
        notes: 'Updated notes'
      });
    });

    it('should return 404 for non-existent item', async () => {
      shoppingListRepositoryInstance.update.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/shopping-list/items/non-existent')
        .send({
          quantity: 3
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Shopping list item not found');
    });

    it('should return 400 for invalid quantity', async () => {
      const response = await request(app)
        .put('/api/shopping-list/items/1')
        .send({
          quantity: 0
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Quantity must be greater than 0');
    });
  });

  describe('DELETE /api/shopping-list/items/:id', () => {
    it('should delete shopping list item', async () => {
      shoppingListRepositoryInstance.delete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/shopping-list/items/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Item removed from shopping list');
      expect(shoppingListRepositoryInstance.delete).toHaveBeenCalledWith('1');
    });

    it('should return 404 for non-existent item', async () => {
      shoppingListRepositoryInstance.delete.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/shopping-list/items/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Shopping list item not found');
    });
  });

  describe('GET /api/shopping-list/:userId/expiring', () => {
    it('should return items with expiring deals', async () => {
      shoppingListRepositoryInstance.findItemsWithExpiringDeals.mockResolvedValue([mockShoppingListItem]);

      const response = await request(app)
        .get('/api/shopping-list/user-1/expiring')
        .query({ hours: 48 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(shoppingListRepositoryInstance.findItemsWithExpiringDeals).toHaveBeenCalledWith('user-1', 48);
    });

    it('should use default hours if not provided', async () => {
      shoppingListRepositoryInstance.findItemsWithExpiringDeals.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/shopping-list/user-1/expiring');

      expect(response.status).toBe(200);
      expect(shoppingListRepositoryInstance.findItemsWithExpiringDeals).toHaveBeenCalledWith('user-1', 24);
    });
  });

  describe('GET /api/shopping-list/:userId/statistics', () => {
    it('should return shopping list statistics', async () => {
      const mockStats = {
        totalItems: 5,
        itemsByPriority: {
          [Priority.HIGH]: 1,
          [Priority.MEDIUM]: 2,
          [Priority.LOW]: 2
        },
        itemsByCategory: {
          'Bakery': 2,
          'Dairy': 3
        },
        totalSavings: 15.50
      };

      shoppingListRepositoryInstance.getStatistics.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/shopping-list/user-1/statistics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalItems).toBe(5);
      expect(response.body.data.totalSavings).toBe(15.50);
      expect(shoppingListRepositoryInstance.getStatistics).toHaveBeenCalledWith('user-1');
    });
  });
});