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
 * GET /api/hod/top-performers/sgpa
 * 
 * Get top performers for specific semester based on SGPA
 * Query params: semester (required), batch (optional), section (optional), limit (default 10, can be 'all')
 */
router.get('/top-performers/sgpa', hodController.getTopPerformersBySGPA);

/**
 * GET /api/hod/batch-statistics
 * 
 * Get comprehensive batch-wise statistics
 * Returns: total students, sections, CGPA distribution, class counts
 */
router.get('/batch-statistics', hodController.getBatchStatistics);

/**
 * GET /api/hod/backlog-statistics
 * 
 * Get backlog statistics across batches
 * Returns: students with backlogs, total backlogs, averages
 */
router.get('/backlog-statistics', hodController.getBacklogStatistics);

/**
 * GET /api/hod/sgpa-distribution
 * 
 * Get SGPA distribution for visualization
 * Query params: semester (optional), batch (optional)
 */
router.get('/sgpa-distribution', hodController.getSGPADistribution);

/**
 * GET /api/hod/batch-performance
 * 
 * Get comprehensive batch performance comparison
 * Returns: averages, toppers, backlogs by batch
 */
router.get('/batch-performance', hodController.getBatchPerformance);

/**
 * GET /api/hod/detailed-results
 * 
 * Get detailed semester results with all subject information
 * Query params: batch (required), semester (required), section (optional)
 */
router.get('/detailed-results', hodController.getDetailedResults);

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
 * GET /api/hod/export/excel
 * 
 * Export data to Excel format
 * Query params: type (toppers/batch-stats/detailed-results), criteriaType, batch, semester, section, limit
 */
router.get('/export/excel', hodController.exportToExcel);

module.exports = router;
