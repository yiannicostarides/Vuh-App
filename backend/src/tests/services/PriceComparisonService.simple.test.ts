import { PriceComparisonService } from '../../services/PriceComparisonService';

describe('PriceComparisonService - Simple Tests', () => {
  let service: PriceComparisonService;

  beforeEach(() => {
    service = new PriceComparisonService();
  });

  describe('distance calculation', () => {
    it('should calculate distance between two points correctly', () => {
      // Test the private method through reflection
      const calculateDistance = (service as any).calculateDistance.bind(service);
      
      // Distance between NYC (40.7128, -74.0060) and LA (34.0522, -118.2437)
      const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
      
      // Should be approximately 2445 miles
      expect(distance).toBeGreaterThan(2400);
      expect(distance).toBeLessThan(2500);
    });

    it('should return 0 for same coordinates', () => {
      const calculateDistance = (service as any).calculateDistance.bind(service);
      
      const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
      
      expect(distance).toBe(0);
    });
  });

  describe('item ID generation', () => {
    it('should generate consistent item IDs', () => {
      const generateItemId = (service as any).generateItemId.bind(service);
      
      const id1 = generateItemId('Whole Wheat Bread');
      const id2 = generateItemId('whole wheat bread');
      const id3 = generateItemId('WHOLE WHEAT BREAD');
      
      expect(id1).toBe('whole-wheat-bread');
      expect(id2).toBe('whole-wheat-bread');
      expect(id3).toBe('whole-wheat-bread');
      expect(id1).toBe(id2);
      expect(id2).toBe(id3);
    });

    it('should handle special characters', () => {
      const generateItemId = (service as any).generateItemId.bind(service);
      
      const id = generateItemId('Coca-Cola® 2-Liter Bottle!');
      
      expect(id).toBe('coca-cola-2-liter-bottle');
    });

    it('should handle multiple spaces and dashes', () => {
      const generateItemId = (service as any).generateItemId.bind(service);
      
      const id = generateItemId('  Multiple   Spaces  --  And   Dashes  ');
      
      expect(id).toBe('multiple-spaces-and-dashes');
    });
  });

  describe('radians conversion', () => {
    it('should convert degrees to radians correctly', () => {
      const toRadians = (service as any).toRadians.bind(service);
      
      expect(toRadians(0)).toBe(0);
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2);
      expect(toRadians(180)).toBeCloseTo(Math.PI);
      expect(toRadians(360)).toBeCloseTo(2 * Math.PI);
    });
  });
});