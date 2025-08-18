/**
 * API Client for ChitJar Frontend
 *
 * This module provides a wrapper for calling backend APIs with authentication
 * and error handling.
 */

class ApiClient {
  constructor() {
    // Base URL for API requests
    this.baseURL = '/api/v1';

    // Auth token storage
    this.authToken = null;

    // Initialize from localStorage
    this.loadTokenFromStorage();
  }

  /**
   * Load auth token from localStorage
   */
  loadTokenFromStorage() {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        this.authToken = token;
      }
    } catch (error) {
      // Failed to load auth token from storage
    }
  }

  /**
   * Save auth token to localStorage
   */
  saveTokenToStorage() {
    try {
      if (this.authToken) {
        localStorage.setItem('authToken', this.authToken);
      } else {
        localStorage.removeItem('authToken');
      }
    } catch (error) {
      // Failed to save auth token to storage
    }
  }

  /**
   * Clear auth token from memory and storage
   */
  clearToken() {
    this.authToken = null;
    try {
      localStorage.removeItem('authToken');
    } catch (error) {
      // Failed to clear auth token from storage
    }
  }

  /**
   * Set auth token
   */
  setAuthToken(token) {
    this.authToken = token;
    this.saveTokenToStorage();
  }

  /**
   * Get auth headers
   */
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Make an API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    // For multipart form data, we don't want to set Content-Type header
    // as the browser will set it with the correct boundary
    const isMultipart = options.body instanceof FormData;

    const config = {
      headers: isMultipart ? {} : this.getAuthHeaders(),
      ...options,
    };

    // Add auth header for multipart requests
    if (isMultipart && this.authToken) {
      config.headers['Authorization'] = `Bearer ${this.authToken}`;
    } else if (!isMultipart) {
      // For non-multipart requests, merge with default headers
      config.headers = { ...this.getAuthHeaders(), ...config.headers };
    }

    const response = await fetch(url, config);

    // Handle successful responses
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text();
    }

    // Handle error responses
    let errorData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      errorData = await response.json();
    } else {
      errorData = { message: response.statusText };
    }

    // Handle token expiration
    if (response.status === 401) {
      this.clearToken();
      // Redirect to login page
      window.location.href = '/login.html';
    }

    throw new Error(
      errorData.message || `HTTP ${response.status}: ${response.statusText}`
    );
  }
  /**
   * GET request
   */
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * User signup
   */
  async signup(userData) {
    const response = await this.post('/auth/signup', userData);
    if (response.data && response.data.accessToken) {
      this.setAuthToken(response.data.accessToken);
    }
    return response;
  }

  /**
   * User login
   */
  async login(credentials) {
    const response = await this.post('/auth/login', credentials);
    if (response.data && response.data.accessToken) {
      this.setAuthToken(response.data.accessToken);
      // Save refresh token if provided
      if (response.data.refreshToken) {
        try {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        } catch (error) {
          // Failed to save refresh token to storage
        }
      }
    }
    return response;
  }

  /**
   * User logout
   */
  async logout() {
    try {
      await this.post('/auth/logout', {
        refreshToken: localStorage.getItem('refreshToken'),
      });
    } catch (error) {
      // Ignore logout errors
    } finally {
      this.clearToken();
      // Clear refresh token if stored
      try {
        localStorage.removeItem('refreshToken');
      } catch (error) {
        // Failed to clear refresh token
      }
    }
  }

  /**
   * Refresh auth token
   */
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.post('/auth/refresh', { refreshToken });
      if (response.data && response.data.accessToken) {
        this.setAuthToken(response.data.accessToken);
        // Save refresh token if provided
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
      }
      return response;
    } catch (error) {
      // Clear tokens on refresh failure
      this.clearToken();
      try {
        localStorage.removeItem('refreshToken');
      } catch (e) {
        // Failed to clear refresh token
      }
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getProfile() {
    return this.get('/auth/profile');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.authToken;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
