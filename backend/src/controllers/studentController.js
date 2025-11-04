/**
 * STUDENT API CONTROLLER
 * ======================
 * Handles all student-specific data requests
 */

const { mysqlPool } = require('../config/database');

/**
 * Get Student Profile
 * 
 * Fetches student details from MySQL
 * 
 * @route GET /api/student/profile
 * @access Protected (STUDENT only)
 */
exports.getProfile = async (req, res) => {
  try {
    const { usn } = req.user;
    
    // Query student details
    const [students] = await mysqlPool.execute(
      'SELECT * FROM student_details WHERE usn = ?',
      [usn]
    );
    
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }
    
    res.json({
      success: true,
      profile: students[0]
    });
    
  } catch (error) {
    console.error('❌ Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

/**
 * Update Student Profile
 * 
 * Updates section and other editable fields
 * 
 * @route PUT /api/student/profile
 * @access Protected (STUDENT only)
 */
exports.updateProfile = async (req, res) => {
  try {
    const { usn } = req.user;
    const { section } = req.body;
    
    // Update student details
    await mysqlPool.execute(
      'UPDATE student_details SET section = ? WHERE usn = ?',
      [section, usn]
    );
    
    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

/**
 * Get Student Semester Results
 * 
 * Fetches all subject-wise results for a specific semester
 * 
 * @route GET /api/student/results/:semester
 * @access Protected (STUDENT only)
 */
exports.getSemesterResults = async (req, res) => {
  try {
    const { usn } = req.user;
    const { semester } = req.params;
    
    // Query results with subject details
    const [results] = await mysqlPool.execute(
      `SELECT 
        r.subject_code,
        s.subject_name,
        s.credits,
        r.internal_marks,
        r.external_marks,
        r.total_marks,
        r.result_status
      FROM results r
      JOIN subjects s ON r.subject_code = s.subject_code
      WHERE r.student_usn = ? AND r.semester = ?
      ORDER BY r.subject_code`,
      [usn, semester]
    );
    
    // Get SGPA for this semester
    const [sgpaData] = await mysqlPool.execute(
      'SELECT sgpa FROM student_semester_summary WHERE student_usn = ? AND semester = ?',
      [usn, semester]
    );
    
    res.json({
      success: true,
      semester: parseInt(semester),
      sgpa: sgpaData.length > 0 ? sgpaData[0].sgpa : null,
      results
    });
    
  } catch (error) {
    console.error('❌ Get Semester Results Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch results'
    });
  }
};

/**
 * Get Student Overall Summary
 * 
 * Fetches CGPA, backlogs count, semester-wise SGPA
 * 
 * @route GET /api/student/summary
 * @access Protected (STUDENT only)
 */
exports.getSummary = async (req, res) => {
  try {
    const { usn } = req.user;
    
    // Get CGPA from student_details
    const [studentData] = await mysqlPool.execute(
      'SELECT cgpa, batch FROM student_details WHERE usn = ?',
      [usn]
    );
    
    // Get all semester SGPAs
    const [sgpaData] = await mysqlPool.execute(
      'SELECT semester, sgpa FROM student_semester_summary WHERE student_usn = ? ORDER BY semester',
      [usn]
    );
    
    // Count backlogs (FAIL status in latest attempt)
    const [backlogData] = await mysqlPool.execute(
      `SELECT COUNT(DISTINCT subject_code) as backlog_count
       FROM results
       WHERE student_usn = ? 
       AND result_status = 'FAIL'
       AND attempt_number = (
         SELECT MAX(attempt_number) 
         FROM results r2 
         WHERE r2.student_usn = results.student_usn 
         AND r2.subject_code = results.subject_code
       )`,
      [usn]
    );
    
    res.json({
      success: true,
      cgpa: studentData[0]?.cgpa || null,
      batch: studentData[0]?.batch || null,
      backlogs: backlogData[0]?.backlog_count || 0,
      semesterWiseGPA: sgpaData
    });
    
  } catch (error) {
    console.error('❌ Get Summary Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary'
    });
  }
};

/**
 * Get Batch CGPA Distribution
 * 
 * Fetches CGPA distribution for entire batch (for graph)
 * 
 * @route GET /api/student/batch-cgpa
 * @access Protected (STUDENT only)
 */
exports.getBatchCGPA = async (req, res) => {
  try {
    const { usn } = req.user;
    
    // Get student's batch
    const [studentData] = await mysqlPool.execute(
      'SELECT batch FROM student_details WHERE usn = ?',
      [usn]
    );
    
    const batch = studentData[0]?.batch;
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch information not found'
      });
    }
    
    // Get CGPA distribution for batch (grouped in ranges)
    const [cgpaDistribution] = await mysqlPool.execute(
      `SELECT 
        FLOOR(cgpa) as cgpa_range,
        COUNT(*) as student_count
      FROM student_details
      WHERE batch = ? AND cgpa IS NOT NULL
      GROUP BY FLOOR(cgpa)
      ORDER BY cgpa_range`,
      [batch]
    );
    
    res.json({
      success: true,
      batch,
      distribution: cgpaDistribution
    });
    
  } catch (error) {
    console.error('❌ Get Batch CGPA Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch CGPA'
    });
  }
};

