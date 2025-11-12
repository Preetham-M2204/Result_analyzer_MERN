/**
 * VTU RESULTS ANALYZER - BACKEND SERVER
 * =====================================
 * 
 * This is the main entry point for the backend server.
 * It sets up Express, connects to databases, and registers routes.
 * 
 * Technology Stack:
 * - Express.js: Web framework
 * - MongoDB: User authentication and authorization
 * - MySQL: Student results data
 * - JWT: Stateless authentication tokens
 * 
 * Port: 3000
 * Frontend URL: http://localhost:5173 (Vite React app)
 */

// ============================================================
// IMPORT DEPENDENCIES
// ============================================================

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database connections
const { connectMongoDB, testMySQLConnection } = require('./src/config/database');

// Import routes
const authRoutes = require('./src/routes/auth');
const studentRoutes = require('./src/routes/student');
const adminRoutes = require('./src/routes/admin');
const scraperRoutes = require('./src/routes/scraper');
const teacherRoutes = require('./src/routes/teacher');
const hodRoutes = require('./src/routes/hod');

// ============================================================
// INITIALIZE EXPRESS APP
// ============================================================

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE CONFIGURATION
// ============================================================

/**
 * CORS (Cross-Origin Resource Sharing)
 * 
 * Why needed:
 * - Frontend runs on localhost:5173 (Vite dev server)
 * - Backend runs on localhost:3000
 * - Different ports = different origins
 * - Browser blocks requests by default
 * 
 * What it does:
 * - Allows frontend to make API requests to backend
 * - Allows sending Authorization headers
 * - Allows receiving cookies (if we use them later)
 */
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost',
    'http://localhost:80',
    'http://result_analyzer_frontend',
    'http://result_analyzer_frontend:80'
  ],
  credentials: true, // Allow cookies and Authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * JSON Body Parser
 * 
 * Why needed:
 * - Parses incoming JSON request bodies
 * - Makes data available in req.body
 * 
 * Example:
 * - Frontend sends: { "email": "admin@gmail.com", "password": "admin123" }
 * - Backend accesses: req.body.email, req.body.password
 */
app.use(express.json());

/**
 * URL-Encoded Parser
 * 
 * Why needed:
 * - Parses form data (if we use HTML forms later)
 * - Extended: true allows nested objects
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Request Logger (Development Only)
 * 
 * Logs all incoming requests with:
 * - Method (GET, POST, etc.)
 * - URL path
 * - Timestamp
 * - Request body (for POST/PUT/PATCH)
 * - Query parameters
 * 
 * Helpful for debugging
 */
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📨 [${timestamp}] ${req.method} ${req.url}`);
    console.log(`   Origin: ${req.get('origin') || 'N/A'}`);
    console.log(`   Content-Type: ${req.get('content-type') || 'N/A'}`);
    console.log(`   Authorization: ${req.get('authorization') ? 'Present ✅' : 'Not present ❌'}`);
    
    if (req.method !== 'GET' && Object.keys(req.body || {}).length > 0) {
      console.log('   Body:', JSON.stringify(req.body, null, 2));
    }
    
    if (Object.keys(req.query || {}).length > 0) {
      console.log('   Query:', req.query);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    next();
  });
}

// ============================================================
// REGISTER ROUTES
// ============================================================

/**
 * Authentication Routes
 * 
 * Base URL: /api/auth
 * 
 * Available endpoints:
 * - POST /api/auth/login              → Login with email/password
 * - GET  /api/auth/me                 → Get current user (protected)
 * - POST /api/auth/change-password    → Change password (protected)
 * - POST /api/auth/logout             → Logout (client-side)
 */
app.use('/api/auth', authRoutes);

/**
 * Student Routes
 * 
 * Base URL: /api/student
 * All routes protected - require STUDENT role
 * 
 * Available endpoints:
 * - GET  /api/student/profile         → Get student profile
 * - PUT  /api/student/profile         → Update profile (section)
 * - GET  /api/student/summary         → Get CGPA, backlogs, SGPA
 * - GET  /api/student/results/:sem    → Get semester results
 * - GET  /api/student/batch-cgpa      → Get batch CGPA distribution
 * - GET  /api/student/rank/:sem       → Get rank in section
 */
app.use('/api/student', studentRoutes);

/**
 * Admin Routes
 * Base URL: /api/admin
 * All routes protected - require ADMIN role
 */
app.use('/api/admin', adminRoutes);

/**
 * Scraper Routes
 * Base URL: /api/scraper
 * All routes protected - require ADMIN role
 */
app.use('/api/scraper', scraperRoutes);

/**
 * Teacher Routes
 * 
 * Base URL: /api/teachers
 * All routes protected - require ADMIN role
 * 
 * Available endpoints:
 * - GET  /api/teachers                    → Get all teachers
 * - GET  /api/teachers/subjects           → Get subjects by batch/semester
 * - GET  /api/teachers/sections           → Get sections for batch
 * - GET  /api/teachers/assignments        → Get all teacher assignments
 * - POST /api/teachers/assign             → Assign teacher to subjects
 * - DELETE /api/teachers/assignment       → Delete assignment
 * - POST /api/teachers/add-section        → Add new section
 */
app.use('/api/teachers', teacherRoutes);

/**
 * HOD Routes
 * 
 * Base URL: /api/hod
 * All routes protected - require HOD role
 * 
 * Available endpoints:
 * - GET  /api/hod/overview                    → Dashboard overview statistics
 * - GET  /api/hod/top-performers/cgpa         → Top performers by CGPA
 * - GET  /api/hod/top-performers/total-marks  → Top performers by total marks
 * - GET  /api/hod/top-performers/semester-marks → Semester-specific toppers
 * - GET  /api/hod/batch-statistics            → Batch-wise statistics
 * - GET  /api/hod/subject-analytics           → Subject performance analytics
 * - GET  /api/hod/section-comparison          → Section-wise comparison
 * - POST /api/hod/export/excel                → Export data to Excel
 */
app.use('/api/hod', hodRoutes);

/**
 * Health Check Endpoint
 * 
 * Purpose: Verify server is running
 * 
 * Frontend can call this to check:
 * - Is backend server running?
 * - Are databases connected?
 * 
 * Response Example:
 * {
 *   "status": "OK",
 *   "message": "VTU Results Analyzer API is running",
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'VTU Results Analyzer API is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * Root Endpoint
 * 
 * Shows API is running when visiting http://localhost:3000
 */
app.get('/', (req, res) => {
  res.json({
    message: 'VTU Results Analyzer API',
    version: '1.0.0',
    documentation: '/api/health for health check'
  });
});

// ============================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================

/**
 * 404 Not Found Handler
 * 
 * Catches all requests to undefined routes
 * 
 * Example:
 * - Request: GET /api/something/random
 * - Response: 404 with error message
 */
app.use((req, res, next) => {
  console.error(`\n❌ 404 NOT FOUND: ${req.method} ${req.url}`);
  console.error(`   Available routes start with: /api/auth, /api/student, /api/admin, /api/teachers, /api/scraper`);
  
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`
  });
});

