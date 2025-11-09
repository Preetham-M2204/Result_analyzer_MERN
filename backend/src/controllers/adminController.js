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
 * Utility: Convert DOB from DD-MM-YYYY to YYYY-MM-DD for MySQL DATE type
 * @param {string} dob - Date string in DD-MM-YYYY format
 * @returns {string|null} - Date string in YYYY-MM-DD format or null
 */
const convertDobToMySQLFormat = (dob) => {
  if (!dob) return null;
  
  if (typeof dob === 'string') {
    const dobParts = dob.split('-');
    if (dobParts.length === 3) {
      const [day, month, year] = dobParts;
      // Validate that we have valid date parts
      if (year && year.length === 4 && month && day) {
        return `${year}-${month}-${day}`;
      }
    }
  }
  
  return null;
};

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
    const { usn, name, batch, section, scheme, dob, gender, discipline } = req.body;

    // Validation
    if (!usn || !name || !batch || !scheme || !discipline) {
      return res.status(400).json({
        success: false,
        message: 'USN, name, batch, scheme, and discipline are required'
      });
    }

    // Validate discipline enum
    const validDisciplines = ['VTU', 'Autonomous'];
    if (!validDisciplines.includes(discipline)) {
      return res.status(400).json({
        success: false,
        message: 'Discipline must be either "VTU" or "Autonomous"'
      });
    }

    // Validate gender enum (optional field)
    const validGenders = ['Male', 'Female', 'Other'];
    if (gender && !validGenders.includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'Gender must be "Male", "Female", or "Other"'
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

    // Convert DOB to MySQL format (YYYY-MM-DD)
    const formattedDob = convertDobToMySQLFormat(dob);

    // Insert student with all required fields matching schema exactly
    const insertQuery = `
      INSERT INTO student_details 
      (usn, name, gender, batch, discipline, scheme, dob, section)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await mysqlPool.execute(insertQuery, [
      usn.toUpperCase().trim(),
      name.trim(),
      gender || null,              // ENUM('Male', 'Female', 'Other')
      batch,                        // INT NOT NULL
      discipline,                   // ENUM('VTU', 'Autonomous') NOT NULL
      scheme,                       // VARCHAR(10) DEFAULT '22'
      formattedDob,                 // DATE NULL
      section || null               // VARCHAR(5)
    ]);

    console.log(`✅ Added student: ${usn} - ${name}`);

    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      data: { usn, name, gender, batch, discipline, scheme, dob: formattedDob, section }
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
 * Expects array of student objects with fields: usn, name, gender, batch, discipline, scheme, dob, section
 * 
 * @route POST /api/admin/students/bulk
 * @access Protected (ADMIN only)
 */
exports.bulkImportStudents = async (req, res) => {
  try {
    const { students } = req.body;

    console.log('🔍 BULK IMPORT DEBUG - Received request');
    console.log('📦 Students array length:', students?.length || 0);
    console.log('📦 Students array type:', Array.isArray(students) ? 'Array' : typeof students);
    console.log('📦 First student:', JSON.stringify(students?.[0], null, 2));

    if (!students || !Array.isArray(students) || students.length === 0) {
      console.log('❌ Validation failed: students array is invalid');
      return res.status(400).json({
        success: false,
        message: 'Students array is required and must not be empty'
      });
    }

    const results = {
      inserted: 0,
      skipped: 0,
      failed: 0,
      details: []
    };

    const validDisciplines = ['VTU', 'Autonomous'];
    const validGenders = ['Male', 'Female', 'Other'];

    console.log(`🔄 Processing ${students.length} students...`);

    // Process each student
    for (const student of students) {
      const { usn, name, batch, section, scheme, dob, gender, discipline } = student;
      
      console.log(`\n--- Processing student: ${usn} ---`);
      console.log('  USN:', usn, '(type:', typeof usn, ')');
      console.log('  Name:', name, '(type:', typeof name, ')');
      console.log('  Batch:', batch, '(type:', typeof batch, ')');
      console.log('  Discipline:', discipline, '(type:', typeof discipline, ')');
      console.log('  Scheme:', scheme, '(type:', typeof scheme, ')');
      console.log('  Gender:', gender, '(type:', typeof gender, ')');
      console.log('  DOB:', dob, '(type:', typeof dob, ')');

      // Validate required fields (matching schema: usn, name, batch, discipline are NOT NULL)
      if (!usn || !name || !batch || !discipline) {
        results.failed++;
        results.details.push({
          usn: usn || 'Unknown',
          status: 'failed',
          reason: 'Missing required fields (usn, name, batch, or discipline)'
        });
        continue;
      }

      // Validate discipline enum
      if (!validDisciplines.includes(discipline)) {
        results.failed++;
        results.details.push({
          usn,
          status: 'failed',
          reason: `Invalid discipline "${discipline}". Must be "VTU" or "Autonomous"`
        });
        continue;
      }

      // Validate gender enum (optional field)
      if (gender && !validGenders.includes(gender)) {
        results.failed++;
        results.details.push({
          usn,
          status: 'failed',
          reason: `Invalid gender "${gender}". Must be "Male", "Female", or "Other"`
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

        // Insert student with all fields matching schema exactly
        const insertQuery = `
          INSERT INTO student_details 
          (usn, name, gender, batch, discipline, scheme, dob, section)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Convert DOB to MySQL format using utility function
        const formattedDob = convertDobToMySQLFormat(dob);
        if (dob && formattedDob) {
          console.log(`  📅 Converted DOB: ${dob} → ${formattedDob}`);
        }

        const insertValues = [
          usn.toUpperCase().trim(),   // VARCHAR(20) PRIMARY KEY
          name.trim(),                 // VARCHAR(100) NOT NULL
          gender || null,              // ENUM('Male', 'Female', 'Other')
          batch,                       // INT NOT NULL
          discipline,                  // ENUM('VTU', 'Autonomous') NOT NULL
          scheme || '22',              // VARCHAR(10) DEFAULT '22'
          formattedDob,                // DATE NULL
          section || null              // VARCHAR(5)
        ];

        console.log('  💾 Attempting INSERT with values:', insertValues);

        try {
          await mysqlPool.execute(insertQuery, insertValues);
          console.log('  ✅ INSERT successful for', usn);

          results.inserted++;
          results.details.push({
            usn,
            status: 'inserted',
            reason: 'Successfully added'
          });
        } catch (insertError) {
          console.error('  ❌ INSERT FAILED for', usn);
          console.error('  Error code:', insertError.code);
          console.error('  Error message:', insertError.message);
          console.error('  SQL State:', insertError.sqlState);
          console.error('  SQL Message:', insertError.sqlMessage);
          
          results.failed++;
          results.details.push({
            usn,
            status: 'failed',
            reason: `DB Error: ${insertError.code} - ${insertError.sqlMessage || insertError.message}`
          });
        }

      } catch (error) {
        console.error('  ❌ Outer error for', usn, ':', error.message);
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

    // Validation - matching schema requirements
    if (!subjectCode || !subjectName || !semester || !credits) {
      return res.status(400).json({
        success: false,
        message: 'Subject code, name, semester, and credits are required'
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

    // Insert subject - matching schema exactly: subject_code, subject_name, semester, scheme, credits, short_code
    const insertQuery = `
      INSERT INTO subjects 
      (subject_code, subject_name, semester, scheme, credits, short_code)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await mysqlPool.execute(insertQuery, [
      subjectCode.toUpperCase().trim(),  // VARCHAR(20) PRIMARY KEY
      subjectName.trim(),                // VARCHAR(255) NOT NULL
      semester,                          // INT NOT NULL
      scheme || '22',                    // VARCHAR(10) DEFAULT '22'
      credits,                           // INT NOT NULL
      null                               // VARCHAR(10) short_code (optional)
    ]);

    console.log(`✅ Added subject: ${subjectCode} - ${subjectName}`);

    res.status(201).json({
      success: true,
      message: 'Subject added successfully',
      data: { subjectCode, subjectName, semester, credits, scheme }
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
      const { subjectCode, subjectName, semester, credits, scheme, shortCode } = subject;

      // Validate required fields - matching schema
      if (!subjectCode || !subjectName || !semester || !credits) {
        results.failed++;
        results.details.push({
          subjectCode: subjectCode || 'Unknown',
          status: 'failed',
          reason: 'Missing required fields (subjectCode, subjectName, semester, credits)'
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

        // Insert subject - matching schema exactly
        const insertQuery = `
          INSERT INTO subjects 
          (subject_code, subject_name, semester, scheme, credits, short_code)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        await mysqlPool.execute(insertQuery, [
          subjectCode.toUpperCase().trim(),  // VARCHAR(20) PRIMARY KEY
          subjectName.trim(),                // VARCHAR(255) NOT NULL
          semester,                          // INT NOT NULL
          scheme || '22',                    // VARCHAR(10) DEFAULT '22'
          credits,                           // INT NOT NULL
          shortCode || null                  // VARCHAR(10) short_code (optional)
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
