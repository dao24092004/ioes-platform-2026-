import { ApiResponse } from './api-response.dto';

describe('ApiResponse', () => {
  describe('success', () => {
    it('should create a success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = ApiResponse.success(data);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Success');
      expect(response.data).toEqual(data);
      expect(response.timestamp).toBeDefined();
    });

    it('should create a success response with custom message', () => {
      const response = ApiResponse.success('payload', 'Operation completed');

      expect(response.message).toBe('Operation completed');
    });
  });

  describe('error', () => {
    it('should create an error response', () => {
      const response = ApiResponse.error('Something went wrong');

      expect(response.success).toBe(false);
      expect(response.message).toBe('Something went wrong');
      expect(response.data).toBeUndefined();
    });
  });
});
