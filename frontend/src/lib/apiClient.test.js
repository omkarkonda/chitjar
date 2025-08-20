import { apiClient } from './apiClient.js';

// Mock fetch globally
global.fetch = jest.fn();

// Create a mock Response class
class MockResponse {
  constructor(data, options = {}) {
    this.ok = options.ok !== undefined ? options.ok : true;
    this.status = options.status || 200;
    this.statusText = options.statusText || 'OK';
    this._data = data;
    this.headers = {
      get: (header) => {
        if (header.toLowerCase() === 'content-type') {
          return 'application/json';
        }
        return null;
      }
    };
  }

  async json() {
    return Promise.resolve(this._data);
  }

  async text() {
    return Promise.resolve(JSON.stringify(this._data));
  }
}

describe('API Client', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset the auth token for each test
    apiClient.authToken = null;
  });

  describe('Authentication', () => {
    test('should check if authenticated', () => {
      expect(apiClient.isAuthenticated()).toBe(false);
      apiClient.authToken = 'test-token';
      expect(apiClient.isAuthenticated()).toBe(true);
    });
  });

  describe('API Requests', () => {
    test('should make GET request with correct headers', async () => {
      global.fetch.mockResolvedValueOnce(
        new MockResponse({ data: 'test' }, { ok: true })
      );

      await apiClient.get('/test');

      expect(fetch).toHaveBeenCalledWith('/api/v1/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });

    test('should make GET request with auth token', async () => {
      global.fetch.mockResolvedValueOnce(
        new MockResponse({ data: 'test' }, { ok: true })
      );

      apiClient.authToken = 'test-token';
      await apiClient.get('/test');

      expect(fetch).toHaveBeenCalledWith('/api/v1/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });
    });

    test('should make POST request with correct headers and body', async () => {
      global.fetch.mockResolvedValueOnce(
        new MockResponse({ data: 'test' }, { ok: true })
      );

      const testData = { name: 'Test' };
      await apiClient.post('/test', testData);

      expect(fetch).toHaveBeenCalledWith('/api/v1/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });
    });

    test('should handle successful responses', async () => {
      const mockResponse = { data: 'test', message: 'Success' };
      global.fetch.mockResolvedValueOnce(
        new MockResponse(mockResponse, { ok: true })
      );

      const response = await apiClient.get('/test');
      expect(response).toEqual(mockResponse);
    });

    test('should handle API errors', async () => {
      global.fetch.mockResolvedValueOnce(
        new MockResponse({ message: 'Bad Request' }, { ok: false, status: 400, statusText: 'Bad Request' })
      );

      await expect(apiClient.get('/test')).rejects.toThrow('Bad Request');
    });

    test('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('Auth Methods', () => {
    test('should handle signup', async () => {
      const userData = { email: 'test@example.com', password: 'password', name: 'Test User' };
      const mockResponse = { data: { accessToken: 'test-token' } };
      
      global.fetch.mockResolvedValueOnce(
        new MockResponse(mockResponse, { ok: true })
      );

      const response = await apiClient.signup(userData);
      expect(response).toEqual(mockResponse);
      expect(apiClient.authToken).toBe('test-token');
    });

    test('should handle login', async () => {
      const credentials = { email: 'test@example.com', password: 'password' };
      const mockResponse = { data: { accessToken: 'test-token' } };
      
      global.fetch.mockResolvedValueOnce(
        new MockResponse(mockResponse, { ok: true })
      );

      const response = await apiClient.login(credentials);
      expect(response).toEqual(mockResponse);
      expect(apiClient.authToken).toBe('test-token');
    });

    test('should handle logout', async () => {
      apiClient.authToken = 'test-token';
      
      global.fetch.mockResolvedValueOnce(
        new MockResponse({ data: { message: 'Logged out successfully' } }, { ok: true })
      );

      await apiClient.logout();
      expect(apiClient.authToken).toBeNull();
    });

    test('should handle refresh token', async () => {
      // For now, just test that it throws an error when no refresh token is available
      await expect(apiClient.refreshToken()).rejects.toThrow('No refresh token available');
    });
  });
});