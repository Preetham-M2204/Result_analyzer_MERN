/**
 * HOD ROUTES
 * ==========
 * All routes for Head of Department features
 * 
 * Base URL: /api/hod
 * All routes require authentication (verifyToken middleware)
 * All routes require HOD role (requireRole middleware)
 */

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const hodController = require('../controllers/hodController');

// Apply authentication and HOD role check to all routes
router.use((req, res, next) => {
  console.log('🎯 HOD ROUTE HIT:');
  console.log('   Path:', req.path);
  console.log('   Method:', req.method);
  console.log('   Full URL:', req.originalUrl);
  console.log('   Has Token:', !!req.headers.authorization);
  next();
});

router.use(verifyToken);
router.use(requireRole('HOD'));

/**
 * GET /api/hod/overview
 * 
 * Get dashboard overview statistics
 * Returns: batch-wise student counts, average CGPA, pass rates
 */
router.get('/overview', hodController.getOverview);

/**
 * GET /api/hod/top-performers/cgpa
 * 
 * Get top performers based on CGPA
 * Query params: batch (optional), limit (default 10)
 */
router.get('/top-performers/cgpa', hodController.getTopPerformersByCGPA);

/**
 * GET /api/hod/top-performers/total-marks
 * 
 * Get top performers based on cumulative total marks
 * Query params: batch (optional), limit (default 10)
 */
router.get('/top-performers/total-marks', hodController.getTopPerformersByTotalMarks);

/**
 * GET /api/hod/top-performers/semester-marks
 * 
 * Get top performers for specific semester based on marks
 * Query params: semester (required), batch (optional), limit (default 10)
 */
router.get('/top-performers/semester-marks', hodController.getTopPerformersBySemesterMarks);

/**
 * GET /api/hod/batch-statistics
 * 
 * Get comprehensive batch-wise statistics
 * Returns: total students, sections, CGPA distribution, class counts
 */
router.get('/batch-statistics', hodController.getBatchStatistics);

/**
 * GET /api/hod/subject-analytics
 * 
 * Get subject-wise performance analytics
 * Query params: batch (optional), semester (optional)
 */
router.get('/subject-analytics', hodController.getSubjectAnalytics);

/**
 * GET /api/hod/section-comparison
 * 
 * Get section-wise comparison data
 * Query params: batch (optional), semester (optional)
 */
router.get('/section-comparison', hodController.getSectionComparison);

/**
 * POST /api/hod/export/excel
 * 
 * Export top performers data to Excel file
 * Body: { criteriaType, batch, semester, limit }
 */
router.post('/export/excel', hodController.exportToExcel);

module.exports = router;
