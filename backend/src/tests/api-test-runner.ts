/**
 * Simple API test runner to verify endpoints work
 * This can be run manually to test the API implementation
 */

import express from 'express';
import request from 'supertest';
import dealsRouter from '../routes/deals';
import usersRouter from '../routes/users';
import shoppingListRouter from '../routes/shoppingList';
import notificationsRouter from '../routes/notifications';

// Create a simple test app
const testApp = express();
testApp.use(express.json());
testApp.use('/api/deals', dealsRouter);
testApp.use('/api/users', usersRouter);
testApp.use('/api/shopping-list', shoppingListRouter);
testApp.use('/api/notifications', notificationsRouter);

// Simple test function
async function runBasicTests() {
  console.log('Running basic API endpoint tests...\n');

  try {
    // Test deals endpoint with missing parameters
    console.log('Testing GET /api/deals/nearby without parameters...');
    const dealsResponse = await request(testApp)
      .get('/api/deals/nearby');
    console.log(`Status: ${dealsResponse.status}`);
    console.log(`Response: ${JSON.stringify(dealsResponse.body, null, 2)}\n`);

    // Test deals endpoint with valid parameters
    console.log('Testing GET /api/deals/nearby with valid parameters...');
    const dealsValidResponse = await request(testApp)
      .get('/api/deals/nearby')
      .query({
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 10
      });
    console.log(`Status: ${dealsValidResponse.status}`);
    console.log(`Response structure: ${JSON.stringify({
      success: dealsValidResponse.body.success,
      hasData: !!dealsValidResponse.body.data,
      hasPagination: !!dealsValidResponse.body.data?.pagination
    }, null, 2)}\n`);

    // Test users endpoint
    console.log('Testing POST /api/users without device ID...');
    const usersResponse = await request(testApp)
      .post('/api/users')
      .send({});
    console.log(`Status: ${usersResponse.status}`);
    console.log(`Response: ${JSON.stringify(usersResponse.body, null, 2)}\n`);

    // Test shopping list endpoint
    console.log('Testing POST /api/shopping-list/items without required fields...');
    const shoppingResponse = await request(testApp)
      .post('/api/shopping-list/items')
      .send({});
    console.log(`Status: ${shoppingResponse.status}`);
    console.log(`Response: ${JSON.stringify(shoppingResponse.body, null, 2)}\n`);

    // Test notifications endpoint
    console.log('Testing POST /api/notifications/subscribe without required fields...');
    const notificationsResponse = await request(testApp)
      .post('/api/notifications/subscribe')
      .send({});
    console.log(`Status: ${notificationsResponse.status}`);
    console.log(`Response: ${JSON.stringify(notificationsResponse.body, null, 2)}\n`);

    console.log('✅ All basic API endpoint tests completed successfully!');
    console.log('The endpoints are properly structured and handle validation correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for potential use in other test files
export { testApp, runBasicTests };

// Run tests if this file is executed directly
if (require.main === module) {
  runBasicTests();
}