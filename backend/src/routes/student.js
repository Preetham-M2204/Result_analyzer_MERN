/**
 * STUDENT ROUTES
 * ==============
 * All routes for student-specific features
 * 
 * Base URL: /api/student
 * All routes require authentication (verifyToken middleware)
 * All routes require STUDENT role (requireRole middleware)
 */

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const studentController = require('../controllers/studentController');

// Apply authentication and role check to all student routes
router.use(verifyToken);
router.use(requireRole('STUDENT'));

/**
 * GET /api/student/profile
 * 
 * Get student profile details
 * Returns: usn, name, gender, batch, section, cgpa, etc.
 */
router.get('/profile', studentController.getProfile);

/**
 * PUT /api/student/profile
 * 
 * Update student profile (section, etc.)
 * Body: { section: "A" }
 */
router.put('/profile', studentController.updateProfile);

/**
 * GET /api/student/summary
 * 
 * Get overall summary (CGPA, backlogs, semester-wise SGPA)
 * Returns: cgpa, backlogs count, semester-wise GPA array
 */
router.get('/summary', studentController.getSummary);

/**
 * GET /api/student/results/:semester
 * 
 * Get detailed results for a specific semester
 * Params: semester (e.g., 3, 4)
 * Returns: subject-wise marks, grades, SGPA
 */
router.get('/results/:semester', studentController.getSemesterResults);

/**
 * GET /api/student/batch-cgpa
 * 
 * Get CGPA distribution for student's batch (for graph)
 * Returns: batch year, cgpa distribution data
 */
router.get('/batch-cgpa', studentController.getBatchCGPA);

/**
 * GET /api/student/section-cgpa
 * 
 * Get CGPA distribution for student's section (for graph)
 * Returns: section, batch, cgpa distribution data
 */
router.get('/section-cgpa', studentController.getSectionCGPA);

/**
 * GET /api/student/rank/:semester
 * 
 * Get student's rank in their section for a semester
 * Params: semester (e.g., 3, 4)
 * Returns: rank, total students, section
 */
router.get('/rank/:semester', studentController.getClassRank);

module.exports = router;
