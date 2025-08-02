import { StoreRepository } from '../../repositories/StoreRepository';
import { StoreChain } from '../../types/models';
import { testPool } from '../setup';

describe('StoreRepository', () => {
  let storeRepository: StoreRepository;

  beforeEach(() => {
    storeRepository = new StoreRepository(testPool);
  });

  describe('create', () => {
    it('should create a new store location successfully', async () => {
      const storeData = {
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
      };

      const store = await storeRepository.create(storeData);

      expect(store).toBeDefined();
      expect(store.id).toBeDefined();
      expect(store.storeChain).toBe(storeData.storeChain);
      expect(store.name).toBe(storeData.name);
      expect(store.address).toBe(storeData.address);
      expect(store.latitude).toBe(storeData.latitude);
      expect(store.longitude).toBe(storeData.longitude);
      expect(store.phoneNumber).toBe(storeData.phoneNumber);
      expect(store.hours.monday.open).toBe('07:00');
      expect(store.hours.sunday.open).toBe('08:00');
      expect(store.createdAt).toBeDefined();
      expect(store.updatedAt).toBeDefined();
    });

    it('should create store with closed days', async () => {
      const storeData = {
        storeChain: StoreChain.KROGER,
        name: 'Test Kroger Store',
        address: '456 Test Ave, Test City, FL 12345',
        latitude: 25.7700,
        longitude: -80.2000,
        hours: {
          monday: { open: '06:00', close: '23:00', isClosed: false },
          tuesday: { open: '06:00', close: '23:00', isClosed: false },
          wednesday: { open: '06:00', close: '23:00', isClosed: false },
          thursday: { open: '06:00', close: '23:00', isClosed: false },
          friday: { open: '06:00', close: '23:00', isClosed: false },
          saturday: { open: '06:00', close: '23:00', isClosed: false },
          sunday: { open: '', close: '', isClosed: true } // Closed on Sunday
        },
        isActive: true
      };

      const store = await storeRepository.create(storeData);

      expect(store.hours.sunday.isClosed).toBe(true);
      expect(store.hours.sunday.open).toBe('');
      expect(store.hours.sunday.close).toBe('');
    });

    it('should throw validation error for invalid store data', async () => {
      const invalidStoreData = {
        storeChain: 'INVALID_CHAIN' as StoreChain,
        name: '', // Invalid: empty name
        address: '',
        latitude: 91, // Invalid: out of range
        longitude: -181, // Invalid: out of range
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
      };

      await expect(storeRepository.create(invalidStoreData)).rejects.toThrow('Validation failed');
    });
  });

  describe('findById', () => {
    it('should find store by ID', async () => {
      const storeData = {
        storeChain: StoreChain.PUBLIX,
        name: 'Test Store',
        address: '123 Test St, Test City, FL 12345',
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
      };

      const createdStore = await storeRepository.create(storeData);
      const foundStore = await storeRepository.findById(createdStore.id);

      expect(foundStore).toBeDefined();
      expect(foundStore!.id).toBe(createdStore.id);
      expect(foundStore!.name).toBe(storeData.name);
    });

    it('should return null for non-existent store', async () => {
      const foundStore = await storeRepository.findById('non-existent-id');
      expect(foundStore).toBeNull();
    });
  });

  describe('findByLocation', () => {
    beforeEach(async () => {
      // Create test stores at different locations
      await storeRepository.create({
        storeChain: StoreChain.PUBLIX,
        name: 'Nearby Publix',
        address: '123 Close St, Test City, FL 12345',
        latitude: 25.7617, // Miami coordinates
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

      await storeRepository.create({
        storeChain: StoreChain.KROGER,
        name: 'Nearby Kroger',
        address: '456 Close Ave, Test City, FL 12345',
        latitude: 25.7700, // Slightly different coordinates
        longitude: -80.2000,
        hours: {
          monday: { open: '06:00', close: '23:00', isClosed: false },
          tuesday: { open: '06:00', close: '23:00', isClosed: false },
          wednesday: { open: '06:00', close: '23:00', isClosed: false },
          thursday: { open: '06:00', close: '23:00', isClosed: false },
          friday: { open: '06:00', close: '23:00', isClosed: false },
          saturday: { open: '06:00', close: '23:00', isClosed: false },
          sunday: { open: '07:00', close: '22:00', isClosed: false }
        },
        isActive: true
      });

      await storeRepository.create({
        storeChain: StoreChain.PUBLIX,
        name: 'Far Publix',
        address: '789 Far Rd, Other City, FL 54321',
        latitude: 26.1224, // Orlando coordinates (far from Miami)
        longitude: -81.7949,
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
    });

    it('should find stores within radius', async () => {
      const location = {
        latitude: 25.7617, // Miami coordinates
        longitude: -80.1918,
        radius: 10 // 10 miles
      };

      const stores = await storeRepository.findByLocation(location);

      expect(stores.length).toBeGreaterThan(0);
      expect(stores.length).toBeLessThan(3); // Should not include the far store
      expect(stores[0].distance).toBeDefined();
      expect(stores[0].distance).toBeLessThanOrEqual(10);

      // Should be sorted by distance
      for (let i = 1; i < stores.length; i++) {
        expect(stores[i].distance).toBeGreaterThanOrEqual(stores[i - 1].distance);
      }
    });

    it('should filter by store chain', async () => {
      const location = {
        latitude: 25.7617,
        longitude: -80.1918,
        radius: 10
      };

      const publixStores = await storeRepository.findByLocation(location, StoreChain.PUBLIX);
      const krogerStores = await storeRepository.findByLocation(location, StoreChain.KROGER);

      expect(publixStores.every(store => store.storeChain === StoreChain.PUBLIX)).toBe(true);
      expect(krogerStores.every(store => store.storeChain === StoreChain.KROGER)).toBe(true);
    });
  });

  describe('findByChain', () => {
    beforeEach(async () => {
      await storeRepository.create({
        storeChain: StoreChain.PUBLIX,
        name: 'Publix Store 1',
        address: '123 Test St, Test City, FL 12345',
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

      await storeRepository.create({
        storeChain: StoreChain.PUBLIX,
        name: 'Publix Store 2',
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

      await storeRepository.create({
        storeChain: StoreChain.KROGER,
        name: 'Kroger Store 1',
        address: '789 Test Blvd, Test City, FL 12345',
        latitude: 25.7800,
        longitude: -80.2100,
        hours: {
          monday: { open: '06:00', close: '23:00', isClosed: false },
          tuesday: { open: '06:00', close: '23:00', isClosed: false },
          wednesday: { open: '06:00', close: '23:00', isClosed: false },
          thursday: { open: '06:00', close: '23:00', isClosed: false },
          friday: { open: '06:00', close: '23:00', isClosed: false },
          saturday: { open: '06:00', close: '23:00', isClosed: false },
          sunday: { open: '07:00', close: '22:00', isClosed: false }
        },
        isActive: true
      });
    });

    it('should find all stores of a specific chain', async () => {
      const publixStores = await storeRepository.findByChain(StoreChain.PUBLIX);
      const krogerStores = await storeRepository.findByChain(StoreChain.KROGER);

      expect(publixStores).toHaveLength(2);
      expect(krogerStores).toHaveLength(1);
      expect(publixStores.every(store => store.storeChain === StoreChain.PUBLIX)).toBe(true);
      expect(krogerStores.every(store => store.storeChain === StoreChain.KROGER)).toBe(true);
    });
  });

  describe('findNearestByChain', () => {
    beforeEach(async () => {
      await storeRepository.create({
        storeChain: StoreChain.PUBLIX,
        name: 'Close Publix',
        address: '123 Close St, Test City, FL 12345',
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

      await storeRepository.create({
        storeChain: StoreChain.PUBLIX,
        name: 'Far Publix',
        address: '789 Far Rd, Other City, FL 54321',
        latitude: 26.1224,
        longitude: -81.7949,
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
    });

    it('should find nearest store of specific chain', async () => {
      const location = {
        latitude: 25.7617,
        longitude: -80.1918
      };

      const nearestPublix = await storeRepository.findNearestByChain(location, StoreChain.PUBLIX);

      expect(nearestPublix).toBeDefined();
      expect(nearestPublix!.name).toBe('Close Publix');
      expect(nearestPublix!.distance).toBeDefined();
      expect(nearestPublix!.distance).toBeLessThan(1); // Should be very close
    });

    it('should return null when no stores of chain exist', async () => {
      const location = {
        latitude: 25.7617,
        longitude: -80.1918
      };

      const nearestKroger = await storeRepository.findNearestByChain(location, StoreChain.KROGER);
      expect(nearestKroger).toBeNull();
    });
  });

  describe('update', () => {
    it('should update store information', async () => {
      const storeData = {
        storeChain: StoreChain.PUBLIX,
        name: 'Original Name',
        address: 'Original Address',
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
      };

      const createdStore = await storeRepository.create(storeData);

      const updateData = {
        name: 'Updated Name',
        phoneNumber: '555-987-6543',
        hours: {
          monday: { open: '06:00', close: '23:00', isClosed: false }
        }
      };

      const updatedStore = await storeRepository.update(createdStore.id, updateData);

      expect(updatedStore).toBeDefined();
      expect(updatedStore!.name).toBe(updateData.name);
      expect(updatedStore!.phoneNumber).toBe(updateData.phoneNumber);
      expect(updatedStore!.hours.monday.open).toBe('06:00');
      expect(updatedStore!.hours.monday.close).toBe('23:00');
      expect(updatedStore!.address).toBe(storeData.address); // Unchanged
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await storeRepository.create({
        storeChain: StoreChain.PUBLIX,
        name: 'Downtown Publix',
        address: '123 Main St, Downtown, FL 12345',
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

      await storeRepository.create({
        storeChain: StoreChain.KROGER,
        name: 'Uptown Kroger',
        address: '456 Broadway Ave, Uptown, FL 12345',
        latitude: 25.7700,
        longitude: -80.2000,
        hours: {
          monday: { open: '06:00', close: '23:00', isClosed: false },
          tuesday: { open: '06:00', close: '23:00', isClosed: false },
          wednesday: { open: '06:00', close: '23:00', isClosed: false },
          thursday: { open: '06:00', close: '23:00', isClosed: false },
          friday: { open: '06:00', close: '23:00', isClosed: false },
          saturday: { open: '06:00', close: '23:00', isClosed: false },
          sunday: { open: '07:00', close: '22:00', isClosed: false }
        },
        isActive: true
      });
    });

    it('should search stores by name', async () => {
      const results = await storeRepository.search('Downtown');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Downtown Publix');
    });

    it('should search stores by address', async () => {
      const results = await storeRepository.search('Broadway');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Uptown Kroger');
    });

    it('should search with location and return distances', async () => {
      const location = {
        latitude: 25.7617,
        longitude: -80.1918
      };

      const results = await storeRepository.search('Publix', location);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Downtown Publix');
      expect(results[0].distance).toBeDefined();
      expect(results[0].distance).toBeLessThan(1);
    });
  });

  describe('delete', () => {
    it('should soft delete store', async () => {
      const storeData = {
        storeChain: StoreChain.PUBLIX,
        name: 'Store to Delete',
        address: '123 Delete St, Test City, FL 12345',
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
      };

      const createdStore = await storeRepository.create(storeData);
      const deleteResult = await storeRepository.delete(createdStore.id);

      expect(deleteResult).toBe(true);

      // Should not find deleted store
      const foundStore = await storeRepository.findById(createdStore.id);
      expect(foundStore).toBeNull();
    });
  });
});