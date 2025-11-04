/**
 * ADMIN CONTROLLER
 * ================
 * Handles all admin-specific operations:
 * - System statistics
 * - User management (CRUD)
 * - Teacher-Subject mapping
 * - Scraper operations
 */

const { mysqlPool } = require('../config/database');
const User = require('../models/User');
const bcrypt = require('bcrypt');

/**
 * Get System Statistics
 * 
 * Returns overall system stats for admin dashboard
 * 
 * @route GET /api/admin/stats
 * @access Protected (ADMIN only)
 */
exports.getSystemStats = async (req, res) => {
  try {
    // Get user counts from MongoDB
    const studentCount = await User.countDocuments({ role: 'STUDENT' });
    const teacherCount = await User.countDocuments({ role: 'TEACHER' });
    const hodCount = await User.countDocuments({ role: 'HOD' });
    const adminCount = await User.countDocuments({ role: 'ADMIN' });

    // Get MySQL stats
    const [studentDetails] = await mysqlPool.execute(
      'SELECT COUNT(*) as total FROM student_details'
    );

    const [subjectCount] = await mysqlPool.execute(
      'SELECT COUNT(DISTINCT subject_code) as total FROM subjects'
    );

    const [resultsCount] = await mysqlPool.execute(
      'SELECT COUNT(*) as total FROM results'
    );

    const [batchInfo] = await mysqlPool.execute(
      'SELECT DISTINCT batch FROM student_details ORDER BY batch DESC'
    );

    // Get average CGPA
    const [avgCGPA] = await mysqlPool.execute(
      'SELECT AVG(cgpa) as avg_cgpa FROM student_details WHERE cgpa IS NOT NULL'
    );

    // Get students with backlogs
    const [backlogStudents] = await mysqlPool.execute(
      `SELECT COUNT(DISTINCT student_usn) as total 
       FROM results 
       WHERE result_status = 'FAIL' 
       AND attempt_number = (
         SELECT MAX(attempt_number) 
         FROM results r2 
         WHERE r2.student_usn = results.student_usn 
         AND r2.subject_code = results.subject_code
       )`
    );

    res.json({
      success: true,
      stats: {
        users: {
          students: studentCount,
          teachers: teacherCount,
          hods: hodCount,
          admins: adminCount,
          total: studentCount + teacherCount + hodCount + adminCount
        },
        database: {
          studentDetails: studentDetails[0].total,
          subjects: subjectCount[0].total,
          results: resultsCount[0].total,
          batches: batchInfo.length,
          batchList: batchInfo.map(b => b.batch)
        },
        performance: {
          avgCGPA: avgCGPA[0].avg_cgpa ? Number(avgCGPA[0].avg_cgpa).toFixed(2) : null,
          studentsWithBacklogs: backlogStudents[0].total
        }
      }
    });

  } catch (error) {
    console.error('❌ Get System Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system statistics'
    });
  }
};

/**
 * Get All Users
 * 
 * Returns all users from MongoDB with pagination and filtering
 * 
 * @route GET /api/admin/users
 * @access Protected (ADMIN only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 50 } = req.query;

    const query = role ? { role } : {};
    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Get All Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

/**
 * Create User
 * 
 * Creates a new user account
 * 
 * @route POST /api/admin/users
 * @access Protected (ADMIN only)
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, usn } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      usn: role === 'STUDENT' ? usn : undefined,
      mustChangePassword: true
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        usn: user.usn
      }
    });

  } catch (error) {
    console.error('❌ Create User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
};

/**
 * Update User
 * 
 * Updates user details
 * 
 * @route PUT /api/admin/users/:userId
 * @access Protected (ADMIN only)
 */
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role, mustChangePassword } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (typeof mustChangePassword === 'boolean') {
      updateData.mustChangePassword = mustChangePassword;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    console.error('❌ Update User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

/**
 * Delete User
 * 
 * Deletes a user account
 * 
 * @route DELETE /api/admin/users/:userId
 * @access Protected (ADMIN only)
 */
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

/**
 * Get All Students from MySQL
 * 
 * Returns all students with their details for batch scraping
 * 
 * @route GET /api/admin/students
 * @access Protected (ADMIN only)
 */
exports.getAllStudents = async (req, res) => {
  try {
    const { batch, section } = req.query;

    let query = 'SELECT usn, name, batch, section FROM student_details WHERE 1=1';
    const params = [];

    if (batch) {
      query += ' AND batch = ?';
      params.push(batch);
    }

    if (section) {
      query += ' AND section = ?';
      params.push(section);
    }

    query += ' ORDER BY usn';

    const [students] = await mysqlPool.execute(query, params);

    res.json({
      success: true,
      students,
      total: students.length
    });

  } catch (error) {
    console.error('❌ Get All Students Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students'
    });
  }
};

/**
 * Get All Subjects
 * 
 * Returns all subjects from MySQL
 * 
 * @route GET /api/admin/subjects
 * @access Protected (ADMIN only)
 */
exports.getAllSubjects = async (req, res) => {
  try {
    const [subjects] = await mysqlPool.execute(
      `SELECT DISTINCT subject_code, subject_name, credits, semester, scheme 
       FROM subjects 
       ORDER BY semester, subject_code`
    );

    res.json({
      success: true,
      subjects,
      total: subjects.length
    });

  } catch (error) {
    console.error('❌ Get All Subjects Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects'
    });
  }
};

