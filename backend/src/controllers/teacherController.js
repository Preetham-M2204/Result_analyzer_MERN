const { mysqlPool } = require('../config/database');

/**
 * Get all teachers for dropdown
 */
exports.getAllTeachers = async (req, res) => {
  try {
    const [teachers] = await mysqlPool.execute(`
      SELECT teacher_id, teacher_name
      FROM teachers
      ORDER BY teacher_name
    `);

    res.status(200).json({
      success: true,
      teachers
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teachers',
      error: error.message
    });
  }
};

/**
 * Get subjects for a specific batch and semester
 */
exports.getSubjectsByBatchSemester = async (req, res) => {
  try {
    const { batch, semester } = req.query;

    if (!batch || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Batch and semester are required'
      });
    }

    // Determine scheme from batch year
    const scheme = parseInt(batch) <= 2021 ? '21' : '22';

    const [subjects] = await mysqlPool.execute(`
      SELECT subject_code, subject_name, credits, semester, scheme
      FROM subjects
      WHERE semester = ? AND scheme = ?
      ORDER BY subject_code
    `, [semester, scheme]);

    res.status(200).json({
      success: true,
      subjects,
      scheme
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects',
      error: error.message
    });
  }
};

/**
 * Get available sections (dynamic)
 */
exports.getSections = async (req, res) => {
  try {
    const { batch } = req.query;

    if (!batch) {
      return res.status(400).json({
        success: false,
        message: 'Batch is required'
      });
    }

    // Get distinct sections for this batch
    const [sections] = await mysqlPool.execute(`
      SELECT DISTINCT section
      FROM student_details
      WHERE batch = ? AND section IS NOT NULL
      ORDER BY section
    `, [batch]);

    // If no sections found, default to section A
    const sectionList = sections.length > 0 
      ? sections.map(row => ({ section: row.section }))
      : [{ section: 'A' }];

    res.status(200).json({
      success: true,
      sections: sectionList
    });
  } catch (error) {
    console.error('Get sections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sections',
      error: error.message
    });
  }
};

/**
 * Assign teacher to subjects
 */
exports.assignTeacherToSubjects = async (req, res) => {
  try {
    const { teacherId, subjectCodes, batch, section } = req.body;

    if (!teacherId || !subjectCodes || !batch || !section) {
      return res.status(400).json({
        success: false,
        message: 'Teacher ID, subject codes, batch, and section are required'
      });
    }

    if (!Array.isArray(subjectCodes) || subjectCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one subject must be selected'
      });
    }

    // Verify teacher exists
    const [teacherCheck] = await mysqlPool.execute(
      'SELECT teacher_id FROM teachers WHERE teacher_id = ?',
      [teacherId]
    );

    if (teacherCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Delete existing assignments for this teacher, batch, and section
    await mysqlPool.execute(`
      DELETE FROM teacher_subject_assignments
      WHERE teacher_id = ? AND batch = ? AND section = ?
    `, [teacherId, batch, section]);

    // Insert new assignments
    const insertPromises = subjectCodes.map(subjectCode => {
      return mysqlPool.execute(`
        INSERT INTO teacher_subject_assignments (teacher_id, subject_code, batch, section)
        VALUES (?, ?, ?, ?)
      `, [teacherId, subjectCode, batch, section]);
    });

    await Promise.all(insertPromises);

    res.status(200).json({
      success: true,
      message: `Successfully assigned ${subjectCodes.length} subjects to teacher`,
      assignments: subjectCodes.length
    });
  } catch (error) {
    console.error('Assign teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign teacher',
      error: error.message
    });
  }
};

/**
 * Get all teacher-subject assignments
 */
exports.getTeacherAssignments = async (req, res) => {
  try {
    const [assignments] = await mysqlPool.execute(`
      SELECT 
        t.teacher_id,
        t.teacher_name,
        tsa.batch,
        tsa.section,
        GROUP_CONCAT(DISTINCT s.subject_code ORDER BY s.subject_code SEPARATOR ',') as subject_codes,
        GROUP_CONCAT(DISTINCT s.subject_name ORDER BY s.subject_code SEPARATOR ',') as subject_names,
        COUNT(DISTINCT tsa.subject_code) as subject_count
      FROM teachers t
      INNER JOIN teacher_subject_assignments tsa ON t.teacher_id = tsa.teacher_id
      INNER JOIN subjects s ON tsa.subject_code = s.subject_code
      GROUP BY t.teacher_id, t.teacher_name, tsa.batch, tsa.section
      ORDER BY t.teacher_name, tsa.batch DESC, tsa.section
    `);

    res.status(200).json({
      success: true,
      assignments
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments',
      error: error.message
    });
  }
};

