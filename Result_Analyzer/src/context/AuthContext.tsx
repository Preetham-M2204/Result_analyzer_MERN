/**
 * AUTHENTICATION CONTEXT
 * ======================
 * Global state management for authentication
 * 
 * Purpose:
 * - Store current user and token
 * - Provide login/logout functions
 * - Persist auth state across page refreshes
 * - Make auth data available throughout the app
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthContextType, LoginCredentials } from '../types/auth.types';
import * as authApi from '../api/authApi';

/**
 * Create Auth Context
 * 
 * This will be used by useAuth() hook to access auth state
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Component
 * 
 * Wraps the entire app to provide authentication state
 * 
 * Usage in main.tsx:
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // ============================================================
  // STATE
  // ============================================================
  
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // ============================================================
  // INITIALIZE AUTH STATE FROM LOCALSTORAGE
  // ============================================================
  
  /**
   * On component mount:
   * 1. Check if token exists in localStorage
   * 2. If yes, fetch current user from backend
   * 3. Restore user session
   * 
   * This runs once when app loads
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get token from localStorage
        const storedToken = localStorage.getItem('token');
        
        if (storedToken) {
          // Token exists, verify it's still valid
          console.log('🔍 Found stored token, verifying...');
          
          // Fetch current user from backend
          const userData = await authApi.getCurrentUser();
          
          // Token is valid, restore session
          setToken(storedToken);
          setUser(userData);
          console.log('✅ Session restored:', userData.email);
          
        } else {
          console.log('ℹ️ No stored token found');
        }
        
      } catch (error) {
        console.error('❌ Failed to restore session:', error);
        
        // Token is invalid/expired, clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
      } finally {
        // Always set loading to false after initialization
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, []); // Run only once on mount
  
  // ============================================================
  // LOGIN FUNCTION
  // ============================================================
  
  /**
   * Login Function
   * 
   * Steps:
   * 1. Call backend login API
   * 2. Receive token and user data
   * 3. Store in localStorage
   * 4. Update state
   * 5. Redirect handled by calling component
   * 
   * @param credentials - Email and password
   * @throws Error if login fails
   */
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      console.log('🔐 Logging in...', credentials.email);
      
      // Call backend login API
      const response = await authApi.login(credentials);
      
      // Extract token and user from response
      const { token: newToken, user: userData } = response;
      
      // Store in localStorage (persists across page refreshes)
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setToken(newToken);
      setUser(userData);
      
      console.log('✅ Login successful:', userData.email);
      
    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      throw error; // Re-throw to be handled by Login component
    }
  };
  
  // ============================================================
  // LOGOUT FUNCTION
  // ============================================================
  
  /**
   * Logout Function
   * 
   * Steps:
   * 1. Clear localStorage
   * 2. Clear state
   * 3. Redirect to login (handled by calling component)
   */
  const logout = (): void => {
    console.log('🚪 Logging out...');
    
    // Clear localStorage
    authApi.logout();
    
    // Clear state
    setToken(null);
    setUser(null);
    
    console.log('✅ Logged out successfully');
  };
  
  // ============================================================
  // COMPUTED VALUES
  // ============================================================
  
  /**
   * Is user authenticated?
   * 
   * Returns true if both token and user exist
   */
  const isAuthenticated = !!(token && user);
  
  // ============================================================
  // CONTEXT VALUE
  // ============================================================
  
  /**
   * Value provided to all components via useAuth() hook
   */
  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated,
  };
  
  // ============================================================
  // RENDER
  // ============================================================
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth Hook
 * 
 * Custom hook to access authentication state
 * 
 * Usage in any component:
 * const { user, login, logout, isAuthenticated } = useAuth();
 * 
 * @returns AuthContextType
 * @throws Error if used outside AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