/**
 * Global Error Handler
 * 
 * Catches all errors thrown in the application
 * 
 * Error types:
 * - Validation errors (400)
 * - Authentication errors (401)
 * - Authorization errors (403)
 * - Not found errors (404)
 * - Server errors (500)
 * 
 * In production: Hides error details for security
 * In development: Shows full error stack for debugging
 */
app.use((err, req, res, next) => {
  console.error('❌ ERROR:', err);

  // Default to 500 Internal Server Error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    // Only show error stack in development
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ============================================================
// DATABASE CONNECTION & SERVER STARTUP
// ============================================================

/**
 * Start Server Function
 * 
 * Steps:
 * 1. Connect to MongoDB (for user authentication)
 * 2. Test MySQL connection (for results data)
 * 3. Start Express server on port 3000
 * 
 * If any step fails:
 * - Log error
 * - Exit process (prevents starting with broken connections)
 */
const startServer = async () => {
  try {
    const timestamp = new Date().toLocaleTimeString();
    console.log('\n🔄 ═══════════════════════════════════════════════════');
    console.log(`🔄 SERVER (RE)START at ${timestamp}`);
    console.log('🔄 ═══════════════════════════════════════════════════\n');
    console.log('🚀 Starting VTU Results Analyzer Backend...\n');

    // Step 1: Connect to MongoDB
    console.log('📦 Step 1: Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ MongoDB connected successfully\n');

    // Step 2: Test MySQL connection
    console.log('📦 Step 2: Testing MySQL connection...');
    await testMySQLConnection();
    console.log('✅ MySQL connection successful\n');

    // Step 3: Start Express server
    console.log('📦 Step 3: Starting Express server...');
    app.listen(PORT, () => {
      console.log('✅ Server started successfully\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🌐 Backend Server: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Login Endpoint: http://localhost:${PORT}/api/auth/login`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n📋 Available Credentials (from seedUsers.js):');
      console.log('   Admin:   admin@gmail.com / admin123');
      console.log('   HOD:     examplemail@gmail.com / T001');
      console.log('   Teacher: abc@gmail.com / T010');
      console.log('   Student: mypt1991@gmail.com / 1BI23IS082');
      console.log('\n⚠️  All users must change password on first login\n');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Full error:', error);
    process.exit(1); // Exit with error code
  }
};

/**
 * Handle Graceful Shutdown
 * 
 * When server is stopped (Ctrl+C):
 * 1. Log shutdown message
 * 2. Close database connections
 * 3. Exit process
 * 
 * This ensures:
 * - No hanging connections
 * - Clean shutdown
 */
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down server...');
  process.exit(0);
});

// ============================================================
// START THE SERVER
// ============================================================

startServer();
