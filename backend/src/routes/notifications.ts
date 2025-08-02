import express from 'express';
import { ApiResponse, NotificationSubscriptionRequest } from '../types/models';
import { UserRepository } from '../repositories/UserRepository';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();
const userRepository = new UserRepository();

// POST /api/notifications/subscribe - Subscribe to push notifications
router.post('/subscribe', async (req, res, next) => {
  try {
    const subscriptionData: NotificationSubscriptionRequest = req.body;
    
    // Validate required fields
    if (!subscriptionData.deviceToken || subscriptionData.deviceToken.trim().length === 0) {
      throw createError('Device token is required', 400);
    }

    if (!subscriptionData.userId || subscriptionData.userId.trim().length === 0) {
      throw createError('User ID is required', 400);
    }

    if (!subscriptionData.platform || !['ios', 'android'].includes(subscriptionData.platform)) {
      throw createError('Valid platform (ios or android) is required', 400);
    }

    // Verify user exists
    const user = await userRepository.findById(subscriptionData.userId);
    if (!user) {
      throw createError('User not found', 404);
    }

    // Enable push notifications for the user
    await userRepository.updatePreferences(subscriptionData.userId, {
      notificationSettings: {
        pushNotificationsEnabled: true
      }
    });

    // Log subscription for monitoring (in a real implementation, you'd store the device token)
    logger.info('Push notification subscription', {
      userId: subscriptionData.userId,
      platform: subscriptionData.platform,
      deviceToken: subscriptionData.deviceToken.substring(0, 10) + '...' // Log partial token for privacy
    });

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'Successfully subscribed to notifications',
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/unsubscribe/:userId - Unsubscribe from notifications
router.delete('/unsubscribe/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    if (!userId || userId.trim().length === 0) {
      throw createError('User ID is required', 400);
    }

    // Verify user exists
    const user = await userRepository.findById(userId);
    if (!user) {
      throw createError('User not found', 404);
    }

    // Disable push notifications for the user
    await userRepository.updatePreferences(userId, {
      notificationSettings: {
        pushNotificationsEnabled: false
      }
    });

    logger.info('Push notification unsubscription', { userId });

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'Successfully unsubscribed from notifications',
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/preferences/:userId - Get user notification preferences
router.get('/preferences/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    if (!userId || userId.trim().length === 0) {
      throw createError('User ID is required', 400);
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw createError('User not found', 404);
    }

    const response: ApiResponse<typeof user.preferences.notificationSettings> = {
      success: true,
      data: user.preferences.notificationSettings,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;