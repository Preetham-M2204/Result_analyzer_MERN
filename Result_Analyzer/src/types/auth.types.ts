/**
 * TYPE DEFINITIONS FOR AUTHENTICATION
 * ====================================
 * Defines TypeScript interfaces for user data and authentication
 */

/**
 * User Role Enum
 * 
 * Four types of users in the system:
 * - ADMIN: Full system access, can scrape results, manage all users
 * - HOD: Department-wide access, view all students/teachers
 * - TEACHER: View assigned subjects' results
 * - STUDENT: View own results only
 */
export type UserRole = 'ADMIN' | 'HOD' | 'TEACHER' | 'STUDENT';

/**
 * User Interface
 * 
 * Represents a logged-in user's data
 * Received from backend after successful login
 */
export interface User {
  id: string;                    // MongoDB _id
  email: string;                 // Login email
  role: UserRole;                // User's role
  name: string;                  // Full name
  mustChangePassword: boolean;   // Force password change on first login
  
  // Role-specific IDs (only one will be set based on role)
  usn?: string;                  // Student USN (e.g., "1BI23IS082")
  teacherId?: string;            // Teacher ID (e.g., "T010")
  hodId?: string;                // HOD ID (e.g., "T001")
  adminId?: string;              // Admin ID (e.g., "ADMIN001")
  
  // Teacher-specific
  assignedSubjects?: string[];   // Subject codes assigned to teacher
}

/**
 * Login Request Interface
 * 
 * Data sent to backend during login
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Login Response Interface
 * 
 * Data received from backend after successful login
 */
export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;      // JWT token (store in localStorage)
  user: User;         // User data (store in context/state)
}

/**
 * Change Password Request Interface
 * 
 * Data sent to backend when changing password
 */
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

/**
 * Auth Context Interface
 * 
 * State and methods available throughout the app via AuthContext
 */
export interface AuthContextType {
  user: User | null;                                      // Current logged-in user
  token: string | null;                                   // JWT token
  loading: boolean;                                       // Loading state
  login: (credentials: LoginCredentials) => Promise<void>; // Login function
  logout: () => void;                                     // Logout function
  isAuthenticated: boolean;                               // Is user logged in?
}
