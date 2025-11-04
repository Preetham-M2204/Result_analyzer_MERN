/**
 * AUTHENTICATION ROUTES
 * ======================
 * Defines all authentication-related endpoints
 * 
 * Base URL: /api/auth
 * 
 * Available Routes:
 * - POST   /login              → Login with email and password
 * - POST   /change-password    → Change user password (protected)
 * - GET    /me                 → Get current user info (protected)
 * - POST   /logout             → Logout (client-side only, no server action needed)
 */

const express = require('express');
const router = express.Router();
const { login, changePassword, getCurrentUser } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// ============================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================

/**
 * POST /api/auth/login
 * 
 * Purpose: Authenticate user and return JWT token
 * 
 * Request Body:
 * {
 *   "email": "mypt1991@gmail.com",
 *   "password": "1BI23IS082"
 * }
 * 
 * Response (Success - 200):
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "user": {
 *     "id": "mongodbObjectId",
 *     "email": "mypt1991@gmail.com",
 *     "role": "STUDENT",
 *     "usn": "1BI23IS082",
 *     "name": "Student Name",
 *     "mustChangePassword": true
 *   }
 * }
 * 
 * Response (Error - 401):
 * {
 *   "success": false,
 *   "message": "Invalid email or password"
 * }
 * 
 * What frontend does after successful login:
 * 1. Store token in localStorage: localStorage.setItem('token', response.token)
 * 2. Store user in state/context
 * 3. Set Authorization header for future requests: axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
 * 4. Redirect to appropriate dashboard:
 *    - ADMIN → /admin/dashboard
 *    - HOD → /hod/dashboard
 *    - TEACHER → /teacher/dashboard
 *    - STUDENT → /student/dashboard
 * 5. If mustChangePassword === true, show password change modal first
 */
router.post('/login', login);

// ============================================================
// PROTECTED ROUTES (Requires valid JWT token)
// ============================================================

/**
 * GET /api/auth/me
 * 
 * Purpose: Get currently logged-in user's information
 * 
 * Headers Required:
 * Authorization: Bearer <token>
 * 
 * Response (Success - 200):
 * {
 *   "success": true,
 *   "user": {
 *     "id": "mongodbObjectId",
 *     "email": "mypt1991@gmail.com",
 *     "role": "STUDENT",
 *     "usn": "1BI23IS082",
 *     "name": "Student Name",
 *     "mustChangePassword": false,
 *     "assignedSubjects": []
 *   }
 * }
 * 
 * Used by frontend:
 * - On app startup to verify token is still valid
 * - After page refresh to restore user state
 * - To check if user data was updated by admin
 */
router.get('/me', verifyToken, getCurrentUser);

/**
 * POST /api/auth/change-password
 * 
 * Purpose: Change user's password
 * 
 * Headers Required:
 * Authorization: Bearer <token>
 * 
 * Request Body:
 * {
 *   "currentPassword": "1BI23IS082",
 *   "newPassword": "MyNewSecurePassword123"
 * }
 * 
 * Response (Success - 200):
 * {
 *   "success": true,
 *   "message": "Password changed successfully"
 * }
 * 
 * Response (Error - 401):
 * {
 *   "success": false,
 *   "message": "Current password is incorrect"
 * }
 * 
 * Security:
 * - Requires valid JWT token (user must be logged in)
 * - Requires current password verification
 * - New password must be at least 6 characters
 * - Sets mustChangePassword to false after successful change
 */
router.post('/change-password', verifyToken, changePassword);

/**
 * POST /api/auth/logout
 * 
 * Purpose: Logout user
 * 
 * NOTE: JWT is stateless, so logout is handled entirely on client-side
 * 
 * What frontend does on logout:
 * 1. Remove token from localStorage: localStorage.removeItem('token')
 * 2. Clear user from state/context
 * 3. Remove Authorization header: delete axios.defaults.headers.common['Authorization']
 * 4. Redirect to login page
 * 
 * No server-side action needed because:
 * - JWT tokens are self-contained
 * - Server doesn't maintain session state
 * - Token will expire after 24 hours anyway
 * 
 * Optional: Could blacklist token on server if needed for security
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully. Please clear token on client side.'
  });
});

// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
