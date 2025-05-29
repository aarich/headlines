import { clamp, getDomainFromUrl } from 'lib/utils';

describe('utils.ts', () => {
  describe('clamp', () => {
    it('should not change value if within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });
    it('should clamp to min if value is less than min', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });
    it('should clamp to max if value is greater than max', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });
    it('should work with negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(0, -10, -1)).toBe(-1);
    });
    it('should handle min and max being equal', () => {
      expect(clamp(5, 5, 5)).toBe(5);
      expect(clamp(0, 5, 5)).toBe(5);
      expect(clamp(10, 5, 5)).toBe(5);
    });
  });

  describe('getDomainFromUrl', () => {
    it('should extract the domain correctly', () => {
      expect(getDomainFromUrl('https://www.example.com/path')).toBe('example.com');
      expect(getDomainFromUrl('http://sub.example.co.uk/path?query=1')).toBe('sub.example.co.uk');
      expect(getDomainFromUrl('ftp://example.com')).toBe('example.com');
    });
    it('should remove www. prefix', () => {
      expect(getDomainFromUrl('https://www.google.com')).toBe('google.com');
      expect(getDomainFromUrl('http://www.sub.domain.com')).toBe('sub.domain.com');
    });
    it('should handle URLs without www. prefix', () => {
      expect(getDomainFromUrl('https://gitlab.com')).toBe('gitlab.com');
    });
    it('should handle URLs with only domain and TLD', () => {
      expect(getDomainFromUrl('https://example.io')).toBe('example.io');
    });
    it('should return the original string if URL parsing fails (e.g. no protocol or invalid)', () => {
      expect(getDomainFromUrl('not a url')).toBe('not a url');
      expect(getDomainFromUrl('example.com')).toBe('example.com'); // No protocol
      expect(getDomainFromUrl('')).toBe('');
    });
  });
});
