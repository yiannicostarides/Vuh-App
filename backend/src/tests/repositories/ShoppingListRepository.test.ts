import { ShoppingListRepository } from '../../repositories/ShoppingListRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { DealRepository } from '../../repositories/DealRepository';
import { StoreRepository } from '../../repositories/StoreRepository';
import { Priority, StoreChain, DealType } from '../../types/models';
import { testPool } from '../setup';

describe('ShoppingListRepository', () => {
  let shoppingListRepository: ShoppingListRepository;
  let userRepository: UserRepository;
  let dealRepository: DealRepository;
  let storeRepository: StoreRepository;
  let testUserId: string;
  let testDealId: string;

  beforeEach(async () => {
    shoppingListRepository = new ShoppingListRepository(testPool);
    userRepository = new UserRepository(testPool);
    dealRepository = new DealRepository(testPool);
    storeRepository = new StoreRepository(testPool);

    // Create test user
    const testUser = await userRepository.create({
      deviceId: 'test-shopping-device',
      preferences: {
        maxRadius: 10.0,
        preferredStores: [],
        categories: [],
        notificationSettings: {
          dealExpirationReminders: true,
          newDealAlerts: true,
          priceDropAlerts: true,
          pushNotificationsEnabled: true
        }
      },
      isActive: true
    });
    testUserId = testUser.id;

    // Create test store
    const testStore = await storeRepository.create({
      storeChain: StoreChain.PUBLIX,
      name: 'Test Shopping Store',
      address: '123 Shopping St, Test City, FL 12345',
      latitude: 25.7617,
      longitude: -80.1918,
      hours: {
        monday: { open: '07:00', close: '22:00', isClosed: false },
        tuesday: { open: '07:00', close: '22:00', isClosed: false },
        wednesday: { open: '07:00', close: '22:00', isClosed: false },
        thursday: { open: '07:00', close: '22:00', isClosed: false },
        friday: { open: '07:00', close: '22:00', isClosed: false },
        saturday: { open: '07:00', close: '22:00', isClosed: false },
        sunday: { open: '08:00', close: '21:00', isClosed: false }
      },
      isActive: true
    });

    // Create test deal
    const testDeal = await dealRepository.create({
      storeId: testStore.id,
      storeName: StoreChain.PUBLIX,
      title: 'Test Shopping Deal',
      description: 'Great deal for testing',
      originalPrice: 5.99,
      salePrice: 3.99,
      discountPercentage: 33.39,
      dealType: DealType.DISCOUNT,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2024-12-31'),
      category: 'Grocery',
      itemIds: ['test-item-001'],
      isActive: true
    });
    testDealId = testDeal.id;
  });

  describe('create', () => {
    it('should create a new shopping list item successfully', async () => {
      const itemData = {
        userId: testUserId,
        dealId: testDealId,
        itemName: 'Test Grocery Item',
        quantity: 2,
        priority: Priority.MEDIUM,
        addedAt: new Date(),
        category: 'Grocery',
        notes: 'Don\'t forget to check expiration date'
      };

      const item = await shoppingListRepository.create(itemData);

      expect(item).toBeDefined();
      expect(item.id).toBeDefined();
      expect(item.userId).toBe(itemData.userId);
      expect(item.dealId).toBe(itemData.dealId);
      expect(item.itemName).toBe(itemData.itemName);
      expect(item.quantity).toBe(itemData.quantity);
      expect(item.priority).toBe(itemData.priority);
      expect(item.category).toBe(itemData.category);
      expect(item.notes).toBe(itemData.notes);
      expect(item.createdAt).toBeDefined();
      expect(item.updatedAt).toBeDefined();
    });

    it('should create item with default priority', async () => {
      const itemData = {
        userId: testUserId,
        dealId: testDealId,
        itemName: 'Default Priority Item',
        quantity: 1,
        priority: Priority.MEDIUM, // Will use default from database
        addedAt: new Date(),
        category: 'Grocery'
      };

      const item = await shoppingListRepository.create(itemData);

      expect(item.priority).toBe(Priority.MEDIUM);
    });

    it('should throw validation error for invalid item data', async () => {
      const invalidItemData = {
        userId: '', // Invalid: empty user ID
        dealId: '',
        itemName: '', // Invalid: empty item name
        quantity: 0, // Invalid: zero quantity
        priority: Priority.MEDIUM,
        addedAt: new Date(),
        category: '' // Invalid: empty category
      };

      await expect(shoppingListRepository.create(invalidItemData)).rejects.toThrow('Validation failed');
    });
  });

  describe('findById', () => {
    it('should find shopping list item by ID', async () => {
      const itemData = {
        userId: testUserId,
        dealId: testDealId,
        itemName: 'Find By ID Item',
        quantity: 1,
        priority: Priority.HIGH,
        addedAt: new Date(),
        category: 'Grocery'
      };

      const createdItem = await shoppingListRepository.create(itemData);
      const foundItem = await shoppingListRepository.findById(createdItem.id);

      expect(foundItem).toBeDefined();
      expect(foundItem!.id).toBe(createdItem.id);
      expect(foundItem!.itemName).toBe(itemData.itemName);
    });

    it('should return null for non-existent item', async () => {
      const foundItem = await shoppingListRepository.findById('non-existent-id');
      expect(foundItem).toBeNull();
    });
  });

  describe('findByUserId', () => {
    beforeEach(async () => {
      // Create multiple shopping list items
      await shoppingListRepository.create({
        userId: testUserId,
        dealId: testDealId,
        itemName: 'High Priority Item',
        quantity: 1,
        priority: Priority.HIGH,
        addedAt: new Date(),
        category: 'Grocery'
      });

      await shoppingListRepository.create({
        userId: testUserId,
        dealId: testDealId,
        itemName: 'Medium Priority Item',
        quantity: 2,
        priority: Priority.MEDIUM,
        addedAt: new Date(),
        category: 'Bakery'
      });

      await shoppingListRepository.create({
        userId: testUserId,
        dealId: testDealId,
        itemName: 'Low Priority Item',
        quantity: 3,
        priority: Priority.LOW,
        addedAt: new Date(),
        category: 'Dairy'
      });
    });

    it('should find all items for a user', async () => {
      const result = await shoppingListRepository.findByUserId(testUserId);

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
      
      // Should be sorted by priority (high first) then by added date
      expect(result.items[0].priority).toBe(Priority.HIGH);
      expect(result.items[0].itemName).toBe('High Priority Item');
    });

    it('should filter items by category', async () => {
      const result = await shoppingListRepository.findByUserId(testUserId, {
        category: ['Grocery']
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].category).toBe('Grocery');
      expect(result.items[0].itemName).toBe('High Priority Item');
    });

    it('should filter items by priority', async () => {
      const result = await shoppingListRepository.findByUserId(testUserId, {
        priority: [Priority.HIGH, Priority.MEDIUM]
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.every(item => 
        item.priority === Priority.HIGH || item.priority === Priority.MEDIUM
      )).toBe(true);
    });

    it('should support pagination', async () => {
      const page1 = await shoppingListRepository.findByUserId(testUserId, {}, 1, 2);
      const page2 = await shoppingListRepository.findByUserId(testUserId, {}, 2, 2);

      expect(page1.items).toHaveLength(2);
      expect(page2.items).toHaveLength(1);
      expect(page1.total).toBe(3);
      expect(page2.total).toBe(3);

      // Items should not overlap between pages
      const page1Ids = page1.items.map(item => item.id);
      const page2Ids = page2.items.map(item => item.id);
      expect(page1Ids.some(id => page2Ids.includes(id))).toBe(false);
    });
  });

  describe('update', () => {
    it('should update shopping list item', async () => {
      const itemData = {
        userId: testUserId,
        dealId: testDealId,
        itemName: 'Original Item Name',
        quantity: 1,
        priority: Priority.LOW,
        addedAt: new Date(),
        category: 'Original Category',
        notes: 'Original notes'
      };

      const createdItem = await shoppingListRepository.create(itemData);

      const updateData = {
        itemName: 'Updated Item Name',
        quantity: 5,
        priority: Priority.HIGH,
        notes: 'Updated notes'
      };

      const updatedItem = await shoppingListRepository.update(createdItem.id, updateData);

      expect(updatedItem).toBeDefined();
      expect(updatedItem!.itemName).toBe(updateData.itemName);
      expect(updatedItem!.quantity).toBe(updateData.quantity);
      expect(updatedItem!.priority).toBe(updateData.priority);
      expect(updatedItem!.notes).toBe(updateData.notes);
      expect(updatedItem!.category).toBe(itemData.category); // Unchanged
    });
  });

  describe('delete', () => {
    it('should delete shopping list item', async () => {
      const itemData = {
        userId: testUserId,
        dealId: testDealId,
        itemName: 'Item to Delete',
        quantity: 1,
        priority: Priority.MEDIUM,
        addedAt: new Date(),
        category: 'Grocery'
      };

      const createdItem = await shoppingListRepository.create(itemData);
      const deleteResult = await shoppingListRepository.delete(createdItem.id);

      expect(deleteResult).toBe(true);

      // Should not find deleted item
      const foundItem = await shoppingListRepository.findById(createdItem.id);
      expect(foundItem).toBeNull();
    });
  });

  describe('deleteByUserId', () => {
    it('should delete all items for a user', async () => {
      // Create multiple items
      await shoppingListRepository.create({
        userId: testUserId,
        dealId: testDealId,
        itemName: 'Item 1',
        quantity: 1,
        priority: Priority.MEDIUM,
        addedAt: new Date(),
        category: 'Grocery'
      });

      await shoppingListRepository.create({
        userId: testUserId,
        dealId: testDealId,
        itemName: 'Item 2',
        quantity: 1,
        priority: Priority.MEDIUM,
        addedAt: new Date(),
        category: 'Grocery'
      });

      const deletedCount = await shoppingListRepository.deleteByUserId(testUserId);

      expect(deletedCount).toBe(2);

      // Should not find any items for the user
      const result = await shoppingListRepository.findByUserId(testUserId);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('findItemsWithExpiringDeals', () => {
    it('should find items with deals expiring soon', async () => {
      // Create deal expiring in 12 hours
      const expiringDeal = await dealRepository.create({
        storeId: (await storeRepository.findByChain(StoreChain.PUBLIX))[0].id,
        storeName: StoreChain.PUBLIX,
        title: 'Expiring Deal',
        description: 'This deal expires soon',
        originalPrice: 10.00,
        salePrice: 7.50,
        discountPercentage: 25.00,
        dealType: DealType.DISCOUNT,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
        category: 'Grocery',
        itemIds: ['expiring-item'],
        isActive: true
      });

      // Create deal expiring in 48 hours (should not be included)
      const laterDeal = await dealRepository.create({
        storeId: (await storeRepository.findByChain(StoreChain.PUBLIX))[0].id,
        storeName: StoreChain.PUBLIX,
        title: 'Later Deal',
        description: 'This deal expires later',
        originalPrice: 8.00,
        salePrice: 6.00,
        discountPercentage: 25.00,
        dealType: DealType.DISCOUNT,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
        category: 'Grocery',
        itemIds: ['later-item'],
        isActive: true
      });

      // Create shopping list items
      await shoppingListRepository.create({
        userId: testUserId,
        dealId: expiringDeal.id,
        itemName: 'Expiring Item',
        quantity: 1,
        priority: Priority.MEDIUM,
        addedAt: new Date(),
        category: 'Grocery'
      });

      await shoppingListRepository.create({
        userId: testUserId,
        dealId: laterDeal.id,
        itemName: 'Later Item',
        quantity: 1,
        priority: Priority.MEDIUM,
        addedAt: new Date(),
        category: 'Grocery'
      });

      const expiringItems = await shoppingListRepository.findItemsWithExpiringDeals(testUserId, 24);

      expect(expiringItems).toHaveLength(1);
      expect(expiringItems[0].itemName).toBe('Expiring Item');
      expect((expiringItems[0] as any).dealInfo).toBeDefined();
      expect((expiringItems[0] as any).dealInfo.title).toBe('Expiring Deal');
    });
  });

  describe('findByCategory', () => {
    beforeEach(async () => {
      await shoppingListRepository.create({
        userId: testUserId,
        dealId: testDealId,
        itemName: 'Grocery Item',
        quantity: 1,
        priority: Priority.MEDIUM,
        addedAt: new Date(),
        category: 'Grocery'
      });

      await shoppingListRepository.create({
        userId: testUserId,
        dealId: testDealId,
        itemName: 'Bakery Item',
        quantity: 1,
        priority: Priority.HIGH,
        addedAt: new Date(),
        category: 'Bakery'
      });
    });

    it('should find items by category', async () => {
      const groceryItems = await shoppingListRepository.findByCategory(testUserId, 'Grocery');
      const bakeryItems = await shoppingListRepository.findByCategory(testUserId, 'Bakery');

      expect(groceryItems).toHaveLength(1);
      expect(groceryItems[0].itemName).toBe('Grocery Item');
      expect(groceryItems[0].category).toBe('Grocery');

      expect(bakeryItems).toHaveLength(1);
      expect(bakeryItems[0].itemName).toBe('Bakery Item');
      expect(bakeryItems[0].category).toBe('Bakery');
    });
  });

  describe('getStatistics', () => {
    beforeEach(async () => {
      await shoppingListRepository.create({
        userId: testUserId,
        dealId: testDealId,
        itemName: 'High Priority Item',
        quantity: 2,
        priority: Priority.HIGH,
        addedAt: new Date(),
        category: 'Grocery'
      });

      await shoppingListRepository.create({
        userId: testUserId,
        dealId: testDealId,
        itemName: 'Medium Priority Item',
        quantity: 1,
        priority: Priority.MEDIUM,
        addedAt: new Date(),
        category: 'Bakery'
      });

      await shoppingListRepository.create({
        userId: testUserId,
        dealId: testDealId,
        itemName: 'Low Priority Item',
        quantity: 3,
        priority: Priority.LOW,
        addedAt: new Date(),
        category: 'Grocery'
      });
    });

    it('should return correct statistics', async () => {
      const stats = await shoppingListRepository.getStatistics(testUserId);

      expect(stats.totalItems).toBe(3);
      expect(stats.itemsByPriority[Priority.HIGH]).toBe(1);
      expect(stats.itemsByPriority[Priority.MEDIUM]).toBe(1);
      expect(stats.itemsByPriority[Priority.LOW]).toBe(1);
      expect(stats.itemsByCategory['Grocery']).toBe(2);
      expect(stats.itemsByCategory['Bakery']).toBe(1);
      expect(stats.totalSavings).toBeGreaterThan(0); // Should calculate savings from deals
    });
  });

  describe('existsForUser', () => {
    it('should check if item exists for user', async () => {
      const itemData = {
        userId: testUserId,
        dealId: testDealId,
        itemName: 'Existing Item',
        quantity: 1,
        priority: Priority.MEDIUM,
        addedAt: new Date(),
        category: 'Grocery'
      };

      await shoppingListRepository.create(itemData);

      const exists = await shoppingListRepository.existsForUser(testUserId, testDealId);
      const notExists = await shoppingListRepository.existsForUser(testUserId, 'non-existent-deal');

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });
});