/**
 * AXIOS API CLIENT CONFIGURATION
 * ================================
 * Centralized axios instance with base URL and interceptors
 */

import axios from 'axios';

/**
 * Base API URL
 * 
 * Points to the backend server
 * Development: http://localhost:5000
 * Production: Will be changed to actual server URL
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Axios Instance
 * 
 * Pre-configured axios client with:
 * - Base URL set to backend server
 * - JSON content type
 * - Request/response interceptors for token handling
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Log the API configuration on startup
console.log('🔧 API Client Configuration:');
console.log('   Base URL:', API_BASE_URL);
console.log('   Full login URL will be:', `${API_BASE_URL}/api/auth/login`);

/**
 * REQUEST INTERCEPTOR
 * 
 * Automatically adds JWT token to all requests
 * 
 * How it works:
 * 1. Before each request, check localStorage for token
 * 2. If token exists, add to Authorization header
 * 3. Backend receives: Authorization: Bearer <token>
 */
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add to Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development (helpful for debugging)
    if (import.meta.env.DEV) {
      const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`, config.data);
      console.log(`   Full URL: ${fullUrl}`);
      console.log(`   Has Token: ${!!token}`);
    }
    
    return config;
  },
  (error) => {
    // Handle request error
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR
 * 
 * Handles common response scenarios:
 * - Success: Log and return data
 * - 401 Unauthorized: Token expired, redirect to login
 * - Other errors: Log and reject
 */
apiClient.interceptors.response.use(
  (response) => {
    // Log successful response in development
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
      console.log('   Response data:', response.data);
    }
    
    return response;
  },
  (error) => {
    // Handle response errors
    
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || 'An error occurred';
      const url = error.config?.url || 'unknown';
      const method = error.config?.method?.toUpperCase() || 'unknown';
      
      console.error(`❌ Response Error (${status}): ${message}`);
      console.error(`   Failed URL: ${error.config?.baseURL}${url}`);
      console.error(`   Method: ${method}`);
      
      // Handle 401 Unauthorized (token expired or invalid)
      if (status === 401) {
        console.warn('🔒 Unauthorized - Token may be expired');
        
        // Clear token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login page (if not already there)
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      
      // Handle 403 Forbidden (insufficient permissions)
      if (status === 403) {
        console.warn('🚫 Access Denied - Insufficient permissions');
      }
      
    } else if (error.request) {
      // Request made but no response received
      console.error('❌ No response from server');
      console.error('   This usually means the backend is not running or CORS is blocking the request');
      console.error('   Request details:', error.request);
    } else {
      // Error setting up the request
      console.error('❌ Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Export the configured axios instance
 * 
 * Usage in other files:
 * import apiClient from '@/api/apiClient';
 * const response = await apiClient.post('/api/auth/login', { email, password });
 */
export default apiClient;
