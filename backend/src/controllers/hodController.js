/**
 * HOD CONTROLLER
 * ==============
 * Handles all HOD dashboard operations
 * - Overview statistics
 * - Top performers (CGPA, Total Marks, Semester Marks)
 * - Batch statistics
 * - Subject analytics
 * - Section comparison
 * - Excel export
 */

const { mysqlPool } = require('../config/database');

// Active batches (2025 excluded as per requirements)
const ACTIVE_BATCHES = [2022, 2023, 2024];

// ============================================================
// HELPER FUNCTION: Execute MySQL Query
// ============================================================

/**
 * Execute a MySQL query with error handling
 */
async function executeQuery(sql, params = []) {
  try {
    const [rows] = await mysqlPool.query(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// ============================================================
// GET OVERVIEW STATISTICS
// ============================================================

/**
 * GET /api/hod/overview
 * 
 * Returns dashboard overview with batch-specific stats
 */
const getOverview = async (req, res) => {
  try {
    console.log('\nHOD Controller -> getOverview');
    
    // Get total students per batch
    const studentStats = await executeQuery(`
      SELECT 
        batch,
        COUNT(*) as total_students,
        COUNT(DISTINCT section) as total_sections,
        AVG(cgpa) as average_cgpa,
        MAX(cgpa) as highest_cgpa
      FROM student_details
      WHERE batch IN (?, ?, ?)
      GROUP BY batch
      ORDER BY batch DESC
    `, ACTIVE_BATCHES);

    // Get overall statistics
    const overallStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_students,
        AVG(cgpa) as average_cgpa,
        COUNT(DISTINCT section) as total_sections
      FROM student_details
      WHERE batch IN (?, ?, ?)
    `, ACTIVE_BATCHES);

    // Get pass percentage
    const passStats = await executeQuery(`
      SELECT 
        s.batch,
        COUNT(DISTINCT ss.student_usn) as total,
        SUM(CASE WHEN ss.backlog_count = 0 THEN 1 ELSE 0 END) as passed
      FROM student_semester_summary ss
      JOIN student_details s ON ss.student_usn = s.usn
      WHERE s.batch IN (?, ?, ?)
      GROUP BY s.batch
    `, ACTIVE_BATCHES);

    console.log('Overview data fetched successfully');

    res.json({
      success: true,
      data: {
        studentStats,
        overallStats: overallStats[0] || {},
        passStats,
        activeBatches: ACTIVE_BATCHES
      }
    });
  } catch (error) {
    console.error('Error in getOverview:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch overview data',
      error: error.message 
    });
  }
};

// ============================================================
// GET TOP PERFORMERS BY CGPA
// ============================================================

/**
 * GET /api/hod/top-performers/cgpa
 * 
 * Returns top performers based on CGPA
 * Query params: batch (optional), limit (default 10)
 */
const getTopPerformersByCGPA = async (req, res) => {
  try {
    const { batch, limit = 10 } = req.query;
    
    console.log('\nHOD Controller -> getTopPerformersByCGPA');
    console.log('Params:', { batch, limit });
    
    let whereClause = 'WHERE s.batch IN (?, ?, ?)';
    let params = [...ACTIVE_BATCHES];
    
    // If specific batch is requested
    if (batch && ACTIVE_BATCHES.includes(parseInt(batch))) {
      whereClause = 'WHERE s.batch = ?';
      params = [parseInt(batch)];
    }
    
    const toppers = await executeQuery(`
      SELECT 
        s.usn,
        s.name,
        s.batch,
        s.section,
        s.cgpa,
        s.discipline,
        COUNT(DISTINCT ss.semester) as semesters_completed,
        COALESCE(SUM(ss.backlog_count), 0) as total_backlogs
      FROM student_details s
      LEFT JOIN student_semester_summary ss ON s.usn = ss.student_usn
      ${whereClause}
      GROUP BY s.usn, s.name, s.batch, s.section, s.cgpa, s.discipline
      HAVING s.cgpa IS NOT NULL
      ORDER BY s.cgpa DESC, s.name ASC
      LIMIT ?
    `, [...params, parseInt(limit)]);

    console.log(`Found ${toppers.length} CGPA toppers`);

    res.json({
      success: true,
      data: {
        toppers,
        criteriaType: 'CGPA',
        batch: batch || 'ALL',
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error in getTopPerformersByCGPA:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch CGPA toppers',
      error: error.message 
    });
  }
};

// ============================================================
// GET TOP PERFORMERS BY TOTAL MARKS
// ============================================================

/**
 * GET /api/hod/top-performers/total-marks
 * 
 * Returns top performers based on cumulative total marks
 * Query params: batch (optional), limit (default 10)
 */
const getTopPerformersByTotalMarks = async (req, res) => {
  try {
    const { batch, limit = 10 } = req.query;
    
    console.log('\nHOD Controller -> getTopPerformersByTotalMarks');
    console.log('Params:', { batch, limit });
    
    let batchFilter = '';
    let params = [...ACTIVE_BATCHES];
    
    if (batch && ACTIVE_BATCHES.includes(parseInt(batch))) {
      batchFilter = 'AND s.batch = ?';
      params = [...ACTIVE_BATCHES, parseInt(batch)];
    }
    
    const toppers = await executeQuery(`
      SELECT 
        s.usn,
        s.name,
        s.batch,
        s.section,
        s.cgpa,
        SUM(ss.total_marks_obtained) as cumulative_marks,
        SUM(ss.total_marks_maximum) as cumulative_maximum,
        ROUND((SUM(ss.total_marks_obtained) / SUM(ss.total_marks_maximum)) * 100, 2) as overall_percentage,
        COUNT(DISTINCT ss.semester) as semesters_completed
      FROM student_details s
      JOIN student_semester_summary ss ON s.usn = ss.student_usn
      WHERE s.batch IN (?, ?, ?)
      ${batchFilter}
      GROUP BY s.usn, s.name, s.batch, s.section, s.cgpa
      ORDER BY cumulative_marks DESC, s.cgpa DESC
      LIMIT ?
    `, [...params, parseInt(limit)]);

    console.log(`Found ${toppers.length} total marks toppers`);

    res.json({
      success: true,
      data: {
        toppers,
        criteriaType: 'TOTAL_MARKS',
        batch: batch || 'ALL',
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error in getTopPerformersByTotalMarks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch total marks toppers',
      error: error.message 
    });
  }
};

// ============================================================
// GET TOP PERFORMERS BY SEMESTER MARKS
// ============================================================

/**
 * GET /api/hod/top-performers/semester-marks
 * 
 * Returns top performers for specific semester based on marks
 * Query params: semester (required), batch (optional), limit (default 10)
 */
const getTopPerformersBySemesterMarks = async (req, res) => {
  try {
    const { semester, batch, limit = 10 } = req.query;
    
    console.log('\nHOD Controller -> getTopPerformersBySemesterMarks');
    console.log('Params:', { semester, batch, limit });
    
    if (!semester) {
      return res.status(400).json({ 
        success: false, 
        message: 'Semester parameter is required' 
      });
    }
    
    let batchFilter = 'AND s.batch IN (?, ?, ?)';
    let params = [parseInt(semester), ...ACTIVE_BATCHES];
    
    if (batch && ACTIVE_BATCHES.includes(parseInt(batch))) {
      batchFilter = 'AND s.batch = ?';
      params = [parseInt(semester), parseInt(batch)];
    }
    
    params.push(parseInt(limit));
    
    const toppers = await executeQuery(`
      SELECT 
        s.usn,
        s.name,
        s.batch,
        s.section,
        ss.semester,
        ss.sgpa,
        ss.total_marks_obtained,
        ss.total_marks_maximum,
        ss.percentage,
        ss.class_grade,
        ss.backlog_count
      FROM student_details s
      JOIN student_semester_summary ss ON s.usn = ss.student_usn
      WHERE ss.semester = ?
      ${batchFilter}
      ORDER BY ss.total_marks_obtained DESC, ss.sgpa DESC
      LIMIT ?
    `, params);

    console.log(`Found ${toppers.length} semester ${semester} toppers`);

    res.json({
      success: true,
      data: {
        toppers,
        criteriaType: 'SEMESTER_MARKS',
        semester: parseInt(semester),
        batch: batch || 'ALL',
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error in getTopPerformersBySemesterMarks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch semester toppers',
      error: error.message 
    });
  }
};

// ============================================================
// GET BATCH STATISTICS
// ============================================================

/**
 * GET /api/hod/batch-statistics
 * 
 * Returns comprehensive batch-wise statistics
 */
const getBatchStatistics = async (req, res) => {
  try {
    console.log('\nHOD Controller -> getBatchStatistics');
    
    const batchStats = await executeQuery(`
      SELECT 
        s.batch,
        COUNT(DISTINCT s.usn) as total_students,
        COUNT(DISTINCT s.section) as total_sections,
        AVG(s.cgpa) as average_cgpa,
        MAX(s.cgpa) as highest_cgpa,
        MIN(s.cgpa) as lowest_cgpa,
        SUM(CASE WHEN s.cgpa >= 9.0 THEN 1 ELSE 0 END) as distinction_count,
        SUM(CASE WHEN s.cgpa >= 8.0 AND s.cgpa < 9.0 THEN 1 ELSE 0 END) as first_class_count,
        SUM(CASE WHEN s.cgpa >= 7.0 AND s.cgpa < 8.0 THEN 1 ELSE 0 END) as second_class_count
      FROM student_details s
      WHERE s.batch IN (?, ?, ?)
      GROUP BY s.batch
      ORDER BY s.batch DESC
    `, ACTIVE_BATCHES);

    console.log(`Fetched statistics for ${batchStats.length} batches`);

    res.json({
      success: true,
      data: {
        batchStats,
        activeBatches: ACTIVE_BATCHES
      }
    });
  } catch (error) {
    console.error('Error in getBatchStatistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch batch statistics',
      error: error.message 
    });
  }
};

// ============================================================
// GET SUBJECT ANALYTICS
// ============================================================

/**
 * GET /api/hod/subject-analytics
 * 
 * Returns subject-wise performance analytics
 */
const getSubjectAnalytics = async (req, res) => {
  try {
    const { batch, semester } = req.query;
    
    console.log('\nHOD Controller -> getSubjectAnalytics');
    console.log('Params:', { batch, semester });
    
    let whereConditions = ['s.batch IN (?, ?, ?)'];
    let params = [...ACTIVE_BATCHES];
    
    if (batch && ACTIVE_BATCHES.includes(parseInt(batch))) {
      whereConditions = ['s.batch = ?'];
      params = [parseInt(batch)];
    }
    
    if (semester) {
      whereConditions.push('r.semester = ?');
      params.push(parseInt(semester));
    }
    
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    
    const analytics = await executeQuery(`
      SELECT 
        sub.subject_code,
        sub.subject_name,
        r.semester,
        COUNT(DISTINCT r.student_usn) as total_students,
        AVG(r.total_marks) as average_marks,
        MAX(r.total_marks) as highest_marks,
        MIN(r.total_marks) as lowest_marks,
        SUM(CASE WHEN r.result_status = 'PASS' THEN 1 ELSE 0 END) as passed_count,
        SUM(CASE WHEN r.result_status = 'FAIL' THEN 1 ELSE 0 END) as failed_count
      FROM results r
      JOIN subjects sub ON r.subject_code = sub.subject_code
      JOIN student_details s ON r.student_usn = s.usn
      ${whereClause}
      GROUP BY sub.subject_code, sub.subject_name, r.semester
      ORDER BY r.semester, sub.subject_name
    `, params);

    console.log(`Found analytics for ${analytics.length} subjects`);

    res.json({
      success: true,
      data: {
        analytics,
        batch: batch || 'ALL',
        semester: semester || 'ALL'
      }
    });
  } catch (error) {
    console.error('Error in getSubjectAnalytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch subject analytics',
      error: error.message 
    });
  }
};

// ============================================================
// GET SECTION COMPARISON
// ============================================================

/**
 * GET /api/hod/section-comparison
 * 
 * Returns section-wise comparison data
 */
const getSectionComparison = async (req, res) => {
  try {
    const { batch, semester } = req.query;
    
    console.log('\nHOD Controller -> getSectionComparison');
    console.log('Params:', { batch, semester });
    
    let whereConditions = ['s.batch IN (?, ?, ?)'];
    let params = [...ACTIVE_BATCHES];
    
    if (batch && ACTIVE_BATCHES.includes(parseInt(batch))) {
      whereConditions = ['s.batch = ?'];
      params = [parseInt(batch)];
    }
    
    if (semester) {
      whereConditions.push('ss.semester = ?');
      params.push(parseInt(semester));
    }
    
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    
    const comparison = await executeQuery(`
      SELECT 
        s.section,
        s.batch,
        COUNT(DISTINCT s.usn) as total_students,
        AVG(s.cgpa) as average_cgpa,
        ${semester ? 'AVG(ss.sgpa) as average_sgpa,' : ''}
        ${semester ? 'AVG(ss.percentage) as average_percentage,' : ''}
        MAX(s.cgpa) as highest_cgpa,
        MIN(s.cgpa) as lowest_cgpa
      FROM student_details s
      ${semester ? 'LEFT JOIN student_semester_summary ss ON s.usn = ss.student_usn' : ''}
      ${whereClause}
      GROUP BY s.section, s.batch
      ORDER BY s.batch DESC, s.section
    `, params);

    console.log(`Found comparison for ${comparison.length} sections`);

    res.json({
      success: true,
      data: {
        comparison,
        batch: batch || 'ALL',
        semester: semester || 'ALL'
      }
    });
  } catch (error) {
    console.error('Error in getSectionComparison:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch section comparison',
      error: error.message 
    });
  }
};

// ============================================================
// EXPORT TO EXCEL
// ============================================================

/**
 * POST /api/hod/export/excel
 * 
 * Exports top performers data to Excel file
 */
const exportToExcel = async (req, res) => {
  try {
    const { criteriaType, batch, semester, limit = 10 } = req.body;
    
    console.log('\nHOD Controller -> exportToExcel');
    console.log('Params:', { criteriaType, batch, semester, limit });
    
    // This is a placeholder - actual Excel generation requires exceljs package
    // For now, return JSON data that can be converted to Excel on frontend
    
    let data = [];
    
    if (criteriaType === 'CGPA') {
      const result = await getTopPerformersByCGPA({ query: { batch, limit } }, { json: () => {} });
      data = result;
    } else if (criteriaType === 'TOTAL_MARKS') {
      const result = await getTopPerformersByTotalMarks({ query: { batch, limit } }, { json: () => {} });
      data = result;
    } else if (criteriaType === 'SEMESTER_MARKS' && semester) {
      const result = await getTopPerformersBySemesterMarks({ query: { semester, batch, limit } }, { json: () => {} });
      data = result;
    }
    
    res.json({
      success: true,
      message: 'Excel export data prepared',
      data: data
    });
  } catch (error) {
    console.error('Error in exportToExcel:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to export data',
      error: error.message 
    });
  }
};

// ============================================================
// EXPORT CONTROLLER FUNCTIONS
// ============================================================

module.exports = {
  getOverview,
  getTopPerformersByCGPA,
  getTopPerformersByTotalMarks,
  getTopPerformersBySemesterMarks,
  getBatchStatistics,
  getSubjectAnalytics,
  getSectionComparison,
  exportToExcel
};
