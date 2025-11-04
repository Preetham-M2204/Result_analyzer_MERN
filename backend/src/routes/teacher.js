const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All routes require authentication and ADMIN role
router.use(verifyToken);
router.use(requireRole('ADMIN'));

// GET /api/teachers - Get all teachers
router.get('/', teacherController.getAllTeachers);

// GET /api/teachers/subjects?batch=2023&semester=4 - Get subjects for batch/semester
router.get('/subjects', teacherController.getSubjectsByBatchSemester);

// GET /api/teachers/sections?batch=2023 - Get available sections
router.get('/sections', teacherController.getSections);

// GET /api/teachers/assignments - Get all teacher-subject assignments
router.get('/assignments', teacherController.getTeacherAssignments);

// POST /api/teachers/assign - Assign teacher to subjects
router.post('/assign', teacherController.assignTeacherToSubjects);

// DELETE /api/teachers/assignment - Delete teacher assignment
router.delete('/assignment', teacherController.deleteTeacherAssignment);

// POST /api/teachers/add-section - Add new section
router.post('/add-section', teacherController.addSection);

module.exports = router;