/**
 * Delete teacher assignment
 */
exports.deleteTeacherAssignment = async (req, res) => {
  try {
    const { teacherId, batch, section, subjectCode } = req.query;

    if (!teacherId || !batch || !section || !subjectCode) {
      return res.status(400).json({
        success: false,
        message: 'Teacher ID, batch, section, and subject code are required'
      });
    }

    const [result] = await mysqlPool.execute(`
      DELETE FROM teacher_subject_assignments
      WHERE teacher_id = ? AND batch = ? AND section = ? AND subject_code = ?
    `, [teacherId, batch, section, subjectCode]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete assignment',
      error: error.message
    });
  }
};

/**
 * Add a new section to a batch
 */
exports.addSection = async (req, res) => {
  try {
    const { batch, section } = req.body;

    if (!batch || !section) {
      return res.status(400).json({
        success: false,
        message: 'Batch and section are required'
      });
    }

    // Check if section already exists for this batch
    const [existing] = await mysqlPool.execute(`
      SELECT COUNT(*) as count
      FROM student_details
      WHERE batch = ? AND section = ?
    `, [batch, section]);

    if (existing[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `Section ${section} already exists for batch ${batch}`
      });
    }

    res.status(200).json({
      success: true,
      message: `Section ${section} can be added. Add students with this section to make it active.`,
      section: section.toUpperCase()
    });
  } catch (error) {
    console.error('Add section error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add section',
      error: error.message
    });
  }
};

/**
 * Get teacher's assigned subjects and teacher details
 */