/**
 * Reset User Password
 * 
 * Resets user password (admin feature)
 * 
 * @route POST /api/admin/users/:userId/reset-password
 * @access Protected (ADMIN only)
 */
exports.resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        password: hashedPassword,
        mustChangePassword: true
      },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Password reset successfully. User must change password on next login.'
    });

  } catch (error) {
    console.error('❌ Reset Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
};

/**
 * Add Single Student
 * 
 * Adds a new student to the database
 * 
 * @route POST /api/admin/students/add
 * @access Protected (ADMIN only)
 */
exports.addStudent = async (req, res) => {
  try {
    const { usn, name, batch, section, scheme, dob } = req.body;

    // Validation
    if (!usn || !name || !batch || !scheme) {
      return res.status(400).json({
        success: false,
        message: 'USN, name, batch, and scheme are required'
      });
    }

    // Check if student already exists
    const [existing] = await mysqlPool.execute(
      'SELECT usn FROM student_details WHERE usn = ?',
      [usn]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Student ${usn} already exists`
      });
    }

    // Insert student
    const insertQuery = `
      INSERT INTO student_details 
      (usn, name, batch, section, scheme, dob)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await mysqlPool.execute(insertQuery, [
      usn.toUpperCase().trim(),
      name.trim(),
      batch,
      section || null,
      scheme,
      dob || null
    ]);

    console.log(`✅ Added student: ${usn} - ${name}`);

    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      data: { usn, name, batch, section, scheme, dob }
    });

  } catch (error) {
    console.error('❌ Add Student Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add student'
    });
  }
};

/**
 * Bulk Import Students from Excel
 * 
 * Imports multiple students from Excel data
 * Expects array of student objects
 * 
 * @route POST /api/admin/students/bulk
 * @access Protected (ADMIN only)
 */
