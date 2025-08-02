# Kroger API Integration Service

This directory contains the KrogerAPIClient service that integrates with Kroger's public API to fetch digital coupons and promotional data.

## KrogerAPIClient

The `KrogerAPIClient` class provides a comprehensive interface for interacting with Kroger's API, including:

### Features

- **OAuth Authentication**: Automatic OAuth2 client credentials flow authentication
- **Rate Limiting**: Built-in rate limiting to respect Kroger API limits (100 requests/minute)
- **Error Handling**: Comprehensive error handling with automatic token refresh
- **Data Transformation**: Converts Kroger API responses to internal Deal model format
- **Retry Logic**: Automatic retry for failed requests with exponential backoff

### Methods

#### `fetchDigitalCoupons(locationId?: string): Promise<Deal[]>`
Fetches digital coupons from Kroger API and transforms them to internal Deal format.

#### `fetchPromotions(locationId?: string): Promise<Deal[]>`
Fetches promotional data from Kroger API and transforms them to internal Deal format.

#### `fetchAllDeals(locationId?: string): Promise<Deal[]>`
Fetches both digital coupons and promotions in parallel, handling partial failures gracefully.

#### `testConnection(): Promise<boolean>`
Tests the API connection and authentication.

#### `getRateLimitStatus(): object`
Returns current rate limiting status including request count and window information.

### Configuration

The service requires the following environment variables:

```env
KROGER_CLIENT_ID=your-kroger-client-id
KROGER_CLIENT_SECRET=your-kroger-client-secret
```

### Usage Example

```typescript
import { KrogerAPIClient } from './services/KrogerAPIClient';

const krogerClient = new KrogerAPIClient();

// Fetch all deals for a specific location
const deals = await krogerClient.fetchAllDeals('location-123');

// Test connection
const isConnected = await krogerClient.testConnection();

// Check rate limit status
const rateLimitStatus = krogerClient.getRateLimitStatus();
```

### Deal Type Transformations

The service transforms Kroger API data into our internal Deal model:

- **Digital Coupons**: Converted to `DealType.COUPON` or `DealType.BOGO`
- **Promotions**: Converted to `DealType.DISCOUNT` or `DealType.BOGO`
- **Price Calculations**: Handles DOLLAR_OFF, PERCENT_OFF, and BOGO value types
- **Image URLs**: Extracts medium-sized product images when available
- **Item IDs**: Maps UPC codes to internal item identifiers

### Error Handling

The service includes robust error handling for:

- Authentication failures with automatic token refresh
- Rate limiting with automatic delays
- Network timeouts and connection issues
- API response validation
- Partial failure scenarios (e.g., coupons succeed but promotions fail)

### Testing

Comprehensive unit tests are provided in:
- `src/tests/services/KrogerAPIClient.test.ts` - Full test suite (requires database)
- `src/tests/services/KrogerAPIClient.standalone.test.ts` - Standalone tests (no database required)

The tests cover:
- Authentication flows
- Data transformation logic
- Error handling scenarios
- Rate limiting behavior
- API response parsing
- Partial failure handling

### Requirements Fulfilled

This implementation fulfills the following requirements from the specification:

- **Requirement 2.2**: Fetches digital coupon and promotional data from Kroger's public API
- **Requirement 2.6**: Implements proper error handling and retry logic with exponential backoff

The service is designed to be used by the deal aggregation service to collect Kroger deal data as part of the larger grocery deals system.