exports.getTeacherSubjects = async (req, res) => {
  try {
    // Get teacherId from authenticated user (req.user should be set by auth middleware)
    const teacherId = req.user?.teacherId || req.query.teacherId;

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: 'Teacher ID is required. Please ensure your account has a teacher ID assigned.'
      });
    }

    console.log('Fetching subjects for teacher:', teacherId);

    // Fetch teacher details from MySQL
    const [teacherDetails] = await mysqlPool.execute(`
      SELECT 
        teacher_id,
        teacher_name
      FROM teachers
      WHERE teacher_id = ?
    `, [teacherId]);

    if (teacherDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Teacher with ID ${teacherId} not found in database. Please contact admin.`
      });
    }

    // Fetch assigned subjects
    const [subjects] = await mysqlPool.execute(`
      SELECT DISTINCT
        s.subject_code,
        s.subject_name,
        s.semester,
        s.credits,
        tsa.batch,
        tsa.section
      FROM teacher_subject_assignments tsa
      JOIN subjects s ON tsa.subject_code = s.subject_code
      WHERE tsa.teacher_id = ?
      ORDER BY tsa.batch DESC, s.semester, tsa.section, s.subject_code
    `, [teacherId]);

    console.log(`Found ${subjects.length} subject assignments for teacher ${teacherId}`);

    res.status(200).json({
      success: true,
      teacher: teacherDetails[0],
      subjects
    });
  } catch (error) {
    console.error('Get teacher subjects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher subjects',
      error: error.message
    });
  }
};

/**
 * Get detailed subject analysis for teacher
 */
exports.getSubjectAnalysis = async (req, res) => {
  try {
    const { subjectCode, batch, section } = req.query;

    if (!subjectCode || !batch) {
      return res.status(400).json({
        success: false,
        message: 'Subject code and batch are required'
      });
    }

    let whereClause = 'WHERE r.subject_code = ? AND s.batch = ?';
    let params = [subjectCode, parseInt(batch)];

    if (section) {
      whereClause += ' AND s.section = ?';
      params.push(section);
    }

    // Overall statistics
    // Pass criteria: 
    // - Internal-only subjects (NSS, PE, Yoga with external=0): total >= 40
    // - Regular subjects: external >= 18 AND total >= 40
    const [overallStats] = await mysqlPool.execute(`
      SELECT 
        COUNT(DISTINCT s.usn) as total_students,
        SUM(CASE 
          WHEN r.external_marks = 0 THEN 
            CASE WHEN r.total_marks >= 40 THEN 1 ELSE 0 END
          ELSE 
            CASE WHEN r.external_marks >= 18 AND r.total_marks >= 40 THEN 1 ELSE 0 END
        END) as passed_count,
        SUM(CASE 
          WHEN r.external_marks = 0 THEN 
            CASE WHEN r.total_marks < 40 THEN 1 ELSE 0 END
          ELSE 
            CASE WHEN r.external_marks < 18 OR r.total_marks < 40 THEN 1 ELSE 0 END
        END) as failed_count,
        ROUND((SUM(CASE 
          WHEN r.external_marks = 0 THEN 
            CASE WHEN r.total_marks >= 40 THEN 1 ELSE 0 END
          ELSE 
            CASE WHEN r.external_marks >= 18 AND r.total_marks >= 40 THEN 1 ELSE 0 END
        END) / COUNT(*)) * 100, 2) as pass_percentage,
        AVG(r.total_marks) as average_marks,
        MAX(r.total_marks) as highest_marks,
        MIN(r.total_marks) as lowest_marks,
        AVG(r.internal_marks) as avg_internal,
        AVG(r.external_marks) as avg_external
      FROM results r
      JOIN student_details s ON r.student_usn = s.usn
      JOIN subjects sub ON r.subject_code = sub.subject_code
      ${whereClause}
    `, params);

    // Grade distribution
    const [gradeDistribution] = await mysqlPool.execute(`
      SELECT 
        r.letter_grade,
        MAX(r.grade_points) as grade_points,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (
          SELECT COUNT(*) 
          FROM results r2 
          JOIN student_details s2 ON r2.student_usn = s2.usn 
          WHERE r2.subject_code = ? AND s2.batch = ? ${section ? 'AND s2.section = ?' : ''}
        )), 2) as percentage
      FROM results r
      JOIN student_details s ON r.student_usn = s.usn
      ${whereClause}
      GROUP BY r.letter_grade
      ORDER BY grade_points DESC
    `, [...params, ...params]);

    // Gender-wise performance
    const [genderStats] = await mysqlPool.execute(`
      SELECT 
        s.gender,
        COUNT(DISTINCT s.usn) as total_students,
        SUM(CASE WHEN r.result_status != 'FAIL' THEN 1 ELSE 0 END) as passed_count,
        SUM(CASE WHEN r.result_status = 'FAIL' THEN 1 ELSE 0 END) as failed_count,
        ROUND((SUM(CASE WHEN r.result_status != 'FAIL' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as pass_percentage,
        AVG(r.total_marks) as average_marks,
        MAX(r.total_marks) as highest_marks
      FROM results r
      JOIN student_details s ON r.student_usn = s.usn
      ${whereClause}
      GROUP BY s.gender
    `, params);

    res.status(200).json({
      success: true,
      data: {
        overallStats: overallStats[0] || {},
        gradeDistribution,
        genderStats
      }
    });
  } catch (error) {
    console.error('Get subject analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subject analysis',
      error: error.message
    });
  }
};

/**
 * Get toppers for a subject
 * UPDATED: Fixed parameter handling for LIMIT clause
 */
exports.getSubjectToppers = async (req, res) => {
  try {
    const { subjectCode, batch, section, limit = 10 } = req.query;

    if (!subjectCode || !batch) {
      return res.status(400).json({
        success: false,
        message: 'Subject code and batch are required'
      });
    }

    let params = [subjectCode, batch.toString()];
    let queryParams = [subjectCode, batch.toString()];

    if (section) {
      params.push(section);
      queryParams.push(section);
    }

    // Add limit to query params - TRY AS STRING
    queryParams.push(limit.toString());
    
    console.log('🔍 DEBUG TOPPERS QUERY:');
    console.log('  section provided:', !!section);
    console.log('  params for gender queries:', params);
    console.log('  queryParams for toppers:', queryParams);
    console.log('  queryParams types:', queryParams.map(p => typeof p));

    // Build WHERE clause dynamically in the query itself
    let topperQuery = `
      SELECT 
        s.usn,
        s.name,
        s.gender,
        s.section,
        r.internal_marks,
        r.external_marks,
        r.total_marks,
        r.letter_grade,
        r.result_status
      FROM results r
      JOIN student_details s ON r.student_usn = s.usn
      WHERE r.subject_code = ? AND s.batch = ?`;
    
    if (section) {
      topperQuery += ` AND s.section = ?`;
    }
    
    topperQuery += `
      ORDER BY r.total_marks DESC, r.letter_grade
      LIMIT ?
    `;

    console.log('  Query has', (topperQuery.match(/\?/g) || []).length, 'placeholders');
    console.log('  Providing', queryParams.length, 'parameters');

    // Overall toppers
    const [toppers] = await mysqlPool.execute(topperQuery, queryParams);

    // Gender-wise toppers - build separate queries
    let maleQuery = `
      SELECT 
        s.usn,
        s.name,
        s.section,
        r.internal_marks,
        r.external_marks,
        r.total_marks,
        r.letter_grade
      FROM results r
      JOIN student_details s ON r.student_usn = s.usn
      WHERE r.subject_code = ? AND s.batch = ?`;
    
    let femaleQuery = `
      SELECT 
        s.usn,
        s.name,
        s.section,
        r.internal_marks,
        r.external_marks,
        r.total_marks,
        r.letter_grade
      FROM results r
      JOIN student_details s ON r.student_usn = s.usn
      WHERE r.subject_code = ? AND s.batch = ?`;
    
    if (section) {
      maleQuery += ` AND s.section = ?`;
      femaleQuery += ` AND s.section = ?`;
    }
    
    maleQuery += ` AND s.gender = 'Male' ORDER BY r.total_marks DESC LIMIT 5`;
    femaleQuery += ` AND s.gender = 'Female' ORDER BY r.total_marks DESC LIMIT 5`;

    const [maleToppers] = await mysqlPool.execute(maleQuery, params);
    const [femaleToppers] = await mysqlPool.execute(femaleQuery, params);

    res.status(200).json({
      success: true,
      data: {
        toppers,
        maleToppers,
        femaleToppers
      }
    });
  } catch (error) {
    console.error('Get subject toppers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subject toppers',
      error: error.message
    });
  }
};

/**
 * Get list of students who failed the subject
 */
exports.getFailedStudents = async (req, res) => {
  try {
    const { subjectCode, batch, section } = req.query;

    if (!subjectCode || !batch) {
      return res.status(400).json({
        success: false,
        message: 'Subject code and batch are required'
      });
    }

    let whereClause = 'WHERE r.subject_code = ? AND s.batch = ? AND r.result_status = ?';
    let params = [subjectCode, parseInt(batch), 'FAIL'];

    if (section) {
      whereClause += ' AND s.section = ?';
      params.push(section);
    }

    const [failedStudents] = await mysqlPool.execute(`
      SELECT 
        s.usn,
        s.name,
        s.gender,
        s.section,
        r.internal_marks,
        r.external_marks,
        r.total_marks,
        r.letter_grade,
        r.attempt_number
      FROM results r
      JOIN student_details s ON r.student_usn = s.usn
      ${whereClause}
      ORDER BY s.section, s.usn
    `, params);

    res.status(200).json({
      success: true,
      data: {
        failedStudents,
        count: failedStudents.length
      }
    });
  } catch (error) {
    console.error('Get failed students error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch failed students',
      error: error.message
    });
  }
};

/**
 * Get all student results for a subject
 */
exports.getAllSubjectResults = async (req, res) => {
  try {
    const { subjectCode, batch, section } = req.query;

    if (!subjectCode || !batch) {
      return res.status(400).json({
        success: false,
        message: 'Subject code and batch are required'
      });
    }

    let whereClause = 'WHERE r.subject_code = ? AND s.batch = ?';
    let params = [subjectCode, parseInt(batch)];

    if (section) {
      whereClause += ' AND s.section = ?';
      params.push(section);
    }

    const [allResults] = await mysqlPool.execute(`
      SELECT 
        s.usn,
        s.name,
        s.gender,
        s.section,
        r.internal_marks,
        r.external_marks,
        r.total_marks,
        r.letter_grade,
        r.result_status,
        r.attempt_number
      FROM results r
      JOIN student_details s ON r.student_usn = s.usn
      ${whereClause}
      ORDER BY r.total_marks DESC, s.usn
    `, params);

    res.status(200).json({
      success: true,
      data: {
        results: allResults,
        count: allResults.length
      }
    });
  } catch (error) {
    console.error('Get all subject results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subject results',
      error: error.message
    });
  }
};


