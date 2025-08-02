import express from 'express';
import { ApiResponse, User, UpdateUserPreferencesRequest, UserLocation } from '../types/models';
import { UserRepository } from '../repositories/UserRepository';
import { createError } from '../middleware/errorHandler';

const router = express.Router();
const userRepository = new UserRepository();

// POST /api/users - Create or update user
router.post('/', async (req, res, next) => {
  try {
    const userData = req.body;
    
    // Validate required fields
    if (!userData.deviceId || userData.deviceId.trim().length === 0) {
      throw createError('Device ID is required', 400);
    }

    // Check if user already exists
    let user = await userRepository.findByDeviceId(userData.deviceId);
    
    if (user) {
      // Update existing user's last login
      user = await userRepository.updateLastLogin(user.id);
      
      const response: ApiResponse<User> = {
        success: true,
        data: user!,
        message: 'User login updated',
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
    } else {
      // Create new user
      const defaultPreferences = {
        maxRadius: userData.preferences?.maxRadius || 10,
        preferredStores: userData.preferences?.preferredStores || [],
        categories: userData.preferences?.categories || [],
        notificationSettings: {
          dealExpirationReminders: userData.preferences?.notificationSettings?.dealExpirationReminders ?? true,
          newDealAlerts: userData.preferences?.notificationSettings?.newDealAlerts ?? true,
          priceDropAlerts: userData.preferences?.notificationSettings?.priceDropAlerts ?? true,
          pushNotificationsEnabled: userData.preferences?.notificationSettings?.pushNotificationsEnabled ?? true
        }
      };

      const newUser = await userRepository.create({
        deviceId: userData.deviceId,
        preferences: defaultPreferences,
        location: userData.location,
        lastLoginAt: new Date(),
        isActive: true
      });

      const response: ApiResponse<User> = {
        success: true,
        data: newUser,
        message: 'User created successfully',
        timestamp: new Date().toISOString()
      };
      
      res.status(201).json(response);
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id || id.trim().length === 0) {
      throw createError('User ID is required', 400);
    }

    const user = await userRepository.findById(id);
    
    if (!user) {
      throw createError('User not found', 404);
    }

    const response: ApiResponse<User> = {
      success: true,
      data: user,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/users/device/:deviceId - Get user by device ID
router.get('/device/:deviceId', async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    
    if (!deviceId || deviceId.trim().length === 0) {
      throw createError('Device ID is required', 400);
    }

    const user = await userRepository.findByDeviceId(deviceId);
    
    if (!user) {
      throw createError('User not found', 404);
    }

    const response: ApiResponse<User> = {
      success: true,
      data: user,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id/preferences - Update user preferences
router.put('/:id/preferences', async (req, res, next) => {
  try {
    const { id } = req.params;
    const preferences: UpdateUserPreferencesRequest = req.body;
    
    if (!id || id.trim().length === 0) {
      throw createError('User ID is required', 400);
    }

    // Validate preferences
    if (preferences.maxRadius !== undefined) {
      if (preferences.maxRadius <= 0 || preferences.maxRadius > 100) {
        throw createError('Max radius must be between 0 and 100 miles', 400);
      }
    }

    const updatedUser = await userRepository.updatePreferences(id, preferences);
    
    if (!updatedUser) {
      throw createError('User not found', 404);
    }

    const response: ApiResponse<User> = {
      success: true,
      data: updatedUser,
      message: 'Preferences updated successfully',
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id/location - Update user location
router.put('/:id/location', async (req, res, next) => {
  try {
    const { id } = req.params;
    const locationData: UserLocation = req.body;
    
    if (!id || id.trim().length === 0) {
      throw createError('User ID is required', 400);
    }

    // Validate location data
    if (!locationData.latitude || !locationData.longitude) {
      throw createError('Latitude and longitude are required', 400);
    }

    if (locationData.latitude < -90 || locationData.latitude > 90) {
      throw createError('Latitude must be between -90 and 90', 400);
    }

    if (locationData.longitude < -180 || locationData.longitude > 180) {
      throw createError('Longitude must be between -180 and 180', 400);
    }

    const location: UserLocation = {
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      lastUpdated: new Date()
    };

    const updatedUser = await userRepository.updateLocation(id, location);
    
    if (!updatedUser) {
      throw createError('User not found', 404);
    }

    const response: ApiResponse<User> = {
      success: true,
      data: updatedUser,
      message: 'Location updated successfully',
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id || id.trim().length === 0) {
      throw createError('User ID is required', 400);
    }

    const deleted = await userRepository.delete(id);
    
    if (!deleted) {
      throw createError('User not found', 404);
    }

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'User deleted successfully',
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;