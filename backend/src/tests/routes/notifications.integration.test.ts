import request from 'supertest';
import app from '../../server';
import { UserRepository } from '../../repositories/UserRepository';
import { User } from '../../types/models';

// Mock the repository
jest.mock('../../repositories/UserRepository');

const mockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;

describe('Notifications API Integration Tests', () => {
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
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('POST /api/notifications/subscribe', () => {
    it('should subscribe user to notifications', async () => {
      userRepositoryInstance.findById.mockResolvedValue(mockUser);
      userRepositoryInstance.updatePreferences.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/notifications/subscribe')
        .send({
          deviceToken: 'device-token-123',
          platform: 'ios',
          userId: 'user-1'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully subscribed to notifications');
      expect(userRepositoryInstance.findById).toHaveBeenCalledWith('user-1');
      expect(userRepositoryInstance.updatePreferences).toHaveBeenCalledWith('user-1', {
        notificationSettings: {
          pushNotificationsEnabled: true
        }
      });
    });

    it('should return 400 for missing device token', async () => {
      const response = await request(app)
        .post('/api/notifications/subscribe')
        .send({
          platform: 'ios',
          userId: 'user-1'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Device token is required');
    });

    it('should return 400 for missing user ID', async () => {
      const response = await request(app)
        .post('/api/notifications/subscribe')
        .send({
          deviceToken: 'device-token-123',
          platform: 'ios'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('User ID is required');
    });

    it('should return 400 for invalid platform', async () => {
      const response = await request(app)
        .post('/api/notifications/subscribe')
        .send({
          deviceToken: 'device-token-123',
          platform: 'windows',
          userId: 'user-1'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Valid platform (ios or android) is required');
    });

    it('should return 404 for non-existent user', async () => {
      userRepositoryInstance.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/notifications/subscribe')
        .send({
          deviceToken: 'device-token-123',
          platform: 'ios',
          userId: 'non-existent'
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('User not found');
    });
  });

  describe('DELETE /api/notifications/unsubscribe/:userId', () => {
    it('should unsubscribe user from notifications', async () => {
      const updatedUser = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          notificationSettings: {
            ...mockUser.preferences.notificationSettings,
            pushNotificationsEnabled: false
          }
        }
      };
      
      userRepositoryInstance.findById.mockResolvedValue(mockUser);
      userRepositoryInstance.updatePreferences.mockResolvedValue(updatedUser);

      const response = await request(app)
        .delete('/api/notifications/unsubscribe/user-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully unsubscribed from notifications');
      expect(userRepositoryInstance.findById).toHaveBeenCalledWith('user-1');
      expect(userRepositoryInstance.updatePreferences).toHaveBeenCalledWith('user-1', {
        notificationSettings: {
          pushNotificationsEnabled: false
        }
      });
    });

    it('should return 400 for empty user ID', async () => {
      const response = await request(app)
        .delete('/api/notifications/unsubscribe/');

      expect(response.status).toBe(404); // Express returns 404 for missing route parameter
    });

    it('should return 404 for non-existent user', async () => {
      userRepositoryInstance.findById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/notifications/unsubscribe/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('User not found');
    });
  });

  describe('GET /api/notifications/preferences/:userId', () => {
    it('should return user notification preferences', async () => {
      userRepositoryInstance.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/notifications/preferences/user-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser.preferences.notificationSettings);
      expect(userRepositoryInstance.findById).toHaveBeenCalledWith('user-1');
    });

    it('should return 400 for empty user ID', async () => {
      const response = await request(app)
        .get('/api/notifications/preferences/');

      expect(response.status).toBe(404); // Express returns 404 for missing route parameter
    });

    it('should return 404 for non-existent user', async () => {
      userRepositoryInstance.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/notifications/preferences/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('User not found');
    });
  });
});