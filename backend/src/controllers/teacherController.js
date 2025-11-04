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
