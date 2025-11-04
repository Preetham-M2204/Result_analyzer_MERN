/**
 * AUTHENTICATION API FUNCTIONS
 * =============================
 * All API calls related to authentication
 */

import apiClient from './apiClient';
import type { LoginCredentials, LoginResponse, ChangePasswordData, User } from '../types/auth.types';

/**
 * Login Function
 * 
 * Sends email and password to backend
 * Returns JWT token and user data
 * 
 * @param credentials - Email and password
 * @returns Login response with token and user
 * 
 * Example:
 * const response = await login({ 
 *   email: 'mypt1991@gmail.com', 
 *   password: '1BI23IS082' 
 * });
 * // Response: { success: true, token: "eyJ...", user: {...} }
 */
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    // POST request to /api/auth/login
    const response = await apiClient.post<LoginResponse>('/api/auth/login', credentials);
    
    // Return the response data
    return response.data;
    
  } catch (error: any) {
    // Handle errors
    const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
    throw new Error(errorMessage);
  }
};

/**
 * Get Current User Function
 * 
 * Fetches current user's data using stored JWT token
 * Used on app startup to restore user session
 * 
 * @returns Current user data
 * 
 * Example:
 * const user = await getCurrentUser();
 * // Response: { success: true, user: {...} }
 */
export const getCurrentUser = async (): Promise<User> => {
  try {
    // GET request to /api/auth/me (protected route)
    // Token automatically added by apiClient interceptor
    const response = await apiClient.get<{ success: boolean; user: User }>('/api/auth/me');
    
    return response.data.user;
    
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 'Failed to fetch user data';
    throw new Error(errorMessage);
  }
};

/**
 * Change Password Function
 * 
 * Changes user's password
 * Requires current password for verification
 * 
 * @param data - Current and new passwords
 * @returns Success response
 * 
 * Example:
 * await changePassword({ 
 *   currentPassword: '1BI23IS082', 
 *   newPassword: 'MyNewPassword123' 
 * });
 */
export const changePassword = async (data: ChangePasswordData): Promise<{ success: boolean; message: string }> => {
  try {
    // POST request to /api/auth/change-password (protected route)
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/api/auth/change-password',
      data
    );
    
    return response.data;
    
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 'Failed to change password';
    throw new Error(errorMessage);
  }
};

/**
 * Logout Function
 * 
 * Logs out the user
 * JWT is stateless, so just clear localStorage on client side
 * 
 * Note: Could call /api/auth/logout endpoint if we implement token blacklisting
 */
export const logout = (): void => {
  // Remove token and user data from localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Clear axios Authorization header
  delete apiClient.defaults.headers.common['Authorization'];
  
  console.log('🚪 Logged out successfully');
};
