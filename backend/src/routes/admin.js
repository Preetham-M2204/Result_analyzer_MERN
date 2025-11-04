/**
 * ADMIN ROUTES
 * ============
 * All routes for admin-specific features
 * 
 * Base URL: /api/admin
 * All routes require authentication (verifyToken middleware)
 * All routes require ADMIN role (requireRole middleware)
 */

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// Apply authentication and role check to all admin routes
router.use(verifyToken);
router.use(requireRole('ADMIN'));

/**
 * GET /api/admin/stats
 * 
 * Get system-wide statistics
 * Returns: user counts, database stats, performance metrics
 */
router.get('/stats', adminController.getSystemStats);

/**
 * GET /api/admin/users
 * 
 * Get all users with pagination
 * Query params: role (optional), page (default: 1), limit (default: 50)
 * Returns: users array, pagination info
 */
router.get('/users', adminController.getAllUsers);

/**
 * POST /api/admin/users
 * 
 * Create a new user
 * Body: { name, email, password, role, usn (if student) }
 */
router.post('/users', adminController.createUser);

/**
 * PUT /api/admin/users/:userId
 * 
 * Update user details
 * Params: userId (MongoDB ObjectId)
 * Body: { name, email, role, mustChangePassword }
 */
router.put('/users/:userId', adminController.updateUser);

/**
 * DELETE /api/admin/users/:userId
 * 
 * Delete a user
 * Params: userId (MongoDB ObjectId)
 */
router.delete('/users/:userId', adminController.deleteUser);

/**
 * POST /api/admin/users/:userId/reset-password
 * 
 * Reset user password (admin feature)
 * Params: userId (MongoDB ObjectId)
 * Body: { newPassword }
 */
router.post('/users/:userId/reset-password', adminController.resetUserPassword);

/**
 * GET /api/admin/students
 * 
 * Get all students from MySQL (for batch scraping)
 * Query params: batch (optional), section (optional)
 * Returns: students array with USN, name, batch, section
 */
router.get('/students', adminController.getAllStudents);

/**
 * POST /api/admin/students/add
 * 
 * Add a single student to the database
 * Body: { usn, name, batch, section, scheme, dob }
 */
router.post('/students/add', adminController.addStudent);

/**
 * POST /api/admin/students/bulk
 * 
 * Bulk import students from Excel
 * Body: { students: [{ usn, name, batch, section, scheme, dob }, ...] }
 */
router.post('/students/bulk', adminController.bulkImportStudents);

/**
 * GET /api/admin/subjects
 * 
 * Get all subjects from MySQL
 * Returns: subjects array
 */
router.get('/subjects', adminController.getAllSubjects);

/**
 * POST /api/admin/subjects/add
 * 
 * Add a single subject to the database
 * Body: { subjectCode, subjectName, semester, credits, scheme, isPlaceholder }
 */
router.post('/subjects/add', adminController.addSubject);

/**
 * POST /api/admin/subjects/bulk
 * 
 * Bulk import subjects from Excel
 * Body: { subjects: [{ subjectCode, subjectName, semester, credits, scheme, isPlaceholder }, ...] }
 */
router.post('/subjects/bulk', adminController.bulkImportSubjects);

module.exports = router;