exports.bulkImportStudents = async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Students array is required'
      });
    }

    const results = {
      inserted: 0,
      skipped: 0,
      failed: 0,
      details: []
    };

    // Process each student
    for (const student of students) {
      const { usn, name, batch, section, scheme, dob } = student;

      // Validate required fields
      if (!usn || !name || !batch || !scheme) {
        results.failed++;
        results.details.push({
          usn: usn || 'Unknown',
          status: 'failed',
          reason: 'Missing required fields (usn, name, batch, or scheme)'
        });
        continue;
      }

      try {
        // Check if student already exists
        const [existing] = await mysqlPool.execute(
          'SELECT usn FROM student_details WHERE usn = ?',
          [usn]
        );

        if (existing.length > 0) {
          results.skipped++;
          results.details.push({
            usn,
            status: 'skipped',
            reason: 'Already exists'
          });
          continue;
        }

        // Insert student
        const insertQuery = `
          INSERT INTO student_details 
          (usn, name, batch, section, scheme, dob)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        await mysqlPool.execute(insertQuery, [
          usn.toUpperCase().trim(),
          name.trim(),
          batch,
          section || null,
          scheme,
          dob || null
        ]);

        results.inserted++;
        results.details.push({
          usn,
          status: 'inserted',
          reason: 'Successfully added'
        });

      } catch (error) {
        results.failed++;
        results.details.push({
          usn,
          status: 'failed',
          reason: error.message
        });
      }
    }

    console.log(`📊 Bulk Import Results: ${results.inserted} inserted, ${results.skipped} skipped, ${results.failed} failed`);

    res.status(200).json({
      success: true,
      message: `Import complete: ${results.inserted} added, ${results.skipped} skipped, ${results.failed} failed`,
      data: results
    });

  } catch (error) {
    console.error('❌ Bulk Import Students Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import students'
    });
  }
};

/**
 * Add Single Subject
 * 
 * Adds a new subject to the database
 * 
 * @route POST /api/admin/subjects/add
 * @access Protected (ADMIN only)
 */
exports.addSubject = async (req, res) => {
  try {
    const { subjectCode, subjectName, semester, credits, scheme, isPlaceholder } = req.body;

    // Validation
    if (!subjectCode || !subjectName || !semester || !credits || !scheme) {
      return res.status(400).json({
        success: false,
        message: 'Subject code, name, semester, credits, and scheme are required'
      });
    }

    // Check if subject already exists
    const [existing] = await mysqlPool.execute(
      'SELECT subject_code FROM subjects WHERE subject_code = ?',
      [subjectCode]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Subject ${subjectCode} already exists`
      });
    }

    // Insert subject
    const insertQuery = `
      INSERT INTO subjects 
      (subject_code, subject_name, semester, credits, scheme, is_placeholder)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await mysqlPool.execute(insertQuery, [
      subjectCode.toUpperCase().trim(),
      subjectName.trim(),
      semester,
      credits,
      scheme,
      isPlaceholder === 'yes' || isPlaceholder === true ? 1 : 0
    ]);

    console.log(`✅ Added subject: ${subjectCode} - ${subjectName}`);

    res.status(201).json({
      success: true,
      message: 'Subject added successfully',
      data: { subjectCode, subjectName, semester, credits, scheme, isPlaceholder }
    });

  } catch (error) {
    console.error('❌ Add Subject Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add subject'
    });
  }
};

/**
 * Bulk Import Subjects from Excel
 * 
 * Imports multiple subjects from Excel data
 * Expects array of subject objects
 * 
 * @route POST /api/admin/subjects/bulk
 * @access Protected (ADMIN only)
 */
exports.bulkImportSubjects = async (req, res) => {
  try {
    const { subjects } = req.body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Subjects array is required'
      });
    }

    const results = {
      inserted: 0,
      skipped: 0,
      failed: 0,
      details: []
    };

    // Process each subject
    for (const subject of subjects) {
      const { subjectCode, subjectName, semester, credits, scheme, isPlaceholder } = subject;

      // Validate required fields
      if (!subjectCode || !subjectName || !semester || !credits || !scheme) {
        results.failed++;
        results.details.push({
          subjectCode: subjectCode || 'Unknown',
          status: 'failed',
          reason: 'Missing required fields'
        });
        continue;
      }

      try {
        // Check if subject already exists
        const [existing] = await mysqlPool.execute(
          'SELECT subject_code FROM subjects WHERE subject_code = ?',
          [subjectCode]
        );

        if (existing.length > 0) {
          results.skipped++;
          results.details.push({
            subjectCode,
            status: 'skipped',
            reason: 'Already exists'
          });
          continue;
        }

        // Insert subject
        const insertQuery = `
          INSERT INTO subjects 
          (subject_code, subject_name, semester, credits, scheme, is_placeholder)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        await mysqlPool.execute(insertQuery, [
          subjectCode.toUpperCase().trim(),
          subjectName.trim(),
          semester,
          credits,
          scheme,
          isPlaceholder === 'yes' || isPlaceholder === 'Yes' || isPlaceholder === true ? 1 : 0
        ]);

        results.inserted++;
        results.details.push({
          subjectCode,
          status: 'inserted',
          reason: 'Successfully added'
        });

      } catch (error) {
        results.failed++;
        results.details.push({
          subjectCode,
          status: 'failed',
          reason: error.message
        });
      }
    }

    console.log(`📊 Bulk Import Results: ${results.inserted} inserted, ${results.skipped} skipped, ${results.failed} failed`);

    res.status(200).json({
      success: true,
      message: `Import complete: ${results.inserted} added, ${results.skipped} skipped, ${results.failed} failed`,
      data: results
    });

  } catch (error) {
    console.error('❌ Bulk Import Subjects Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import subjects'
    });
  }
};
