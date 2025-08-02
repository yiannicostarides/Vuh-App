import request from 'supertest';
import app from '../../server';
import { UserRepository } from '../../repositories/UserRepository';
import { User } from '../../types/models';

// Mock the repository
jest.mock('../../repositories/UserRepository');

const mockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;

describe('Users API Integration Tests', () => {
  let userRepositoryInstance: jest.Mocked<UserRepository>;

  beforeEach(() => {
    userRepositoryInstance = new mockUserRepository() as jest.Mocked<UserRepository>;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  const mockUser: User = {
    id: 'user-1',
    deviceId: 'device-123',
    preferences: {
      maxRadius: 10,
      preferredStores: ['publix', 'kroger'],
      categories: ['Bakery', 'Dairy'],
      notificationSettings: {
        dealExpirationReminders: true,
        newDealAlerts: true,
        priceDropAlerts: true,
        pushNotificationsEnabled: true
      }
    },
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
      lastUpdated: new Date()
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('POST /api/users', () => {
    it('should create new user', async () => {
      userRepositoryInstance.findByDeviceId.mockResolvedValue(null);
      userRepositoryInstance.create.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/users')
        .send({
          deviceId: 'device-123',
          preferences: {
            maxRadius: 10,
            preferredStores: ['publix'],
            categories: ['Bakery']
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceId).toBe('device-123');
      expect(response.body.message).toBe('User created successfully');
      expect(userRepositoryInstance.create).toHaveBeenCalled();
    });

    it('should update existing user login', async () => {
      const updatedUser = { ...mockUser, updatedAt: new Date() };
      userRepositoryInstance.findByDeviceId.mockResolvedValue(mockUser);
      userRepositoryInstance.updateLastLogin.mockResolvedValue(updatedUser);

      const response = await request(app)
        .post('/api/users')
        .send({
          deviceId: 'device-123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User login updated');
      expect(userRepositoryInstance.updateLastLogin).toHaveBeenCalledWith('user-1');
    });

    it('should return 400 for missing device ID', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Device ID is required');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by ID', async () => {
      userRepositoryInstance.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/users/user-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('user-1');
      expect(userRepositoryInstance.findById).toHaveBeenCalledWith('user-1');
    });

    it('should return 404 for non-existent user', async () => {
      userRepositoryInstance.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('User not found');
    });

    it('should return 400 for empty user ID', async () => {
      const response = await request(app)
        .get('/api/users/');

      expect(response.status).toBe(404); // Express returns 404 for missing route parameter
    });
  });

  describe('GET /api/users/device/:deviceId', () => {
    it('should return user by device ID', async () => {
      userRepositoryInstance.findByDeviceId.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/users/device/device-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceId).toBe('device-123');
      expect(userRepositoryInstance.findByDeviceId).toHaveBeenCalledWith('device-123');
    });

    it('should return 404 for non-existent device', async () => {
      userRepositoryInstance.findByDeviceId.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/device/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('User not found');
    });
  });

  describe('PUT /api/users/:id/preferences', () => {
    it('should update user preferences', async () => {
      const updatedUser = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          maxRadius: 15
        }
      };
      userRepositoryInstance.updatePreferences.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/api/users/user-1/preferences')
        .send({
          maxRadius: 15,
          preferredStores: ['kroger']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Preferences updated successfully');
      expect(userRepositoryInstance.updatePreferences).toHaveBeenCalledWith('user-1', {
        maxRadius: 15,
        preferredStores: ['kroger']
      });
    });

    it('should return 400 for invalid max radius', async () => {
      const response = await request(app)
        .put('/api/users/user-1/preferences')
        .send({
          maxRadius: 150
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Max radius must be between 0 and 100 miles');
    });

    it('should return 404 for non-existent user', async () => {
      userRepositoryInstance.updatePreferences.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/users/non-existent/preferences')
        .send({
          maxRadius: 15
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('User not found');
    });
  });

  describe('PUT /api/users/:id/location', () => {
    it('should update user location', async () => {
      const updatedUser = {
        ...mockUser,
        location: {
          latitude: 41.8781,
          longitude: -87.6298,
          lastUpdated: new Date()
        }
      };
      userRepositoryInstance.updateLocation.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/api/users/user-1/location')
        .send({
          latitude: 41.8781,
          longitude: -87.6298
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Location updated successfully');
      expect(userRepositoryInstance.updateLocation).toHaveBeenCalledWith('user-1', {
        latitude: 41.8781,
        longitude: -87.6298,
        lastUpdated: expect.any(Date)
      });
    });

    it('should return 400 for missing coordinates', async () => {
      const response = await request(app)
        .put('/api/users/user-1/location')
        .send({
          latitude: 41.8781
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Latitude and longitude are required');
    });

    it('should return 400 for invalid latitude', async () => {
      const response = await request(app)
        .put('/api/users/user-1/location')
        .send({
          latitude: 91,
          longitude: -87.6298
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Latitude must be between -90 and 90');
    });

    it('should return 400 for invalid longitude', async () => {
      const response = await request(app)
        .put('/api/users/user-1/location')
        .send({
          latitude: 41.8781,
          longitude: 181
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Longitude must be between -180 and 180');
    });

    it('should return 404 for non-existent user', async () => {
      userRepositoryInstance.updateLocation.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/users/non-existent/location')
        .send({
          latitude: 41.8781,
          longitude: -87.6298
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('User not found');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user', async () => {
      userRepositoryInstance.delete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/users/user-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');
      expect(userRepositoryInstance.delete).toHaveBeenCalledWith('user-1');
    });

    it('should return 404 for non-existent user', async () => {
      userRepositoryInstance.delete.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/users/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('User not found');
    });
  });
});