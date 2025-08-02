# Grocery Store Integration Services

This directory contains services that integrate with various grocery store APIs and websites to fetch deal and promotional data.

## Services Overview

- **KrogerAPIClient**: Integrates with Kroger's public API for digital coupons and promotions
- **PublixScraper**: Web scraping service for Publix weekly ads and BOGO deals

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

---

# Publix Web Scraping Service

The `PublixScraper` class provides web scraping capabilities for Publix weekly ads to extract BOGO and discount deals.

## PublixScraper

### Features

- **Puppeteer-based Scraping**: Uses headless Chrome for reliable web scraping
- **Deal Type Detection**: Automatically identifies BOGO and discount deals
- **Retry Logic**: Implements exponential backoff for failed scraping attempts
- **Error Handling**: Comprehensive error handling with proper logging
- **Data Validation**: Filters out invalid deals and validates price information
- **Resource Management**: Proper browser lifecycle management and cleanup

### Methods

#### `scrapeDeals(): Promise<ScrapingResult>`
Scrapes Publix weekly ad pages and returns structured deal data.

#### `cleanup(): Promise<void>`
Cleans up browser resources and closes connections.

### Data Structure

The scraper returns a `ScrapingResult` object:

```typescript
interface ScrapingResult {
  success: boolean;
  deals: ScrapedDeal[];
  error?: string;
  scrapedAt: Date;
}

interface ScrapedDeal {
  title: string;
  description: string;
  originalPrice: number;
  salePrice: number;
  dealType: DealType; // 'bogo' or 'discount'
  validFrom: Date;
  validUntil: Date;
  category: string;
  restrictions?: string;
  imageUrl?: string;
}
```

### Usage Example

```typescript
import { PublixScraper } from './services/PublixScraper';

const scraper = new PublixScraper();

try {
  const result = await scraper.scrapeDeals();
  
  if (result.success) {
    console.log(`Scraped ${result.deals.length} deals`);
    result.deals.forEach(deal => {
      console.log(`${deal.title}: $${deal.originalPrice} -> $${deal.salePrice}`);
    });
  } else {
    console.error('Scraping failed:', result.error);
  }
} finally {
  await scraper.cleanup();
}
```

### Configuration

The scraper is configured with:

- **Base URL**: `https://www.publix.com/savings/weekly-ad`
- **Max Retries**: 3 attempts with exponential backoff
- **Browser Args**: Optimized for headless operation with security flags
- **Timeouts**: 30s for navigation, 15s for element waiting

### Deal Processing

The scraper processes deals through several stages:

1. **Navigation**: Loads the Publix weekly ad page
2. **Element Detection**: Finds deal containers using CSS selectors
3. **Data Extraction**: Extracts title, price, category, and image information
4. **Price Parsing**: Parses price strings and calculates discounts
5. **Validation**: Filters out invalid deals (no discount, missing data)
6. **Transformation**: Converts to standardized ScrapedDeal format

### Error Handling

The service handles various error scenarios:

- **Navigation Failures**: Retries with exponential backoff
- **Element Not Found**: Graceful handling of missing page elements
- **Browser Crashes**: Proper cleanup and error reporting
- **Network Issues**: Timeout handling and retry logic
- **Parsing Errors**: Individual deal parsing failures don't stop the entire process

### Testing

Comprehensive tests are provided in:
- `src/tests/services/PublixScraper.unit.test.ts` - Unit tests with mocked browser
- `src/tests/services/PublixScraper.integration.test.ts` - Integration tests with mock HTML

The tests cover:
- Successful scraping scenarios
- Error handling and retry logic
- Data validation and filtering
- Browser lifecycle management
- HTML parsing with various page structures

### Requirements Fulfilled

This implementation fulfills the following requirements from the specification:

- **Requirement 2.1**: Scrapes weekly BOGO and discount data from Publix online weekly ad pages
- **Requirement 2.6**: Implements proper error handling and retry logic with exponential backoff

The service is designed to be used by the deal aggregation service to collect Publix deal data as part of the larger grocery deals system.