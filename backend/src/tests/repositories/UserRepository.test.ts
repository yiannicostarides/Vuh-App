import { UserRepository } from '../../repositories/UserRepository';
import { StoreChain } from '../../types/models';
import { testPool } from '../setup';

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository(testPool);
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        deviceId: 'test-device-123',
        preferences: {
          maxRadius: 15.0,
          preferredStores: ['publix-001', 'kroger-002'],
          categories: ['Grocery', 'Bakery', 'Dairy'],
          notificationSettings: {
            dealExpirationReminders: true,
            newDealAlerts: true,
            priceDropAlerts: false,
            pushNotificationsEnabled: true
          }
        },
        location: {
          latitude: 25.7617,
          longitude: -80.1918,
          lastUpdated: new Date()
        },
        lastLoginAt: new Date(),
        isActive: true
      };

      const user = await userRepository.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.deviceId).toBe(userData.deviceId);
      expect(user.preferences.maxRadius).toBe(userData.preferences.maxRadius);
      expect(user.preferences.preferredStores).toEqual(userData.preferences.preferredStores);
      expect(user.preferences.categories).toEqual(userData.preferences.categories);
      expect(user.preferences.notificationSettings.dealExpirationReminders).toBe(true);
      expect(user.preferences.notificationSettings.priceDropAlerts).toBe(false);
      expect(user.location).toBeDefined();
      expect(user.location!.latitude).toBe(userData.location.latitude);
      expect(user.location!.longitude).toBe(userData.location.longitude);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should create user without location', async () => {
      const userData = {
        deviceId: 'test-device-456',
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
      };

      const user = await userRepository.create(userData);

      expect(user).toBeDefined();
      expect(user.deviceId).toBe(userData.deviceId);
      expect(user.location).toBeUndefined();
      expect(user.preferences.maxRadius).toBe(10.0);
    });

    it('should throw validation error for invalid user data', async () => {
      const invalidUserData = {
        deviceId: '', // Invalid: empty device ID
        preferences: {
          maxRadius: -5, // Invalid: negative radius
          preferredStores: [],
          categories: [],
          notificationSettings: {
            dealExpirationReminders: true,
            newDealAlerts: true,
            priceDropAlerts: true,
            pushNotificationsEnabled: true
          }
        },
        location: {
          latitude: 91, // Invalid: out of range
          longitude: -181, // Invalid: out of range
          lastUpdated: new Date()
        },
        isActive: true
      };

      await expect(userRepository.create(invalidUserData)).rejects.toThrow('Validation failed');
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const userData = {
        deviceId: 'test-device-find',
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
      };

      const createdUser = await userRepository.create(userData);
      const foundUser = await userRepository.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.deviceId).toBe(userData.deviceId);
    });

    it('should return null for non-existent user', async () => {
      const foundUser = await userRepository.findById('non-existent-id');
      expect(foundUser).toBeNull();
    });
  });

  describe('findByDeviceId', () => {
    it('should find user by device ID', async () => {
      const userData = {
        deviceId: 'unique-device-123',
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
      };

      const createdUser = await userRepository.create(userData);
      const foundUser = await userRepository.findByDeviceId(userData.deviceId);

      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.deviceId).toBe(userData.deviceId);
    });

    it('should return null for non-existent device ID', async () => {
      const foundUser = await userRepository.findByDeviceId('non-existent-device');
      expect(foundUser).toBeNull();
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      const userData = {
        deviceId: 'test-device-update',
        preferences: {
          maxRadius: 10.0,
          preferredStores: ['store-1'],
          categories: ['Grocery'],
          notificationSettings: {
            dealExpirationReminders: true,
            newDealAlerts: true,
            priceDropAlerts: true,
            pushNotificationsEnabled: true
          }
        },
        isActive: true
      };

      const createdUser = await userRepository.create(userData);

      const updatedPreferences = {
        maxRadius: 20.0,
        preferredStores: ['store-1', 'store-2', 'store-3'],
        categories: ['Grocery', 'Bakery', 'Dairy'],
        notificationSettings: {
          dealExpirationReminders: false,
          newDealAlerts: true,
          priceDropAlerts: false,
          pushNotificationsEnabled: false
        }
      };

      const updatedUser = await userRepository.updatePreferences(createdUser.id, updatedPreferences);

      expect(updatedUser).toBeDefined();
      expect(updatedUser!.preferences.maxRadius).toBe(20.0);
      expect(updatedUser!.preferences.preferredStores).toEqual(['store-1', 'store-2', 'store-3']);
      expect(updatedUser!.preferences.categories).toEqual(['Grocery', 'Bakery', 'Dairy']);
      expect(updatedUser!.preferences.notificationSettings.dealExpirationReminders).toBe(false);
      expect(updatedUser!.preferences.notificationSettings.pushNotificationsEnabled).toBe(false);
    });

    it('should update partial preferences', async () => {
      const userData = {
        deviceId: 'test-device-partial',
        preferences: {
          maxRadius: 10.0,
          preferredStores: ['store-1'],
          categories: ['Grocery'],
          notificationSettings: {
            dealExpirationReminders: true,
            newDealAlerts: true,
            priceDropAlerts: true,
            pushNotificationsEnabled: true
          }
        },
        isActive: true
      };

      const createdUser = await userRepository.create(userData);

      const partialUpdate = {
        maxRadius: 25.0,
        notificationSettings: {
          dealExpirationReminders: false
        }
      };

      const updatedUser = await userRepository.updatePreferences(createdUser.id, partialUpdate);

      expect(updatedUser).toBeDefined();
      expect(updatedUser!.preferences.maxRadius).toBe(25.0);
      expect(updatedUser!.preferences.preferredStores).toEqual(['store-1']); // Unchanged
      expect(updatedUser!.preferences.categories).toEqual(['Grocery']); // Unchanged
      expect(updatedUser!.preferences.notificationSettings.dealExpirationReminders).toBe(false);
      expect(updatedUser!.preferences.notificationSettings.newDealAlerts).toBe(true); // Unchanged
    });
  });

  describe('updateLocation', () => {
    it('should update user location', async () => {
      const userData = {
        deviceId: 'test-device-location',
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
      };

      const createdUser = await userRepository.create(userData);

      const newLocation = {
        latitude: 26.1224,
        longitude: -81.7949,
        lastUpdated: new Date()
      };

      const updatedUser = await userRepository.updateLocation(createdUser.id, newLocation);

      expect(updatedUser).toBeDefined();
      expect(updatedUser!.location).toBeDefined();
      expect(updatedUser!.location!.latitude).toBe(newLocation.latitude);
      expect(updatedUser!.location!.longitude).toBe(newLocation.longitude);
      expect(updatedUser!.location!.lastUpdated).toEqual(newLocation.lastUpdated);
    });

    it('should throw validation error for invalid location', async () => {
      const userData = {
        deviceId: 'test-device-invalid-location',
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
      };

      const createdUser = await userRepository.create(userData);

      const invalidLocation = {
        latitude: 91, // Invalid: out of range
        longitude: -181, // Invalid: out of range
        lastUpdated: new Date()
      };

      await expect(userRepository.updateLocation(createdUser.id, invalidLocation))
        .rejects.toThrow('Location validation failed');
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const userData = {
        deviceId: 'test-device-login',
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
      };

      const createdUser = await userRepository.create(userData);
      const originalLastLogin = createdUser.lastLoginAt;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updatedUser = await userRepository.updateLastLogin(createdUser.id);

      expect(updatedUser).toBeDefined();
      // Note: lastLoginAt is not exposed in the User model, but the update should succeed
      expect(updatedUser!.updatedAt.getTime()).toBeGreaterThan(createdUser.updatedAt.getTime());
    });
  });

  describe('findByLocation', () => {
    beforeEach(async () => {
      // Create users at different locations
      await userRepository.create({
        deviceId: 'user-miami',
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
        location: {
          latitude: 25.7617, // Miami
          longitude: -80.1918,
          lastUpdated: new Date()
        },
        isActive: true
      });

      await userRepository.create({
        deviceId: 'user-nearby',
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
        location: {
          latitude: 25.7700, // Nearby Miami
          longitude: -80.2000,
          lastUpdated: new Date()
        },
        isActive: true
      });

      await userRepository.create({
        deviceId: 'user-orlando',
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
        location: {
          latitude: 26.1224, // Orlando (far from Miami)
          longitude: -81.7949,
          lastUpdated: new Date()
        },
        isActive: true
      });

      await userRepository.create({
        deviceId: 'user-no-location',
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
    });

    it('should find users within radius', async () => {
      const users = await userRepository.findByLocation(25.7617, -80.1918, 10);

      expect(users.length).toBeGreaterThan(0);
      expect(users.length).toBeLessThan(3); // Should not include Orlando user
      expect(users[0].distance).toBeDefined();
      expect(users[0].distance).toBeLessThanOrEqual(10);

      // Should be sorted by distance
      for (let i = 1; i < users.length; i++) {
        expect(users[i].distance).toBeGreaterThanOrEqual(users[i - 1].distance);
      }
    });
  });

  describe('findByNotificationPreference', () => {
    beforeEach(async () => {
      await userRepository.create({
        deviceId: 'user-notifications-on',
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

      await userRepository.create({
        deviceId: 'user-notifications-off',
        preferences: {
          maxRadius: 10.0,
          preferredStores: [],
          categories: [],
          notificationSettings: {
            dealExpirationReminders: false,
            newDealAlerts: false,
            priceDropAlerts: false,
            pushNotificationsEnabled: true
          }
        },
        isActive: true
      });

      await userRepository.create({
        deviceId: 'user-push-disabled',
        preferences: {
          maxRadius: 10.0,
          preferredStores: [],
          categories: [],
          notificationSettings: {
            dealExpirationReminders: true,
            newDealAlerts: true,
            priceDropAlerts: true,
            pushNotificationsEnabled: false // Push disabled
          }
        },
        isActive: true
      });
    });

    it('should find users with deal expiration notifications enabled', async () => {
      const users = await userRepository.findByNotificationPreference('dealExpiration', true);

      expect(users).toHaveLength(1); // Only user-notifications-on (push disabled user excluded)
      expect(users[0].deviceId).toBe('user-notifications-on');
    });

    it('should find users with new deal alerts disabled', async () => {
      const users = await userRepository.findByNotificationPreference('newDeals', false);

      expect(users).toHaveLength(1);
      expect(users[0].deviceId).toBe('user-notifications-off');
    });
  });

  describe('findByPreferredStores', () => {
    beforeEach(async () => {
      await userRepository.create({
        deviceId: 'user-publix-fan',
        preferences: {
          maxRadius: 10.0,
          preferredStores: ['publix-001', 'publix-002'],
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

      await userRepository.create({
        deviceId: 'user-kroger-fan',
        preferences: {
          maxRadius: 10.0,
          preferredStores: ['kroger-001', 'kroger-002'],
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

      await userRepository.create({
        deviceId: 'user-both-stores',
        preferences: {
          maxRadius: 10.0,
          preferredStores: ['publix-001', 'kroger-001'],
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
    });

    it('should find users interested in Publix stores', async () => {
      const users = await userRepository.findByPreferredStores(['publix-001']);

      expect(users).toHaveLength(2); // publix-fan and both-stores
      expect(users.map(u => u.deviceId)).toContain('user-publix-fan');
      expect(users.map(u => u.deviceId)).toContain('user-both-stores');
    });

    it('should find users interested in Kroger stores', async () => {
      const users = await userRepository.findByPreferredStores(['kroger-001']);

      expect(users).toHaveLength(2); // kroger-fan and both-stores
      expect(users.map(u => u.deviceId)).toContain('user-kroger-fan');
      expect(users.map(u => u.deviceId)).toContain('user-both-stores');
    });
  });

  describe('findByCategories', () => {
    beforeEach(async () => {
      await userRepository.create({
        deviceId: 'user-grocery-lover',
        preferences: {
          maxRadius: 10.0,
          preferredStores: [],
          categories: ['Grocery', 'Produce'],
          notificationSettings: {
            dealExpirationReminders: true,
            newDealAlerts: true,
            priceDropAlerts: true,
            pushNotificationsEnabled: true
          }
        },
        isActive: true
      });

      await userRepository.create({
        deviceId: 'user-bakery-fan',
        preferences: {
          maxRadius: 10.0,
          preferredStores: [],
          categories: ['Bakery', 'Dairy'],
          notificationSettings: {
            dealExpirationReminders: true,
            newDealAlerts: true,
            priceDropAlerts: true,
            pushNotificationsEnabled: true
          }
        },
        isActive: true
      });

      await userRepository.create({
        deviceId: 'user-all-categories',
        preferences: {
          maxRadius: 10.0,
          preferredStores: [],
          categories: ['Grocery', 'Bakery', 'Dairy', 'Produce'],
          notificationSettings: {
            dealExpirationReminders: true,
            newDealAlerts: true,
            priceDropAlerts: true,
            pushNotificationsEnabled: true
          }
        },
        isActive: true
      });
    });

    it('should find users interested in Grocery category', async () => {
      const users = await userRepository.findByCategories(['Grocery']);

      expect(users).toHaveLength(2); // grocery-lover and all-categories
      expect(users.map(u => u.deviceId)).toContain('user-grocery-lover');
      expect(users.map(u => u.deviceId)).toContain('user-all-categories');
    });

    it('should find users interested in Bakery category', async () => {
      const users = await userRepository.findByCategories(['Bakery']);

      expect(users).toHaveLength(2); // bakery-fan and all-categories
      expect(users.map(u => u.deviceId)).toContain('user-bakery-fan');
      expect(users.map(u => u.deviceId)).toContain('user-all-categories');
    });
  });

  describe('getStatistics', () => {
    beforeEach(async () => {
      await userRepository.create({
        deviceId: 'active-user-1',
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
        location: {
          latitude: 25.7617,
          longitude: -80.1918,
          lastUpdated: new Date()
        },
        isActive: true
      });

      await userRepository.create({
        deviceId: 'active-user-2',
        preferences: {
          maxRadius: 10.0,
          preferredStores: [],
          categories: [],
          notificationSettings: {
            dealExpirationReminders: true,
            newDealAlerts: true,
            priceDropAlerts: true,
            pushNotificationsEnabled: false // Notifications disabled
          }
        },
        isActive: true
      });

      // Create inactive user
      const inactiveUser = await userRepository.create({
        deviceId: 'inactive-user',
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

      // Soft delete the inactive user
      await userRepository.delete(inactiveUser.id);
    });

    it('should return correct user statistics', async () => {
      const stats = await userRepository.getStatistics();

      expect(stats.totalUsers).toBe(2); // Only active users counted
      expect(stats.activeUsers).toBe(2);
      expect(stats.usersWithLocation).toBe(1); // Only active-user-1 has location
      expect(stats.usersWithNotifications).toBe(1); // Only active-user-1 has notifications enabled
    });
  });

  describe('delete', () => {
    it('should soft delete user', async () => {
      const userData = {
        deviceId: 'user-to-delete',
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
      };

      const createdUser = await userRepository.create(userData);
      const deleteResult = await userRepository.delete(createdUser.id);

      expect(deleteResult).toBe(true);

      // Should not find deleted user
      const foundUser = await userRepository.findById(createdUser.id);
      expect(foundUser).toBeNull();
    });
  });
});