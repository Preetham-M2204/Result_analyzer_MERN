const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// ===== ADMIN ONLY ROUTES =====
// GET /api/teachers - Get all teachers (admin)
router.get('/', requireRole('ADMIN'), teacherController.getAllTeachers);

// GET /api/teachers/subjects?batch=2023&semester=4 - Get subjects for batch/semester (admin)
router.get('/subjects', requireRole('ADMIN'), teacherController.getSubjectsByBatchSemester);

// GET /api/teachers/sections?batch=2023 - Get available sections (admin)
router.get('/sections', requireRole('ADMIN'), teacherController.getSections);

// GET /api/teachers/assignments - Get all teacher-subject assignments (admin)
router.get('/assignments', requireRole('ADMIN'), teacherController.getTeacherAssignments);

// POST /api/teachers/assign - Assign teacher to subjects (admin)
router.post('/assign', requireRole('ADMIN'), teacherController.assignTeacherToSubjects);

// DELETE /api/teachers/assignment - Delete teacher assignment (admin)
router.delete('/assignment', requireRole('ADMIN'), teacherController.deleteTeacherAssignment);

// POST /api/teachers/add-section - Add new section (admin)
router.post('/add-section', requireRole('ADMIN'), teacherController.addSection);

// ===== TEACHER DASHBOARD ROUTES =====
// GET /api/teachers/my-subjects?teacherId=T001 - Get teacher's assigned subjects
router.get('/my-subjects', requireRole('TEACHER'), teacherController.getTeacherSubjects);

// GET /api/teachers/subject-analysis?subjectCode=BCS306A&batch=2024&section=A - Get subject analysis
router.get('/subject-analysis', requireRole('TEACHER'), teacherController.getSubjectAnalysis);

// GET /api/teachers/subject-toppers?subjectCode=BCS306A&batch=2024&section=A&limit=10 - Get subject toppers
router.get('/subject-toppers', requireRole('TEACHER'), teacherController.getSubjectToppers);

// GET /api/teachers/failed-students?subjectCode=BCS306A&batch=2024&section=A - Get failed students list
router.get('/failed-students', requireRole('TEACHER'), teacherController.getFailedStudents);

// GET /api/teachers/all-results?subjectCode=BCS306A&batch=2024&section=A - Get all student results
router.get('/all-results', requireRole('TEACHER'), teacherController.getAllSubjectResults);

module.exports = router;
