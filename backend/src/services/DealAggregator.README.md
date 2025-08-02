# DealAggregator Service

## Overview

The DealAggregator service is responsible for coordinating data collection from multiple sources (Kroger API and Publix web scraping), validating and normalizing deal data, managing scheduled jobs for periodic data refresh, and handling deal expiration cleanup.

## Features

### 1. Data Aggregation
- **Kroger API Integration**: Fetches deals from Kroger API using the KrogerAPIClient
- **Publix Web Scraping**: Collects deals from Publix website using the PublixScraper
- **Unified Processing**: Processes deals from both sources through a common pipeline

### 2. Data Validation and Normalization
- **Input Validation**: Validates required fields (title, prices, dates)
- **Price Normalization**: Rounds prices to 2 decimal places
- **Discount Calculation**: Automatically calculates discount percentages
- **Data Consistency**: Ensures consistent data format across different sources

### 3. Scheduled Jobs
- **Kroger Refresh**: Every 4 hours (configurable)
- **Publix Refresh**: Every 6 hours (configurable)
- **Expired Deal Cleanup**: Daily at 2 AM (configurable)
- **Timezone Support**: Uses America/New_York timezone

### 4. Deal Expiration Management
- **Automatic Cleanup**: Identifies and removes expired deals
- **Soft Delete**: Uses repository's soft delete functionality
- **Error Handling**: Gracefully handles individual deletion failures

### 5. Statistics and Monitoring
- **Aggregation Stats**: Tracks runs, success/failure rates, processing times
- **Performance Metrics**: Average processing time calculation
- **Error Reporting**: Detailed error collection and reporting

## API

### Core Methods

#### `aggregateAllDeals(): Promise<AggregationResult[]>`
Aggregates deals from all sources (Kroger and Publix).

#### `aggregateKrogerDeals(): Promise<AggregationResult>`
Aggregates deals specifically from Kroger API.

#### `aggregatePublixDeals(): Promise<AggregationResult>`
Aggregates deals specifically from Publix web scraping.

#### `cleanupExpiredDeals(): Promise<{deletedCount: number, errors: string[]}>`
Removes expired deals from the database.

### Scheduling Methods

#### `startScheduledJobs(): void`
Starts all scheduled jobs for automatic data refresh.

#### `stopScheduledJobs(): void`
Stops all scheduled jobs.

### Utility Methods

#### `getStats(): AggregationStats`
Returns current aggregation statistics.

#### `isAggregationRunning(): boolean`
Checks if aggregation is currently in progress.

#### `cleanup(): Promise<void>`
Cleans up resources and stops all jobs.

## Data Flow

1. **Scheduled Trigger**: Cron jobs trigger aggregation at specified intervals
2. **Source Data Fetch**: Retrieve deals from Kroger API or Publix scraper
3. **Store Location Mapping**: Associate deals with relevant store locations
4. **Data Validation**: Validate required fields and data consistency
5. **Data Normalization**: Standardize prices, dates, and format
6. **Duplicate Detection**: Check for existing deals (simplified implementation)
7. **Database Operations**: Create new deals or update existing ones
8. **Store Association**: Link deals with store locations
9. **Statistics Update**: Track processing metrics
10. **Error Handling**: Log and report any processing errors

## Error Handling

- **Graceful Degradation**: Individual deal processing errors don't stop the entire batch
- **Retry Logic**: Built into underlying services (KrogerAPIClient, PublixScraper)
- **Error Aggregation**: Collects all errors for reporting
- **Success Threshold**: Considers aggregation successful if less than 50% of deals fail

## Configuration

The service uses environment-based configuration through the underlying services:
- Kroger API credentials via KrogerAPIClient
- Publix scraping settings via PublixScraper
- Database connection via repositories

## Dependencies

- **KrogerAPIClient**: For Kroger API integration
- **PublixScraper**: For Publix web scraping
- **DealRepository**: For deal database operations
- **StoreRepository**: For store location management
- **node-cron**: For scheduled job management
- **winston**: For logging (via logger utility)

## Usage Example

```typescript
import { DealAggregator } from './services/DealAggregator';

// Initialize with default dependencies
const aggregator = new DealAggregator();

// Start scheduled jobs
aggregator.startScheduledJobs();

// Manual aggregation
const results = await aggregator.aggregateAllDeals();
console.log(`Processed ${results.length} sources`);

// Check statistics
const stats = aggregator.getStats();
console.log(`Total runs: ${stats.totalRuns}`);

// Cleanup when done
await aggregator.cleanup();
```

## Testing

The service includes comprehensive unit tests covering:
- Constructor initialization
- Kroger deal aggregation
- Publix deal aggregation
- Error handling scenarios
- Statistics tracking
- Resource cleanup

Tests use Jest with mocked dependencies to ensure isolated testing of the aggregation logic.

## Requirements Fulfilled

This implementation addresses the following requirements from the specification:

- **2.3**: Deal data aggregation from multiple sources
- **2.4**: Periodic data refresh and expiration management

## Future Enhancements

1. **Advanced Duplicate Detection**: Implement fuzzy matching for better duplicate detection
2. **Rate Limiting**: Add configurable rate limiting for external API calls
3. **Metrics Dashboard**: Expose metrics for monitoring dashboards
4. **Deal Comparison**: Compare deals across sources for price optimization
5. **Notification System**: Alert on significant price changes or new deals
6. **Data Quality Metrics**: Track data quality scores and validation failures