import { DealRepository } from '../../repositories/DealRepository';
import { StoreRepository } from '../../repositories/StoreRepository';
import { StoreChain, DealType } from '../../types/models';
import { testPool } from '../setup';

describe('DealRepository', () => {
  let dealRepository: DealRepository;
  let storeRepository: StoreRepository;
  let testStoreId: string;

  beforeEach(async () => {
    dealRepository = new DealRepository(testPool);
    storeRepository = new StoreRepository(testPool);

    // Create a test store location
    const testStore = await storeRepository.create({
      storeChain: StoreChain.PUBLIX,
      name: 'Test Publix Store',
      address: '123 Test St, Test City, FL 12345',
      latitude: 25.7617,
      longitude: -80.1918,
      phoneNumber: '555-123-4567',
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
    testStoreId = testStore.id;
  });

  describe('create', () => {
    it('should create a new deal successfully', async () => {
      const dealData = {
        storeId: testStoreId,
        storeName: StoreChain.PUBLIX,
        title: 'Buy One Get One Free Bread',
        description: 'Fresh bakery bread, all varieties',
        originalPrice: 3.99,
        salePrice: 1.99,
        discountPercentage: 50.13,
        dealType: DealType.BOGO,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-01-07'),
        category: 'Bakery',
        itemIds: ['bread-001', 'bread-002'],
        restrictions: 'Limit 2 per customer',
        imageUrl: 'https://example.com/bread.jpg',
        isActive: true,
        scrapedAt: new Date(),
        sourceUrl: 'https://publix.com/weekly-ad'
      };

      const deal = await dealRepository.create(dealData);

      expect(deal).toBeDefined();
      expect(deal.id).toBeDefined();
      expect(deal.title).toBe(dealData.title);
      expect(deal.originalPrice).toBe(dealData.originalPrice);
      expect(deal.salePrice).toBe(dealData.salePrice);
      expect(deal.dealType).toBe(dealData.dealType);
      expect(deal.storeName).toBe(dealData.storeName);
      expect(deal.createdAt).toBeDefined();
      expect(deal.updatedAt).toBeDefined();
    });

    it('should throw validation error for invalid deal data', async () => {
      const invalidDealData = {
        storeId: testStoreId,
        storeName: StoreChain.PUBLIX,
        title: '', // Invalid: empty title
        description: 'Test description',
        originalPrice: -1, // Invalid: negative price
        salePrice: 5.99, // Invalid: higher than original price
        discountPercentage: 0,
        dealType: DealType.DISCOUNT,
        validFrom: new Date('2024-01-07'),
        validUntil: new Date('2024-01-01'), // Invalid: end before start
        category: '',
        itemIds: [],
        isActive: true
      };

      await expect(dealRepository.create(invalidDealData)).rejects.toThrow('Validation failed');
    });
  });

  describe('findById', () => {
    it('should find deal by ID with store locations', async () => {
      const dealData = {
        storeId: testStoreId,
        storeName: StoreChain.PUBLIX,
        title: 'Test Deal',
        description: 'Test description',
        originalPrice: 10.00,
        salePrice: 7.50,
        discountPercentage: 25.00,
        dealType: DealType.DISCOUNT,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-01-07'),
        category: 'Grocery',
        itemIds: ['item-001'],
        isActive: true
      };

      const createdDeal = await dealRepository.create(dealData);
      await dealRepository.associateWithStoreLocations(createdDeal.id, [testStoreId]);

      const foundDeal = await dealRepository.findById(createdDeal.id);

      expect(foundDeal).toBeDefined();
      expect(foundDeal!.id).toBe(createdDeal.id);
      expect(foundDeal!.storeLocations).toHaveLength(1);
      expect(foundDeal!.storeLocations[0].id).toBe(testStoreId);
    });

    it('should return null for non-existent deal', async () => {
      const foundDeal = await dealRepository.findById('non-existent-id');
      expect(foundDeal).toBeNull();
    });
  });

  describe('findByLocation', () => {
    it('should find deals within specified radius', async () => {
      const dealData = {
        storeId: testStoreId,
        storeName: StoreChain.PUBLIX,
        title: 'Location Test Deal',
        description: 'Test description',
        originalPrice: 5.00,
        salePrice: 3.00,
        discountPercentage: 40.00,
        dealType: DealType.DISCOUNT,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31'),
        category: 'Test',
        itemIds: ['test-001'],
        isActive: true
      };

      const createdDeal = await dealRepository.create(dealData);
      await dealRepository.associateWithStoreLocations(createdDeal.id, [testStoreId]);

      const location = {
        latitude: 25.7617, // Same as test store
        longitude: -80.1918,
        radius: 10
      };

      const result = await dealRepository.findByLocation(location);

      expect(result.deals).toHaveLength(1);
      expect(result.deals[0].id).toBe(createdDeal.id);
      expect(result.total).toBe(1);
    });

    it('should filter deals by store chain', async () => {
      const dealData = {
        storeId: testStoreId,
        storeName: StoreChain.PUBLIX,
        title: 'Publix Deal',
        description: 'Test description',
        originalPrice: 5.00,
        salePrice: 3.00,
        discountPercentage: 40.00,
        dealType: DealType.DISCOUNT,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31'),
        category: 'Test',
        itemIds: ['test-001'],
        isActive: true
      };

      const createdDeal = await dealRepository.create(dealData);
      await dealRepository.associateWithStoreLocations(createdDeal.id, [testStoreId]);

      const location = {
        latitude: 25.7617,
        longitude: -80.1918,
        radius: 10
      };

      // Should find Publix deals
      const publixResult = await dealRepository.findByLocation(location, {
        storeChain: [StoreChain.PUBLIX]
      });
      expect(publixResult.deals).toHaveLength(1);

      // Should not find Kroger deals
      const krogerResult = await dealRepository.findByLocation(location, {
        storeChain: [StoreChain.KROGER]
      });
      expect(krogerResult.deals).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update deal successfully', async () => {
      const dealData = {
        storeId: testStoreId,
        storeName: StoreChain.PUBLIX,
        title: 'Original Title',
        description: 'Original description',
        originalPrice: 10.00,
        salePrice: 7.50,
        discountPercentage: 25.00,
        dealType: DealType.DISCOUNT,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-01-07'),
        category: 'Original',
        itemIds: ['item-001'],
        isActive: true
      };

      const createdDeal = await dealRepository.create(dealData);

      const updateData = {
        title: 'Updated Title',
        description: 'Updated description',
        salePrice: 6.00,
        discountPercentage: 40.00
      };

      const updatedDeal = await dealRepository.update(createdDeal.id, updateData);

      expect(updatedDeal).toBeDefined();
      expect(updatedDeal!.title).toBe(updateData.title);
      expect(updatedDeal!.description).toBe(updateData.description);
      expect(updatedDeal!.salePrice).toBe(updateData.salePrice);
      expect(updatedDeal!.discountPercentage).toBe(updateData.discountPercentage);
      expect(updatedDeal!.originalPrice).toBe(dealData.originalPrice); // Unchanged
    });
  });

  describe('delete', () => {
    it('should soft delete deal', async () => {
      const dealData = {
        storeId: testStoreId,
        storeName: StoreChain.PUBLIX,
        title: 'Deal to Delete',
        description: 'Test description',
        originalPrice: 10.00,
        salePrice: 7.50,
        discountPercentage: 25.00,
        dealType: DealType.DISCOUNT,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-01-07'),
        category: 'Test',
        itemIds: ['item-001'],
        isActive: true
      };

      const createdDeal = await dealRepository.create(dealData);
      const deleteResult = await dealRepository.delete(createdDeal.id);

      expect(deleteResult).toBe(true);

      // Should not find deleted deal
      const foundDeal = await dealRepository.findById(createdDeal.id);
      expect(foundDeal).toBeNull();
    });
  });

  describe('findExpired', () => {
    it('should find expired deals', async () => {
      const expiredDealData = {
        storeId: testStoreId,
        storeName: StoreChain.PUBLIX,
        title: 'Expired Deal',
        description: 'Test description',
        originalPrice: 10.00,
        salePrice: 7.50,
        discountPercentage: 25.00,
        dealType: DealType.DISCOUNT,
        validFrom: new Date('2023-01-01'),
        validUntil: new Date('2023-01-07'), // Expired
        category: 'Test',
        itemIds: ['item-001'],
        isActive: true
      };

      const activeDealData = {
        ...expiredDealData,
        title: 'Active Deal',
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31') // Active
      };

      await dealRepository.create(expiredDealData);
      await dealRepository.create(activeDealData);

      const expiredDeals = await dealRepository.findExpired();

      expect(expiredDeals).toHaveLength(1);
      expect(expiredDeals[0].title).toBe('Expired Deal');
    });
  });

  describe('associateWithStoreLocations', () => {
    it('should associate deal with store locations', async () => {
      const dealData = {
        storeId: testStoreId,
        storeName: StoreChain.PUBLIX,
        title: 'Association Test Deal',
        description: 'Test description',
        originalPrice: 10.00,
        salePrice: 7.50,
        discountPercentage: 25.00,
        dealType: DealType.DISCOUNT,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-01-07'),
        category: 'Test',
        itemIds: ['item-001'],
        isActive: true
      };

      const createdDeal = await dealRepository.create(dealData);
      await dealRepository.associateWithStoreLocations(createdDeal.id, [testStoreId]);

      const foundDeal = await dealRepository.findById(createdDeal.id);
      expect(foundDeal!.storeLocations).toHaveLength(1);
      expect(foundDeal!.storeLocations[0].id).toBe(testStoreId);
    });

    it('should replace existing associations', async () => {
      // Create second store
      const secondStore = await storeRepository.create({
        storeChain: StoreChain.PUBLIX,
        name: 'Second Test Store',
        address: '456 Test Ave, Test City, FL 12345',
        latitude: 25.7700,
        longitude: -80.2000,
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

      const dealData = {
        storeId: testStoreId,
        storeName: StoreChain.PUBLIX,
        title: 'Multi-Store Deal',
        description: 'Test description',
        originalPrice: 10.00,
        salePrice: 7.50,
        discountPercentage: 25.00,
        dealType: DealType.DISCOUNT,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-01-07'),
        category: 'Test',
        itemIds: ['item-001'],
        isActive: true
      };

      const createdDeal = await dealRepository.create(dealData);

      // First association
      await dealRepository.associateWithStoreLocations(createdDeal.id, [testStoreId]);
      let foundDeal = await dealRepository.findById(createdDeal.id);
      expect(foundDeal!.storeLocations).toHaveLength(1);

      // Replace with new association
      await dealRepository.associateWithStoreLocations(createdDeal.id, [secondStore.id]);
      foundDeal = await dealRepository.findById(createdDeal.id);
      expect(foundDeal!.storeLocations).toHaveLength(1);
      expect(foundDeal!.storeLocations[0].id).toBe(secondStore.id);
    });
  });
});