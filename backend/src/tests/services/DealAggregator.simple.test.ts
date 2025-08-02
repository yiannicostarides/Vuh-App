import { DealAggregator } from '../../services/DealAggregator';

describe('DealAggregator Simple Tests', () => {
  let dealAggregator: DealAggregator;

  beforeEach(() => {
    dealAggregator = new DealAggregator();
  });

  afterEach(() => {
    dealAggregator.stopScheduledJobs();
  });

  it('should initialize correctly', () => {
    expect(dealAggregator).toBeInstanceOf(DealAggregator);
    expect(dealAggregator.isAggregationRunning()).toBe(false);
  });

  it('should start and stop scheduled jobs without errors', () => {
    expect(() => {
      dealAggregator.startScheduledJobs();
      dealAggregator.stopScheduledJobs();
    }).not.toThrow();
  });

  it('should return initial statistics', () => {
    const stats = dealAggregator.getStats();
    expect(stats.totalRuns).toBe(0);
    expect(stats.successfulRuns).toBe(0);
    expect(stats.failedRuns).toBe(0);
    expect(stats.totalDealsProcessed).toBe(0);
    expect(stats.averageProcessingTime).toBe(0);
  });

  it('should cleanup without errors', async () => {
    await expect(dealAggregator.cleanup()).resolves.not.toThrow();
  });
});