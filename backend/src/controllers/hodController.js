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
    if (toppers.length > 0) {
      console.log('Sample topper data:', toppers[0]);
    }

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
// GET TOP PERFORMERS BY SGPA (SEMESTER-WISE)
// ============================================================

/**
 * GET /api/hod/top-performers/sgpa
 * 
 * Returns top performers based on SGPA for a specific semester
 * Query params: semester (required), batch (optional), section (optional), limit (default 10)
 */
const getTopPerformersBySGPA = async (req, res) => {
  try {
    const { semester, batch, section, limit = 10 } = req.query;
    
    console.log('\nHOD Controller -> getTopPerformersBySGPA');
    console.log('Params:', { semester, batch, section, limit });
    
    if (!semester) {
      return res.status(400).json({ 
        success: false, 
        message: 'Semester parameter is required' 
      });
    }
    
    let whereConditions = ['ss.semester = ?'];
    let params = [parseInt(semester)];
    
    if (batch && ACTIVE_BATCHES.includes(parseInt(batch))) {
      whereConditions.push('s.batch = ?');
      params.push(parseInt(batch));
    } else {
      whereConditions.push('s.batch IN (?, ?, ?)');
      params.push(...ACTIVE_BATCHES);
    }
    
    if (section) {
      whereConditions.push('s.section = ?');
      params.push(section);
    }
    
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    
    // Handle "all" as unlimited
    const limitClause = limit === 'all' ? '' : `LIMIT ${parseInt(limit)}`;
    
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
      FROM student_semester_summary ss
      JOIN student_details s ON ss.student_usn = s.usn
      ${whereClause}
      ORDER BY ss.sgpa DESC, ss.percentage DESC, s.name ASC
      ${limitClause}
    `, params);

    console.log(`Found ${toppers.length} SGPA toppers for semester ${semester}`);

    res.json({
      success: true,
      data: {
        toppers,
        criteriaType: 'SGPA',
        semester: parseInt(semester),
        batch: batch || 'ALL',
        section: section || 'ALL',
        limit: limit === 'all' ? 'ALL' : parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error in getTopPerformersBySGPA:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch SGPA toppers',
      error: error.message 
    });
  }
};

// ============================================================
// GET BACKLOG STATISTICS
// ============================================================

/**
 * GET /api/hod/backlog-statistics
 * 
 * Returns backlog statistics across batches
 */
const getBacklogStatistics = async (req, res) => {
  try {
    console.log('\nHOD Controller -> getBacklogStatistics');
    
    const backlogStats = await executeQuery(`
      SELECT 
        s.batch,
        COUNT(DISTINCT s.usn) as total_students,
        COUNT(DISTINCT CASE WHEN ss.has_backlogs = TRUE THEN s.usn END) as students_with_backlogs,
        SUM(ss.backlog_count) as total_backlogs,
        AVG(CASE WHEN ss.has_backlogs = TRUE THEN ss.backlog_count END) as avg_backlogs_per_student,
        MAX(ss.backlog_count) as max_backlogs
      FROM student_details s
      LEFT JOIN student_semester_summary ss ON s.usn = ss.student_usn
      WHERE s.batch IN (?, ?, ?)
      GROUP BY s.batch
      ORDER BY s.batch DESC
    `, ACTIVE_BATCHES);

    console.log(`Fetched backlog statistics for ${backlogStats.length} batches`);

    res.json({
      success: true,
      data: {
        backlogStats,
        activeBatches: ACTIVE_BATCHES
      }
    });
  } catch (error) {
    console.error('Error in getBacklogStatistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch backlog statistics',
      error: error.message 
    });
  }
};

// ============================================================
// GET SGPA DISTRIBUTION
// ============================================================

/**
 * GET /api/hod/sgpa-distribution
 * 
 * Returns SGPA distribution data for visualization
 * Query params: semester (optional), batch (optional)
 */
const getSGPADistribution = async (req, res) => {
  try {
    const { semester, batch } = req.query;
    
    console.log('\nHOD Controller -> getSGPADistribution');
    console.log('Params:', { semester, batch });
    
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
    
    // Get distribution by SGPA ranges
    const distribution = await executeQuery(`
      SELECT 
        CASE 
          WHEN ss.sgpa >= 9.5 THEN '9.5-10.0'
          WHEN ss.sgpa >= 9.0 THEN '9.0-9.5'
          WHEN ss.sgpa >= 8.5 THEN '8.5-9.0'
          WHEN ss.sgpa >= 8.0 THEN '8.0-8.5'
          WHEN ss.sgpa >= 7.5 THEN '7.5-8.0'
          WHEN ss.sgpa >= 7.0 THEN '7.0-7.5'
          WHEN ss.sgpa >= 6.5 THEN '6.5-7.0'
          WHEN ss.sgpa >= 6.0 THEN '6.0-6.5'
          ELSE 'Below 6.0'
        END as sgpa_range,
        COUNT(*) as student_count,
        s.batch
      FROM student_semester_summary ss
      JOIN student_details s ON ss.student_usn = s.usn
      ${whereClause}
      GROUP BY sgpa_range, s.batch
      ORDER BY s.batch DESC, 
        CASE sgpa_range
          WHEN '9.5-10.0' THEN 1
          WHEN '9.0-9.5' THEN 2
          WHEN '8.5-9.0' THEN 3
          WHEN '8.0-8.5' THEN 4
          WHEN '7.5-8.0' THEN 5
          WHEN '7.0-7.5' THEN 6
          WHEN '6.5-7.0' THEN 7
          WHEN '6.0-6.5' THEN 8
          ELSE 9
        END
    `, params);

    console.log(`Fetched SGPA distribution with ${distribution.length} ranges`);

    res.json({
      success: true,
      data: {
        distribution,
        semester: semester || 'ALL',
        batch: batch || 'ALL'
      }
    });
  } catch (error) {
    console.error('Error in getSGPADistribution:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch SGPA distribution',
      error: error.message 
    });
  }
};

// ============================================================
// GET BATCH PERFORMANCE COMPARISON
// ============================================================

/**
 * GET /api/hod/batch-performance
 * 
 * Returns comprehensive batch comparison data for visualization
 */
const getBatchPerformance = async (req, res) => {
  try {
    console.log('\nHOD Controller -> getBatchPerformance');
    
    const performance = await executeQuery(`
      SELECT 
        s.batch,
        COUNT(DISTINCT s.usn) as total_students,
        AVG(s.cgpa) as average_cgpa,
        AVG(ss.sgpa) as average_sgpa,
        MAX(s.cgpa) as highest_cgpa,
        MIN(s.cgpa) as lowest_cgpa,
        SUM(CASE WHEN s.cgpa >= 9.0 THEN 1 ELSE 0 END) as distinction_count,
        SUM(CASE WHEN ss.has_backlogs = TRUE THEN 1 ELSE 0 END) as students_with_backlogs,
        SUM(ss.backlog_count) as total_backlogs
      FROM student_details s
      LEFT JOIN student_semester_summary ss ON s.usn = ss.student_usn
      WHERE s.batch IN (?, ?, ?)
      GROUP BY s.batch
      ORDER BY s.batch DESC
    `, ACTIVE_BATCHES);

    console.log(`Fetched performance for ${performance.length} batches`);

    res.json({
      success: true,
      data: {
        performance,
        activeBatches: ACTIVE_BATCHES
      }
    });
  } catch (error) {
    console.error('Error in getBatchPerformance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch batch performance',
      error: error.message 
    });
  }
};

// ============================================================
// GET DETAILED SEMESTER RESULTS
// ============================================================

/**
 * GET /api/hod/detailed-results
 * 
 * Returns complete results for a batch and semester with all subject details
 * Query params: batch (required), semester (required), section (optional)
 */
const getDetailedResults = async (req, res) => {
  try {
    const { batch, semester, section } = req.query;
    
    console.log('\nHOD Controller -> getDetailedResults');
    console.log('Params:', { batch, semester, section });
    
    if (!batch || !semester) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both batch and semester parameters are required' 
      });
    }
    
    let whereConditions = ['s.batch = ?', 'r.semester = ?'];
    let params = [parseInt(batch), parseInt(semester)];
    
    if (section) {
      whereConditions.push('s.section = ?');
      params.push(section);
    }
    
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    
    // Get student-wise results with all subject details (LATEST ATTEMPT ONLY)
    const results = await executeQuery(`
      SELECT 
        s.usn,
        s.name,
        s.section,
        sub.subject_code,
        sub.subject_name,
        r.internal_marks,
        r.external_marks,
        r.total_marks,
        r.letter_grade,
        r.grade_points,
        r.result_status,
        r.attempt_number,
        ss.sgpa,
        ss.percentage,
        ss.class_grade,
        ss.backlog_count
      FROM results r
      JOIN student_details s ON r.student_usn = s.usn
      JOIN subjects sub ON r.subject_code = sub.subject_code
      LEFT JOIN student_semester_summary ss ON s.usn = ss.student_usn AND ss.semester = r.semester
      INNER JOIN (
        SELECT student_usn, subject_code, semester, MAX(attempt_number) as max_attempt
        FROM results
        GROUP BY student_usn, subject_code, semester
      ) latest ON r.student_usn = latest.student_usn 
                 AND r.subject_code = latest.subject_code 
                 AND r.semester = latest.semester
                 AND r.attempt_number = latest.max_attempt
      ${whereClause}
      ORDER BY s.section, s.usn, sub.subject_code
    `, params);
    
    // Get subject-wise pass percentage (LATEST ATTEMPT ONLY)
    const subjectStats = await executeQuery(`
      SELECT 
        sub.subject_code,
        sub.subject_name,
        COUNT(*) as total_students,
        SUM(CASE WHEN r.result_status != 'FAIL' THEN 1 ELSE 0 END) as passed_count,
        ROUND((SUM(CASE WHEN r.result_status != 'FAIL' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as pass_percentage,
        AVG(r.total_marks) as average_marks,
        MAX(r.total_marks) as highest_marks,
        MIN(r.total_marks) as lowest_marks
      FROM results r
      JOIN student_details s ON r.student_usn = s.usn
      JOIN subjects sub ON r.subject_code = sub.subject_code
      INNER JOIN (
        SELECT student_usn, subject_code, semester, MAX(attempt_number) as max_attempt
        FROM results
        GROUP BY student_usn, subject_code, semester
      ) latest ON r.student_usn = latest.student_usn 
                 AND r.subject_code = latest.subject_code 
                 AND r.semester = latest.semester
                 AND r.attempt_number = latest.max_attempt
      ${whereClause}
      GROUP BY sub.subject_code, sub.subject_name
      ORDER BY sub.subject_code
    `, params);
    
    // Get overall semester statistics - Calculate pass/fail from actual results
    const overallStats = await executeQuery(`
      SELECT 
        COUNT(DISTINCT s.usn) as total_students,
        AVG(ss.sgpa) as average_sgpa,
        MAX(ss.sgpa) as highest_sgpa,
        MIN(ss.sgpa) as lowest_sgpa,
        COUNT(DISTINCT CASE 
          WHEN NOT EXISTS (
            SELECT 1 FROM results r2 
            WHERE r2.student_usn = s.usn 
            AND r2.semester = ? 
            AND r2.result_status = 'FAIL'
          ) THEN s.usn 
        END) as students_passed,
        COUNT(DISTINCT CASE 
          WHEN EXISTS (
            SELECT 1 FROM results r2 
            WHERE r2.student_usn = s.usn 
            AND r2.semester = ? 
            AND r2.result_status = 'FAIL'
          ) THEN s.usn 
        END) as students_with_backlogs
      FROM student_details s
      LEFT JOIN student_semester_summary ss ON s.usn = ss.student_usn AND ss.semester = ?
      WHERE s.batch = ?
      ${section ? 'AND s.section = ?' : ''}
      AND EXISTS (SELECT 1 FROM results r WHERE r.student_usn = s.usn AND r.semester = ?)
    `, section ? 
      [parseInt(semester), parseInt(semester), parseInt(semester), parseInt(batch), section, parseInt(semester)] : 
      [parseInt(semester), parseInt(semester), parseInt(semester), parseInt(batch), parseInt(semester)]);

    console.log(`Fetched detailed results: ${results.length} records, ${subjectStats.length} subjects`);

    res.json({
      success: true,
      data: {
        results,
        subjectStats,
        overallStats: overallStats[0] || {},
        batch: parseInt(batch),
        semester: parseInt(semester),
        section: section || 'ALL'
      }
    });
  } catch (error) {
    console.error('Error in getDetailedResults:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch detailed results',
      error: error.message 
    });
  }
};

// ============================================================
// EXPORT TO EXCEL
// ============================================================

/**
 * GET /api/hod/export/excel
 * 
 * Exports data to Excel format (simple JSON structure for frontend conversion)
 * Query params: type (toppers/batch-stats/detailed-results), other params based on type
 */
const exportToExcel = async (req, res) => {
  try {
    const { type, criteriaType, batch, semester, section, limit } = req.query;
    
    console.log('\nHOD Controller -> exportToExcel');
    console.log('Params:', { type, criteriaType, batch, semester, section, limit });
    
    let data = [];
    let headers = [];
    let filename = 'export';
    
    if (type === 'toppers') {
      // Export toppers data
      let toppers = [];
      
      if (criteriaType === 'CGPA') {
        const response = await getTopPerformersByCGPA({ query: { batch, limit: limit || 100 } }, { json: (d) => d });
        toppers = response?.data?.toppers || [];
        headers = ['USN', 'Name', 'Batch', 'Section', 'CGPA', 'Total Backlogs'];
        data = toppers.map(t => [t.usn, t.name, t.batch, t.section, t.cgpa, t.total_backlogs || 0]);
        filename = `CGPA_Toppers_${batch || 'All'}_${new Date().toISOString().split('T')[0]}`;
      } else if (criteriaType === 'SGPA' && semester) {
        const response = await getTopPerformersBySGPA({ query: { semester, batch, section, limit: limit || 100 } }, { json: (d) => d });
        toppers = response?.data?.toppers || [];
        headers = ['USN', 'Name', 'Batch', 'Section', 'Semester', 'SGPA', 'Percentage', 'Grade', 'Backlogs'];
        data = toppers.map(t => [t.usn, t.name, t.batch, t.section, t.semester, t.sgpa, t.percentage, t.class_grade, t.backlog_count]);
        filename = `SGPA_Toppers_Sem${semester}_${batch || 'All'}_${new Date().toISOString().split('T')[0]}`;
      }
    } else if (type === 'batch-stats') {
      const response = await getBatchStatistics({ query: {} }, { json: (d) => d });
      const stats = response?.data?.batchStats || [];
      headers = ['Batch', 'Total Students', 'Sections', 'Avg CGPA', 'Highest CGPA', 'Lowest CGPA', 'Distinction', 'First Class'];
      data = stats.map(s => [s.batch, s.total_students, s.total_sections, s.average_cgpa, s.highest_cgpa, s.lowest_cgpa, s.distinction_count, s.first_class_count]);
      filename = `Batch_Statistics_${new Date().toISOString().split('T')[0]}`;
    }
    
    res.json({
      success: true,
      data: {
        headers,
        rows: data,
        filename
      }
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
  getTopPerformersBySGPA,
  getBatchStatistics,
  getSubjectAnalytics,
  getSectionComparison,
  getBacklogStatistics,
  getSGPADistribution,
  getBatchPerformance,
  getDetailedResults,
  exportToExcel
};
