import { getAdminHeaders } from './api';
import { getAdminKey } from './storage';

// Mock storage functions
jest.mock('./storage', () => ({
  ...jest.requireActual('./storage'), // import and retain default behavior
  getAdminKey: jest.fn(),
}));

const mockGetAdminKey = getAdminKey as jest.Mock;

describe('api.ts', () => {
  describe('getAdminHeaders', () => {
    beforeEach(() => {
      mockGetAdminKey.mockReset();
    });

    it('should return correct headers if admin key exists', () => {
      const mockKey = 'test-admin-key';
      mockGetAdminKey.mockReturnValue(mockKey);

      const headers = getAdminHeaders();
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-Admin-Key': mockKey,
      });
      expect(mockGetAdminKey).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if admin key is not configured (undefined)', () => {
      mockGetAdminKey.mockReturnValue(undefined);
      expect(() => getAdminHeaders()).toThrow('Admin API key is not configured.');
      expect(mockGetAdminKey).toHaveBeenCalledTimes(1);
    });
  });
});