/**
 * Get Class Rank
 * 
 * Calculates student's rank in their section for a semester
 * 
 * @route GET /api/student/rank/:semester
 * @access Protected (STUDENT only)
 */
exports.getClassRank = async (req, res) => {
  try {
    const { usn } = req.user;
    const { semester } = req.params;
    
    // Get student's section
    const [studentData] = await mysqlPool.execute(
      'SELECT section FROM student_details WHERE usn = ?',
      [usn]
    );
    
    const section = studentData[0]?.section;
    
    if (!section) {
      return res.json({
        success: true,
        rank: null,
        total: null,
        message: 'Section not set. Please update your profile.'
      });
    }
    
    // Get rank in section for this semester
    const [rankData] = await mysqlPool.execute(
      `SELECT 
        COUNT(*) + 1 as student_rank
      FROM student_semester_summary sss
      JOIN student_details sd ON sss.student_usn = sd.usn
      WHERE sd.section = ?
      AND sss.semester = ?
      AND sss.sgpa > (
        SELECT sgpa 
        FROM student_semester_summary 
        WHERE student_usn = ? AND semester = ?
      )`,
      [section, semester, usn, semester]
    );
    
    // Get total students in section
    const [totalData] = await mysqlPool.execute(
      `SELECT COUNT(DISTINCT sss.student_usn) as total_students
      FROM student_semester_summary sss
      JOIN student_details sd ON sss.student_usn = sd.usn
      WHERE sd.section = ? AND sss.semester = ?`,
      [section, semester]
    );
    
    res.json({
      success: true,
      rank: rankData[0]?.student_rank || null,
      total: totalData[0]?.total_students || null,
      section
    });
    
  } catch (error) {
    console.error('❌ Get Rank Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rank'
    });
  }
};

/**
 * Get Section CGPA Distribution
 * 
 * Fetches CGPA distribution for student's section (for graph)
 * 
 * @route GET /api/student/section-cgpa
 * @access Protected (STUDENT only)
 */
exports.getSectionCGPA = async (req, res) => {
  try {
    const { usn } = req.user;
    
    // Get student's section and batch
    const [studentData] = await mysqlPool.execute(
      'SELECT section, batch FROM student_details WHERE usn = ?',
      [usn]
    );
    
    const section = studentData[0]?.section;
    const batch = studentData[0]?.batch;
    
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section information not found'
      });
    }
    
    // Get CGPA distribution for section (grouped in ranges)
    const [cgpaDistribution] = await mysqlPool.execute(
      `SELECT 
        FLOOR(cgpa) as cgpa_range,
        COUNT(*) as student_count
      FROM student_details
      WHERE section = ? AND batch = ? AND cgpa IS NOT NULL
      GROUP BY FLOOR(cgpa)
      ORDER BY cgpa_range`,
      [section, batch]
    );
    
    res.json({
      success: true,
      section,
      batch,
      distribution: cgpaDistribution
    });
    
  } catch (error) {
    console.error('❌ Get Section CGPA Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch section CGPA'
    });
  }
};
