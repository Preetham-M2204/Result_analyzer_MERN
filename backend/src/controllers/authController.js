/**
 * AUTHENTICATION CONTROLLER
 * ==========================
 * Handles all authentication-related operations:
 * 1. Login (email + password verification)
 * 2. Change password
 * 3. Get current user info
 * 4. Logout (client-side token removal)
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { mysqlPool } = require('../config/database');

// ============================================================
// LOGIN
// ============================================================

/**
 * login
 * 
 * Purpose: Authenticates user and returns JWT token
 * 
 * Process:
 * 1. Validate email and password inputs
 * 2. Find user in MongoDB by email
 * 3. Compare password with bcrypt hash
 * 4. Generate JWT token
 * 5. For students: Fetch name from MySQL student_details table
 * 6. Return token and user info
 * 
 * Request Body:
 * {
 *   "email": "mypt1991@gmail.com",
 *   "password": "1BI23IS082"
 * }
 * 
 * Response (Success):
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
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ------------------------------------------------------------
    // Step 1: Validate inputs
    // ------------------------------------------------------------
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // ------------------------------------------------------------
    // Step 2: Find user by email in MongoDB
    // ------------------------------------------------------------
    
    /**
     * Why not use password field in find query?
     * - Password is hashed, can't query by plain text
     * - Need to fetch user first, then compare hash
     */
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // ------------------------------------------------------------
    // Step 3: Verify password using bcrypt
    // ------------------------------------------------------------
    
    /**
     * bcrypt.compare() does:
     * 1. Extracts salt from stored hash
     * 2. Hashes input password with same salt
     * 3. Compares both hashes
     * 4. Returns true if match, false otherwise
     * 
     * This is secure because:
     * - Each user has unique salt (random)
     * - Same password → different hashes for different users
     * - Attacker can't use hash to login (need original password)
     */
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // ------------------------------------------------------------
    // Step 4: For students, fetch name from MySQL
    // ------------------------------------------------------------
    
    /**
     * Why fetch from MySQL?
     * - MongoDB user.name might be null (not set yet)
     * - MySQL student_details table has authoritative student data
     * - We sync name on every login to keep it updated
     */
    if (user.role === 'STUDENT' && user.usn) {
      try {
        const [rows] = await mysqlPool.query(
          'SELECT name FROM student_details WHERE usn = ?',
          [user.usn]
        );

        if (rows.length > 0 && rows[0].name) {
          // Update name in MongoDB if different
          if (user.name !== rows[0].name) {
            user.name = rows[0].name;
            await user.save();
          }
        }
      } catch (mysqlError) {
        console.error('Error fetching student name from MySQL:', mysqlError);
        // Continue login even if MySQL fetch fails
      }
    }

    // ------------------------------------------------------------
    // Step 5: Generate JWT token
    // ------------------------------------------------------------
    
    /**
     * JWT Payload (data stored in token):
     * - userId: MongoDB _id (used to fetch user in verifyToken middleware)
     * - email: For display and debugging
     * - role: For quick role checks without DB query
     * - usn/teacherId/hodId/adminId: Role-specific identifier
     * 
     * JWT Secret: From .env file (keep this secret!)
     * Expiry: 24 hours (86400 seconds)
     * 
     * Token structure: header.payload.signature
     * - Header: Algorithm (HS256) and type (JWT)
     * - Payload: User data (base64 encoded, NOT encrypted)
     * - Signature: HMAC hash using secret (prevents tampering)
     */
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    // Add role-specific identifier to token
    if (user.role === 'STUDENT') tokenPayload.usn = user.usn;
    if (user.role === 'TEACHER') tokenPayload.teacherId = user.teacherId;
    if (user.role === 'HOD') tokenPayload.hodId = user.hodId;
    if (user.role === 'ADMIN') tokenPayload.adminId = user.adminId;

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // ------------------------------------------------------------
    // Step 6: Return success response
    // ------------------------------------------------------------
    
    /**
     * What frontend will do with this:
     * 1. Store token in localStorage
     * 2. Store user info in state/context
     * 3. Redirect to appropriate dashboard based on role
     * 4. If mustChangePassword === true, show password change modal
     */
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        usn: user.usn,
        teacherId: user.teacherId,
        hodId: user.hodId,
        adminId: user.adminId,
        name: user.name,
        mustChangePassword: user.mustChangePassword,
        assignedSubjects: user.assignedSubjects
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: error.message
    });
  }
};

// ============================================================
// CHANGE PASSWORD
// ============================================================

/**
 * changePassword
 * 
 * Purpose: Allows user to update their password
 * 
 * Security:
 * - Requires current password verification (prevents unauthorized changes)
 * - New password is hashed before storing
 * - Sets mustChangePassword to false
 * 
 * Request Body:
 * {
 *   "currentPassword": "1BI23IS082",
 *   "newPassword": "MySecurePassword123"
 * }
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // ------------------------------------------------------------
    // Step 1: Validate inputs
    // ------------------------------------------------------------
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // ------------------------------------------------------------
    // Step 2: Get user from request (set by verifyToken middleware)
    // ------------------------------------------------------------
    
    /**
     * req.user is populated by verifyToken middleware
     * We need to fetch again to get password field (not included in req.user)
     */
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ------------------------------------------------------------
    // Step 3: Verify current password
    // ------------------------------------------------------------
    
    /**
     * Security: Must provide correct current password
     * Prevents: Someone with stolen JWT from changing password
     */
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // ------------------------------------------------------------
    // Step 4: Hash new password
    // ------------------------------------------------------------
    
    /**
     * bcrypt.hash() with salt rounds = 10
     * 
     * Salt rounds = computational cost
     * 10 rounds = 2^10 = 1024 iterations
     * Higher = more secure but slower (10 is good balance)
     * 
     * Each hash is unique even for same password (random salt)
     */
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // ------------------------------------------------------------
    // Step 5: Update password in database
    // ------------------------------------------------------------
    
    user.password = hashedNewPassword;
    user.mustChangePassword = false; // User has changed from default password
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// ============================================================
// GET CURRENT USER
// ============================================================

/**
 * getCurrentUser
 * 
 * Purpose: Returns current logged-in user's information
 * 
 * Used by frontend to:
 * - Verify token is still valid
 * - Get fresh user data on page refresh
 * - Check if user details were updated by admin
 * 
 * No request body needed (uses token from Authorization header)
 * 
 * Response:
 * {
 *   "success": true,
 *   "user": { ...user data... }
 * }
 */
const getCurrentUser = async (req, res) => {
  try {
    /**
     * req.user already populated by verifyToken middleware
     * Just need to return it
     */
    
    // For students, fetch fresh name from MySQL
    if (req.user.role === 'STUDENT' && req.user.usn) {
      try {
        const [rows] = await mysqlPool.query(
          'SELECT name FROM student_details WHERE usn = ?',
          [req.user.usn]
        );

        if (rows.length > 0 && rows[0].name) {
          req.user.name = rows[0].name;
        }
      } catch (mysqlError) {
        console.error('Error fetching student name:', mysqlError);
      }
    }

    res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        usn: req.user.usn,
        teacherId: req.user.teacherId,
        hodId: req.user.hodId,
        adminId: req.user.adminId,
        name: req.user.name,
        mustChangePassword: req.user.mustChangePassword,
        assignedSubjects: req.user.assignedSubjects
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information',
      error: error.message
    });
  }
};

// ============================================================
// EXPORT CONTROLLERS
// ============================================================

module.exports = {
  login,           // POST /api/auth/login
  changePassword,  // POST /api/auth/change-password (protected)
  getCurrentUser   // GET /api/auth/me (protected)
};
