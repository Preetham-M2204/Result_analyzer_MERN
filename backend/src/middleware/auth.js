/**
 * JWT AUTHENTICATION MIDDLEWARE
 * ===============================
 * This middleware protects routes by verifying JWT tokens
 * 
 * How JWT Works:
 * 1. User logs in → Server generates JWT token → Sends to frontend
 * 2. Frontend stores token in localStorage
 * 3. Frontend sends token in Authorization header for every API request
 * 4. This middleware verifies token before allowing access to protected routes
 * 
 * JWT Token Structure:
 * {
 *   userId: "mongodbObjectId",
 *   email: "user@gmail.com",
 *   role: "STUDENT",
 *   usn: "1BI23IS082",
 *   iat: 1699000000,  // Issued at timestamp
 *   exp: 1699086400   // Expiry timestamp (24 hours later)
 * }
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ============================================================
// VERIFY TOKEN MIDDLEWARE
// ============================================================

/**
 * verifyToken
 * 
 * Purpose: Checks if user is authenticated (has valid JWT token)
 * 
 * How it works:
 * 1. Extracts token from Authorization header
 * 2. Verifies token signature using JWT_SECRET
 * 3. Decodes token to get user info
 * 4. Fetches full user data from MongoDB
 * 5. Attaches user object to req.user for use in route handlers
 * 
 * Usage:
 * router.get('/protected-route', verifyToken, (req, res) => {
 *   // req.user contains authenticated user data
 * });
 */
const verifyToken = async (req, res, next) => {
  try {
    // ------------------------------------------------------------
    // Step 1: Extract token from Authorization header
    // ------------------------------------------------------------
    
    /**
     * Authorization header format: "Bearer <token>"
     * Example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     * 
     * We need to:
     * 1. Check if Authorization header exists
     * 2. Check if it starts with "Bearer "
     * 3. Extract the actual token (everything after "Bearer ")
     */
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Extract token (remove "Bearer " prefix)
    const token = authHeader.substring(7); // "Bearer " is 7 characters

    // ------------------------------------------------------------
    // Step 2: Verify token signature
    // ------------------------------------------------------------
    
    /**
     * jwt.verify() does 3 things:
     * 1. Checks if token was signed with our JWT_SECRET
     * 2. Checks if token has expired
     * 3. Decodes token payload
     * 
     * If any check fails, it throws an error
     */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // decoded now contains: { userId, email, role, usn/teacherId, iat, exp }

    // ------------------------------------------------------------
    // Step 3: Fetch user from database
    // ------------------------------------------------------------
    
    /**
     * Why fetch from DB when we have data in token?
     * 
     * Token is generated once at login, but user data might change:
     * - Password changed → old tokens should still work
     * - Role changed by admin → need fresh data
     * - Account disabled → should not allow access
     * 
     * So we always fetch latest user data from MongoDB
     */
    const user = await User.findById(decoded.userId).select('-password');
    // .select('-password') means: fetch all fields EXCEPT password
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.'
      });
    }

    // ------------------------------------------------------------
    // Step 4: Attach user to request object
    // ------------------------------------------------------------
    
    /**
     * req.user will be available in all subsequent middleware and route handlers
     * 
     * Contains:
     * {
     *   _id: ObjectId,
     *   email: "user@gmail.com",
     *   role: "STUDENT",
     *   usn: "1BI23IS082",
     *   name: "Student Name",
     *   mustChangePassword: false,
     *   createdAt: Date,
     *   updatedAt: Date
     * }
     */
    req.user = user;

    // ------------------------------------------------------------
    // Step 5: Proceed to next middleware/route handler
    // ------------------------------------------------------------
    
    next(); // User is authenticated, continue to route

  } catch (error) {
    // ------------------------------------------------------------
    // Error Handling
    // ------------------------------------------------------------
    
    /**
     * Common JWT errors:
     * - JsonWebTokenError: Invalid token signature
     * - TokenExpiredError: Token has expired (24 hours passed)
     * - NotBeforeError: Token used before 'nbf' claim
     */
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.'
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      message: 'Authentication failed.',
      error: error.message
    });
  }
};

// ============================================================
// ROLE-BASED ACCESS CONTROL MIDDLEWARE
// ============================================================

/**
 * requireRole
 * 
 * Purpose: Restricts route access to specific user roles
 * 
 * Usage:
 * router.get('/admin-only', verifyToken, requireRole('ADMIN'), (req, res) => {
 *   // Only ADMIN can access this route
 * });
 * 
 * router.get('/hod-and-admin', verifyToken, requireRole('ADMIN', 'HOD'), (req, res) => {
 *   // Both ADMIN and HOD can access
 * });
 * 
 * @param {...String} allowedRoles - List of roles allowed to access route
 * @returns {Function} Middleware function
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    /**
     * At this point, verifyToken has already run
     * So req.user is guaranteed to exist
     */
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    /**
     * Check if user's role is in the list of allowed roles
     * Example: allowedRoles = ['ADMIN', 'HOD']
     *          req.user.role = 'STUDENT'
     *          Result: Access denied
     */
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    // User has required role, proceed
    next();
  };
};

// ============================================================
// EXPORT MIDDLEWARE
// ============================================================

module.exports = {
  verifyToken,   // Use on all protected routes
  requireRole    // Use for role-specific routes
};
