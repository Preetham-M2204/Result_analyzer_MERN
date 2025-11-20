/**
 * ADMIN DASHBOARD
 * ===============
 * Main admin dashboard component
 * Features:
 * - System statistics overview
 * - User management (CRUD)
 * - Scraper control panel
 * - Analytics charts
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { 
  getAdminStats, 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  resetUserPassword,
  addStudent,
  bulkImportStudents,
  addSubject,
  bulkImportSubjects
} from '../api/admin';
import { 
  startVTUScraper,
  startAutonomousScraper,
  startRVScraper,
  getScraperProgress,
  stopScraper,
  retryFailedUSNs
} from '../api/scraper';
import { 
  getAllTeachers,
  getSubjectsByBatchSemester,
  getSections,
  assignTeacherToSubjects,
  getTeacherAssignments,
  deleteTeacherAssignment
} from '../api/teacher';
import type { Teacher, Subject, TeacherAssignment } from '../api/teacher';
import '../styles/AdminDashboard.css';

interface SystemStats {
  users: {
    students: number;
    teachers: number;
    hods: number;
    admins: number;
    total: number;
  };
  database: {
    studentDetails: number;
    subjects: number;
    results: number;
    batches: number;
    batchList: string[];
  };
  performance: {
    avgCGPA: string | null;
    studentsWithBacklogs: number;
  };
}

interface UserData {
  _id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'HOD' | 'TEACHER' | 'STUDENT';
  usn?: string;
  teacherId?: string;
  hodId?: string;
  adminId?: string;
  mustChangePassword: boolean;
  createdAt: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [activeView, setActiveView] = useState<'overview' | 'users' | 'scraper' | 'students' | 'subjects' | 'teachers'>('overview');
  
  // Scraper state
  const [scraperType, setScraperType] = useState<'vtu' | 'autonomous' | 'rv'>('vtu');
  const [scrapingMode, setScrapingMode] = useState<'single' | 'batch'>('single');
  const [vtuUrl, setVtuUrl] = useState('');
  const [autonomousUrl, setAutonomousUrl] = useState('https://ioncudos.in/bit_online_results/');
  const [singleUsn, setSingleUsn] = useState('');
  const [batchYear, setBatchYear] = useState('2023');
  const [workers, setWorkers] = useState('20');
  const [semester, setSemester] = useState('4');
  
  // Scraper progress state
  const [scraperSessionId, setScraperSessionId] = useState<string | null>(null);
  const [scraperProgress, setScraperProgress] = useState<any>(null);
  const [isScraping, setIsScraping] = useState(false);
  
  // User form state
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT' as 'ADMIN' | 'HOD' | 'TEACHER' | 'STUDENT',
    usn: ''
  });

  // Student form state
  const [studentFormData, setStudentFormData] = useState({
    usn: '',
    name: '',
    batch: '2024',
    section: 'A',
    scheme: '22',
    dob: ''
  });

  // Subject form state
  const [subjectFormData, setSubjectFormData] = useState({
    subjectCode: '',
    subjectName: '',
    semester: '1',
    credits: '4',
    scheme: '22',
    isPlaceholder: 'no'
  });

  // Teacher assignment state
  const [teacherAssignmentData, setTeacherAssignmentData] = useState({
    selectedBatch: '',
    selectedSemester: '',
    selectedSection: '',
    selectedTeacher: '',
    selectedSubjects: [] as string[]
  });
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // Fetch system stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch users when view or filters change
  useEffect(() => {
    if (activeView === 'users') {
      fetchUsers();
    }
  }, [activeView, pagination.page, selectedRole]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await getAdminStats();
      if (response.success) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await getAllUsers(selectedRole, pagination.page, pagination.limit);
      if (response.success) {
        setUsers(response.users);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCreateUser = async () => {
    try {
      const response = await createUser(userFormData);
      if (response.success) {
        alert('User created successfully!');
        setShowUserForm(false);
        resetUserForm();
        fetchUsers();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const response = await updateUser(editingUser._id, {
        name: userFormData.name,
        email: userFormData.email,
        role: userFormData.role,
        mustChangePassword: false
      });

      if (response.success) {
        alert('User updated successfully!');
        setShowUserForm(false);
        setEditingUser(null);
        resetUserForm();
        fetchUsers();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}?`)) return;

    try {
      const response = await deleteUser(userId);
      if (response.success) {
        alert('User deleted successfully!');
        fetchUsers();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    const newPassword = prompt(`Enter new password for ${userName}:`);
    if (!newPassword) return;

    try {
      const response = await resetUserPassword(userId, newPassword);
      if (response.success) {
        alert('Password reset successfully!');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const openCreateForm = () => {
    resetUserForm();
    setEditingUser(null);
    setShowUserForm(true);
  };

  const openEditForm = (user: UserData) => {
    setUserFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      usn: user.usn || ''
    });
    setEditingUser(user);
    setShowUserForm(true);
  };

  const resetUserForm = () => {
    setUserFormData({
      name: '',
      email: '',
      password: '',
      role: 'STUDENT',
      usn: ''
    });
  };

  // Student Management Handlers
  const handleAddStudent = async () => {
    try {
      const response = await addStudent({
        usn: studentFormData.usn,
        name: studentFormData.name,
        batch: parseInt(studentFormData.batch),
        section: studentFormData.section,
        scheme: studentFormData.scheme,
        dob: studentFormData.dob || undefined
      });

      if (response.success) {
        alert(`✅ Student added successfully: ${studentFormData.usn}`);
        setStudentFormData({
          usn: '',
          name: '',
          batch: '2024',
          section: 'A',
          scheme: '22',
          dob: ''
        });
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add student');
    }
  };

  const handleBulkImportStudents = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Read the Excel file
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Get first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          console.log('📊 Parsed Excel data (first row):', jsonData[0]);
          console.log('📊 Available columns:', Object.keys(jsonData[0] || {}));
          
          // Map Excel columns to our format (including required discipline field)
          const students = jsonData.map((row: any) => {
            const usn = String(row.USN || row.usn || row.Usn || '').trim().toUpperCase();
            const name = String(row.Name || row.name || row.NAME || '').trim();
            const batch = parseInt(String(row.Batch || row.batch || row.BATCH || '2024'));
            const discipline = String(row.Discipline || row.discipline || row.DISCIPLINE || 'Autonomous').trim();
            
            // Handle scheme - convert "2022" to "22", "2021" to "21", or keep as is
            let schemeRaw = String(row.Scheme || row.scheme || row.SCHEME || '22').trim();
            const scheme = schemeRaw.length === 4 ? schemeRaw.slice(-2) : schemeRaw; // "2022" -> "22"
            
            const section = String(row.Section || row.section || row.SECTION || '').trim() || null;
            const gender = String(row.Gender || row.gender || row.GENDER || '').trim() || null;
            
            // Handle DOB - already handled, just extract the value
            const dob = row.DOB || row.dob || row.Dob || null;
            
            return { usn, name, batch, discipline, scheme, section, gender, dob };
          }).filter(s => s.usn && s.name); // Only require USN and Name
          
          console.log(`📋 Importing ${students.length} students...`);
          console.log('📋 Sample student (first):', students[0]);
          console.log('📋 Sample student (last):', students[students.length - 1]);
          console.log('📋 FULL ARRAY (first 5):', JSON.stringify(students.slice(0, 5), null, 2));
          console.log('📋 Array data types check:', {
            usn: typeof students[0]?.usn,
            name: typeof students[0]?.name,
            batch: typeof students[0]?.batch,
            discipline: typeof students[0]?.discipline,
            scheme: typeof students[0]?.scheme,
            section: typeof students[0]?.section,
            gender: typeof students[0]?.gender,
            dob: typeof students[0]?.dob
          });
          
          if (students.length === 0) {
            alert('❌ No valid students found in Excel file. Check that you have USN and Name columns with data.');
            return;
          }
          
          // Send to backend
          console.log('🚀 Sending to backend API...');
          const response = await bulkImportStudents(students);
          
          if (response.success) {
            const { inserted, skipped, failed } = response.data;
            alert(`✅ Import Complete!\n\n` +
                  `✓ Added: ${inserted}\n` +
                  `⊘ Skipped: ${skipped}\n` +
                  `✗ Failed: ${failed}\n\n` +
                  `Check console for details.`);
            console.log('📊 Import Details:', response.data.details);
          }
        } catch (error: any) {
          console.error('Excel parsing error:', error);
          alert(error.response?.data?.message || 'Failed to parse Excel file. Check format.');
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('File read error:', error);
      alert('Failed to read Excel file');
    }
  };

  // Subject Management Handlers
  const handleAddSubject = async () => {
    try {
      const response = await addSubject({
        subjectCode: subjectFormData.subjectCode,
        subjectName: subjectFormData.subjectName,
        semester: parseInt(subjectFormData.semester),
        credits: parseInt(subjectFormData.credits),
        scheme: subjectFormData.scheme,
        isPlaceholder: subjectFormData.isPlaceholder
      });

      if (response.success) {
        alert(`✅ Subject added successfully: ${subjectFormData.subjectCode}`);
        setSubjectFormData({
          subjectCode: '',
          subjectName: '',
          semester: '1',
          credits: '4',
          scheme: '22',
          isPlaceholder: 'no'
        });
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add subject');
    }
  };

  const handleBulkImportSubjects = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Read the Excel file
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Get first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          console.log('� Parsed Excel data:', jsonData);
          
          // Map Excel columns to our format (handle both formats)
          const subjects = jsonData.map((row: any) => ({
            subjectCode: String(row.Subject_Code || row['Subject Code'] || row.subjectCode || '').trim().toUpperCase(),
            subjectName: String(row.Subject_Name || row['Subject Name'] || row.subjectName || '').trim(),
            semester: parseInt(String(row.Semester || row.semester || '1')),
            credits: parseInt(String(row.Credits || row.credits || '4')),
            scheme: String(row.Scheme || row.scheme || '22').trim(),
            isPlaceholder: String(row.Is_Placeholder || row['Is Placeholder'] || row.isPlaceholder || 'no').toLowerCase()
          })).filter(s => s.subjectCode && s.subjectName); // Filter out empty rows
          
          console.log(`📋 Importing ${subjects.length} subjects...`);
          
          if (subjects.length === 0) {
            alert('❌ No valid subjects found in Excel file. Check column names: Subject_Code, Subject_Name, Semester, Credits, Scheme, Is_Placeholder');
            return;
          }
          
          // Send to backend
          const response = await bulkImportSubjects(subjects);
          
          if (response.success) {
            const { inserted, skipped, failed } = response.data;
            alert(`✅ Import Complete!\n\n` +
                  `✓ Added: ${inserted}\n` +
                  `⊘ Skipped: ${skipped}\n` +
                  `✗ Failed: ${failed}\n\n` +
                  `Check console for details.`);
            console.log('📊 Import Details:', response.data.details);
          }
        } catch (error: any) {
          console.error('Excel parsing error:', error);
          alert(error.response?.data?.message || 'Failed to parse Excel file. Check format.');
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('File read error:', error);
      alert('Failed to read Excel file');
    }
  };

  // ============================================================
  // TEACHER ASSIGNMENT HANDLERS
  // ============================================================

  // Load teachers when teacher view is activated
  useEffect(() => {
    if (activeView === 'teachers') {
      fetchTeachers();
      fetchTeacherAssignments();
    }
  }, [activeView]);

  // Load subjects when batch and semester are selected
  useEffect(() => {
    if (teacherAssignmentData.selectedBatch && teacherAssignmentData.selectedSemester) {
      fetchSubjectsForBatchSemester(
        parseInt(teacherAssignmentData.selectedBatch),
        parseInt(teacherAssignmentData.selectedSemester)
      );
    }
  }, [teacherAssignmentData.selectedBatch, teacherAssignmentData.selectedSemester]);

  // Load sections when batch is selected
  useEffect(() => {
    if (teacherAssignmentData.selectedBatch) {
      fetchSectionsForBatch(parseInt(teacherAssignmentData.selectedBatch));
    }
  }, [teacherAssignmentData.selectedBatch]);

  const fetchTeachers = async () => {
    try {
      setLoadingTeachers(true);
      const data = await getAllTeachers();
      setTeachers(data);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
      alert('Failed to load teachers');
    } finally {
      setLoadingTeachers(false);
    }
  };

  const fetchSubjectsForBatchSemester = async (batch: number, semester: number) => {
    try {
      const data = await getSubjectsByBatchSemester(batch, semester);
      setAvailableSubjects(data);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      alert('Failed to load subjects for selected batch/semester');
    }
  };

  const fetchSectionsForBatch = async (batch: number) => {
    try {
      const data = await getSections(batch);
      setAvailableSections(data.map(s => s.section));
    } catch (error) {
      console.error('Failed to fetch sections:', error);
      alert('Failed to load sections for selected batch');
    }
  };

  const fetchTeacherAssignments = async () => {
    try {
      const data = await getTeacherAssignments();
      setTeacherAssignments(data);
    } catch (error) {
      console.error('Failed to fetch teacher assignments:', error);
      alert('Failed to load teacher assignments');
    }
  };

  const handleAssignTeacher = async () => {
    const { selectedTeacher, selectedSubjects, selectedBatch, selectedSection } = teacherAssignmentData;

    if (!selectedTeacher || selectedSubjects.length === 0 || !selectedBatch || !selectedSection) {
      alert('Please select teacher, subjects, batch, and section');
      return;
    }

    try {
      await assignTeacherToSubjects({
        teacherId: selectedTeacher,
        subjectCodes: selectedSubjects,
        batch: parseInt(selectedBatch),
        section: selectedSection
      });

      alert('Teacher assigned successfully');
      
      // Reset form
      setTeacherAssignmentData({
        ...teacherAssignmentData,
        selectedTeacher: '',
        selectedSubjects: []
      });

      // Refresh assignments
      fetchTeacherAssignments();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to assign teacher');
    }
  };

  const handleDeleteAssignment = async (
    teacherId: string,
    batch: number,
    section: string,
    subjectCode: string
  ) => {
    if (!confirm(`Delete assignment for subject ${subjectCode}?`)) {
      return;
    }

    try {
      await deleteTeacherAssignment(teacherId, batch, section, subjectCode);
      alert('Assignment deleted successfully');
      fetchTeacherAssignments();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete assignment');
    }
  };

  // Scraper handlers
  const handleStartVTUScraper = async () => {
    try {
      if (!vtuUrl.trim()) {
        alert('❌ Please enter VTU results URL');
        return;
      }
      if (!semester.trim()) {
        alert('❌ Please enter semester');
        return;
      }
      if (scrapingMode === 'single' && !singleUsn.trim()) {
        alert('❌ Please enter USN for single mode');
        return;
      }
      if (scrapingMode === 'batch' && !batchYear.trim()) {
        alert('❌ Please enter batch year for batch mode');
        return;
      }

      const scraperData: any = {
        url: vtuUrl.trim(),
        mode: scrapingMode,
        semester: semester.trim(),
        workers: parseInt(workers) || 20
      };

      if (scrapingMode === 'single') {
        scraperData.usn = singleUsn.trim().toUpperCase();
      } else {
        scraperData.batchYear = parseInt(batchYear.trim());
      }

      setIsScraping(true);
      const response = await startVTUScraper(scraperData);
      
      if (response.success) {
        setScraperSessionId(response.data.sessionId);
        const detectedScheme = response.data.scheme || (parseInt(batchYear) <= 2021 ? '21' : '22');
        alert(`✅ VTU Scraper started!\nSession ID: ${response.data.sessionId}\nTotal USNs: ${response.data.totalUSNs}\nScheme: ${detectedScheme} (auto-detected)`);
      }
    } catch (error: any) {
      console.error('VTU scraper error:', error);
      alert(error.response?.data?.message || 'Failed to start VTU scraper');
      setIsScraping(false);
    }
  };

  const handleStartAutonomousScraper = async () => {
    try {
      if (!autonomousUrl.trim()) {
        alert('❌ Please enter Autonomous results URL');
        return;
      }
      if (scrapingMode === 'single' && !singleUsn.trim()) {
        alert('❌ Please enter USN for single mode');
        return;
      }
      if (scrapingMode === 'batch' && !batchYear.trim()) {
        alert('❌ Please enter batch year for batch mode');
        return;
      }

      const scraperData: any = {
        url: autonomousUrl.trim(),
        mode: scrapingMode,
        workers: parseInt(workers) || 20
      };

      if (scrapingMode === 'single') {
        scraperData.usn = singleUsn.trim().toUpperCase();
      } else {
        scraperData.batchYear = batchYear.trim();
      }

      setIsScraping(true);
      const response = await startAutonomousScraper(scraperData);
      
      if (response.success) {
        setScraperSessionId(response.data.sessionId);
        alert(`✅ Autonomous Scraper started!\nSession ID: ${response.data.sessionId}\nTotal USNs: ${response.data.totalUSNs}`);
      }
    } catch (error: any) {
      console.error('Autonomous scraper error:', error);
      alert(error.response?.data?.message || 'Failed to start Autonomous scraper');
      setIsScraping(false);
    }
  };

  const handleStartRVScraper = async () => {
    try {
      if (!vtuUrl.trim()) {
        alert('❌ Please enter RV results URL');
        return;
      }
      if (!semester.trim()) {
        alert('❌ Please enter semester number');
        return;
      }
      if (!singleUsn.trim()) {
        alert('❌ Please enter USN (single mode) or upload Excel file (import mode)');
        return;
      }

      const scraperData: any = {
        url: vtuUrl.trim(),
        semester: parseInt(semester),
        mode: 'single', // Always use single mode for RV (we send USN list)
        workers: parseInt(workers) || 20
      };

      // For both single and batch (Excel import), we send USN list
      // In single mode: one USN
      // In batch mode: comma-separated USNs from Excel
      scraperData.usn = singleUsn.trim().toUpperCase();

      setIsScraping(true);
      const response = await startRVScraper(scraperData);
      
      if (response.success) {
        setScraperSessionId(response.sessionId);
        const usnCount = singleUsn.split(',').length;
        alert(`✅ RV Scraper started!\nSession ID: ${response.sessionId}\nTotal USNs: ${usnCount}`);
      }
    } catch (error: any) {
      console.error('RV scraper error:', error);
      alert(error.response?.data?.message || 'Failed to start RV scraper');
      setIsScraping(false);
    }
  };

  const handleStopScraper = async () => {
    try {
      if (!scraperSessionId) {
        alert('❌ No active scraper session');
        return;
      }

      await stopScraper(scraperSessionId);
      setIsScraping(false);
      setScraperSessionId(null);
      alert('🛑 Scraper stopped');
    } catch (error: any) {
      console.error('Stop scraper error:', error);
      alert(error.response?.data?.message || 'Failed to stop scraper');
    }
  };

  const handleRetryFailedUSNs = async () => {
    try {
      if (!scraperSessionId) {
        alert('❌ No session to retry');
        return;
      }

      if (!scraperProgress?.failures || scraperProgress.failures.length === 0) {
        alert('✅ No failed USNs to retry');
        return;
      }

      const confirmed = confirm(`🔄 Retry scraping ${scraperProgress.failures.length} failed USNs?`);
      if (!confirmed) return;

      // Get retry parameters based on scraper type
      const retryParams: any = {};
      if (scraperProgress.type === 'vtu') {
        retryParams.url = vtuUrl;
        retryParams.semester = parseInt(semester);
        retryParams.workers = parseInt(workers);
        // Scheme will be auto-detected from batch in backend
      } else if (scraperProgress.type === 'autonomous') {
        retryParams.url = autonomousUrl;
        retryParams.workers = parseInt(workers);
      }

      const response = await retryFailedUSNs(scraperSessionId, retryParams);
      
      if (response.success) {
        // Start polling for new retry session
        setScraperSessionId(response.data.sessionId);
        setIsScraping(true);
        setScraperProgress(null); // Clear old progress
        alert(`✅ Retry started! Session: ${response.data.sessionId}`);
      }
    } catch (error: any) {
      console.error('Retry failed USNs error:', error);
      alert(error.response?.data?.message || 'Failed to retry scraper');
    }
  };

  // Poll scraper progress
  useEffect(() => {
    let interval: number;

    if (scraperSessionId && isScraping) {
      interval = setInterval(async () => {
        try {
          const response = await getScraperProgress(scraperSessionId);
          setScraperProgress(response.data);

          // Stop polling if scraper is no longer running
          if (response.data.status !== 'running') {
            setIsScraping(false);
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Progress fetch error:', error);
        }
      }, 500); // Poll every 0.5 seconds for real-time updates
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scraperSessionId, isScraping]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner-large"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>Admin Dashboard</h1>
            <p className="header-subtitle">System Management & Analytics</p>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="dashboard-nav">
        <button 
          className={`nav-btn ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`nav-btn ${activeView === 'scraper' ? 'active' : ''}`}
          onClick={() => setActiveView('scraper')}
        >
          🚀 Scraper
        </button>
        <button 
          className={`nav-btn ${activeView === 'students' ? 'active' : ''}`}
          onClick={() => setActiveView('students')}
        >
          👨‍🎓 Students
        </button>
        <button 
          className={`nav-btn ${activeView === 'subjects' ? 'active' : ''}`}
          onClick={() => setActiveView('subjects')}
        >
          📚 Subjects
        </button>
        <button 
          className={`nav-btn ${activeView === 'teachers' ? 'active' : ''}`}
          onClick={() => setActiveView('teachers')}
        >
          👨‍🏫 Teachers
        </button>
        <button 
          className={`nav-btn ${activeView === 'users' ? 'active' : ''}`}
          onClick={() => setActiveView('users')}
        >
          👥 User Management
        </button>
      </div>

      {/* Overview Section */}
      {activeView === 'overview' && stats && (
        <>
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="card">
              <h3>Total Users</h3>
              <div className="card-value">{stats.users.total}</div>
              <p className="card-label">Registered in system</p>
            </div>
            <div className="card">
              <h3>Students</h3>
              <div className="card-value">{stats.database.studentDetails}</div>
              <p className="card-label">In database</p>
            </div>
            <div className="card">
              <h3>Subjects</h3>
              <div className="card-value">{stats.database.subjects}</div>
              <p className="card-label">Available courses</p>
            </div>
            <div className="card">
              <h3>Average CGPA</h3>
              <div className="card-value">{stats.performance.avgCGPA || 'N/A'}</div>
              <p className="card-label">Overall performance</p>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="stats-section">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>User Breakdown</h3>
                <div className="stat-rows">
                  <div className="stat-row">
                    <span className="stat-label">Students:</span>
                    <span className="stat-value">{stats.users.students}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Teachers:</span>
                    <span className="stat-value">{stats.users.teachers}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">HODs:</span>
                    <span className="stat-value">{stats.users.hods}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Admins:</span>
                    <span className="stat-value">{stats.users.admins}</span>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <h3>Database Statistics</h3>
                <div className="stat-rows">
                  <div className="stat-row">
                    <span className="stat-label">Total Results:</span>
                    <span className="stat-value">{stats.database.results}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Batches:</span>
                    <span className="stat-value">{stats.database.batches}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Students w/ Backlogs:</span>
                    <span className="stat-value backlogs-count">
                      {stats.performance.studentsWithBacklogs}
                    </span>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <h3>Active Batches</h3>
                <div className="batch-list">
                  {stats.database.batchList.map((batch) => (
                    <span key={batch} className="batch-tag">{batch}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* User Management Section */}
      {activeView === 'users' && (
        <div className="users-section">
          <div className="users-header">
            <div className="users-filters">
              <label>Filter by Role:</label>
              <select 
                value={selectedRole} 
                onChange={(e) => setSelectedRole(e.target.value)}
                className="role-filter"
              >
                <option value="">All Roles</option>
                <option value="STUDENT">Students</option>
                <option value="TEACHER">Teachers</option>
                <option value="HOD">HODs</option>
                <option value="ADMIN">Admins</option>
              </select>
            </div>
            <button onClick={openCreateForm} className="create-user-btn">
              + Create User
            </button>
          </div>

          {/* Users Table */}
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>ID/USN</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="user-name">{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${user.role.toLowerCase()}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.usn || user.teacherId || user.hodId || user.adminId || '-'}</td>
                    <td>
                      {user.mustChangePassword ? (
                        <span className="status-badge warning">Must Change Password</span>
                      ) : (
                        <span className="status-badge active">Active</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          onClick={() => openEditForm(user)} 
                          className="action-btn edit"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleResetPassword(user._id, user.name)} 
                          className="action-btn reset"
                        >
                          Reset Password
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user._id, user.name)} 
                          className="action-btn delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button 
              onClick={() => setPagination({...pagination, page: pagination.page - 1})}
              disabled={pagination.page === 1}
              className="page-btn"
            >
              Previous
            </button>
            <span className="page-info">
              Page {pagination.page} of {pagination.pages} ({pagination.total} total users)
            </span>
            <button 
              onClick={() => setPagination({...pagination, page: pagination.page + 1})}
              disabled={pagination.page === pagination.pages}
              className="page-btn"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Scraper Control Section */}
      {activeView === 'scraper' && (
        <div className="scraper-section">
          <h2>🔍 Scraper Control Panel</h2>
          
          {/* Scraper Type Selector */}
          <div className="scraper-type-selector">
            <button 
              className={`type-btn ${scraperType === 'vtu' ? 'active' : ''}`}
              onClick={() => setScraperType('vtu')}
            >
              🎓 VTU Results
            </button>
            {/* <button 
              className={`type-btn ${scraperType === 'autonomous' ? 'active' : ''}`}
              onClick={() => setScraperType('autonomous')}
            >
              🏫 Autonomous Results
            </button> */}
            <button 
              className={`type-btn ${scraperType === 'rv' ? 'active' : ''}`}
              onClick={() => setScraperType('rv')}
            >
              📝 RV (Revaluation) Results
            </button>
          </div>

          {/* VTU Scraper Form */}
          {scraperType === 'vtu' && (
            <div className="scraper-card">
              <h3>🎓 VTU Official Results Scraper</h3>
              <p>Scrapes from VTU official website - Auto-detects semester from subject codes</p>
              
              <div className="scraper-form">
                <label>🔗 VTU Results URL (Required):</label>
                <input 
                  type="text" 
                  value={vtuUrl}
                  onChange={(e) => setVtuUrl(e.target.value)}
                  placeholder="https://results.vtu.ac.in/..." 
                  className="scraper-input"
                />
                
                <label>📋 Scraping Mode:</label>
                <div className="mode-selector">
                  <button 
                    className={`mode-btn ${scrapingMode === 'single' ? 'active' : ''}`}
                    onClick={() => setScrapingMode('single')}
                  >
                    Single USN
                  </button>
                  <button 
                    className={`mode-btn ${scrapingMode === 'batch' ? 'active' : ''}`}
                    onClick={() => setScrapingMode('batch')}
                  >
                    Batch Year
                  </button>
                </div>

                {scrapingMode === 'single' && (
                  <>
                    <label>🎯 Enter USN:</label>
                    <input 
                      type="text" 
                      value={singleUsn}
                      onChange={(e) => setSingleUsn(e.target.value)}
                      placeholder="e.g., 1BI23IS001" 
                      className="scraper-input" 
                    />
                  </>
                )}

                {scrapingMode === 'batch' && (
                  <>
                    <label>📅 Select Batch Year:</label>
                    <select 
                      className="scraper-select"
                      value={batchYear}
                      onChange={(e) => setBatchYear(e.target.value)}
                    >
                      <option value="">Select Year</option>
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                      <option value="2022">2022</option>
                      <option value="2021">2021</option>
                      <option value="2020">2020</option>
                    </select>
                  </>
                )}
                
                <label>📚 Semester:</label>
                <input 
                  type="text" 
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="e.g., 4" 
                  className="scraper-input" 
                />
                
                <label>⚙️ Number of Workers (threads):</label>
                <input 
                  type="number" 
                  value={workers}
                  onChange={(e) => setWorkers(e.target.value)}
                  placeholder="20" 
                  min="1"
                  max="50"
                  className="scraper-input" 
                />
                
                <button 
                  className="scraper-btn" 
                  onClick={handleStartVTUScraper}
                  disabled={isScraping || !vtuUrl || !semester || (scrapingMode === 'single' && !singleUsn) || (scrapingMode === 'batch' && !batchYear)}
                >
                  {isScraping ? 'Scraping...' : 'Start VTU Scraper'}
                </button>

                <div className="info-box" style={{ marginTop: '16px' }}>
                  <p><strong>How it works:</strong></p>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li><strong>Single USN:</strong> Scrapes results for one student</li>
                    <li><strong>Batch Year:</strong> Scrapes all students from database matching that year</li>
                    <li>Scheme auto-detected: 2021 batch = 21 scheme, 2022+ = 22 scheme</li>
                    <li>Auto-detects semester from subject codes</li>
                    <li>Multi-threaded for faster scraping</li>
                    <li>CAPTCHA solving with Tesseract OCR</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Autonomous Scraper Form - COMMENTED OUT */}
          {/* {scraperType === 'autonomous' && (
            <div className="scraper-card">
              <h3>🏫 Autonomous College Results Scraper</h3>
              <p>Scrapes from ioncudos.in - Requires USN + DOB from database</p>
              
              <div className="scraper-form">
                <label>🔗 Autonomous Results URL (Fixed):</label>
                <input 
                  type="text" 
                  value={autonomousUrl}
                  onChange={(e) => setAutonomousUrl(e.target.value)}
                  placeholder="https://ioncudos.in/..." 
                  className="scraper-input"
                />
                
                <label>📋 Scraping Mode:</label>
                <div className="mode-selector">
                  <button 
                    className={`mode-btn ${scrapingMode === 'single' ? 'active' : ''}`}
                    onClick={() => setScrapingMode('single')}
                  >
                    Single USN
                  </button>
                  <button 
                    className={`mode-btn ${scrapingMode === 'batch' ? 'active' : ''}`}
                    onClick={() => setScrapingMode('batch')}
                  >
                    Batch Year
                  </button>
                </div>

                {scrapingMode === 'single' && (
                  <>
                    <label>🎯 Enter USN:</label>
                    <input 
                      type="text" 
                      value={singleUsn}
                      onChange={(e) => setSingleUsn(e.target.value)}
                      placeholder="e.g., 1BI23IS001" 
                      className="scraper-input" 
                    />
                  </>
                )}

                {scrapingMode === 'batch' && (
                  <>
                    <label>📅 Select Batch Year:</label>
                    <select 
                      className="scraper-select"
                      value={batchYear}
                      onChange={(e) => setBatchYear(e.target.value)}
                    >
                      <option value="">Select Year</option>
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                      <option value="2022">2022</option>
                      <option value="2021">2021</option>
                      <option value="2020">2020</option>
                    </select>
                  </>
                )}
                
                <label>⚙️ Number of Workers (threads):</label>
                <input 
                  type="number" 
                  value={workers}
                  onChange={(e) => setWorkers(e.target.value)}
                  placeholder="20" 
                  min="1"
                  max="50"
                  className="scraper-input" 
                />
                
                <button 
                  className="scraper-btn" 
                  onClick={handleStartAutonomousScraper}
                  disabled={isScraping || !autonomousUrl || (scrapingMode === 'single' && !singleUsn) || (scrapingMode === 'batch' && !batchYear)}
                >
                  {isScraping ? 'Scraping...' : 'Start Autonomous Scraper'}
                </button>

                <div className="info-box" style={{ marginTop: '16px', backgroundColor: '#fff3e0', borderLeft: '4px solid #ff9800' }}>
                  <p><strong>Important:</strong></p>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li><strong>Single USN:</strong> Fetches DOB from database, scrapes that student</li>
                    <li><strong>Batch Year:</strong> Fetches all USNs + DOBs from database for that year</li>
                    <li>🔐 DOB must exist in student_details table</li>
                    <li>🌐 Uses Selenium for browser automation</li>
                    <li>⏱️ Slower than VTU scraper (headless browser required)</li>
                  </ul>
                </div>
              </div>
            </div>
          )} */}

          {/* RV Scraper Form */}
          {scraperType === 'rv' && (
            <div className="scraper-card">
              <h3>📝 RV (Revaluation) Results Scraper</h3>
              <p>Scrapes revaluation results - Only a few students apply for RV, so import USN list via Excel</p>
              
              <div className="scraper-form">
                <label>🔗 RV Results URL (Required):</label>
                <input 
                  type="text" 
                  value={vtuUrl}
                  onChange={(e) => setVtuUrl(e.target.value)}
                  placeholder="https://results.vtu.ac.in/..." 
                  className="scraper-input"
                />

                <label>📚 Semester Number:</label>
                <input 
                  type="number" 
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="e.g., 4" 
                  min="1"
                  max="8"
                  className="scraper-input" 
                />
                
                <label>📋 Scraping Mode:</label>
                <div className="mode-selector">
                  <button 
                    className={`mode-btn ${scrapingMode === 'single' ? 'active' : ''}`}
                    onClick={() => setScrapingMode('single')}
                  >
                    Single USN
                  </button>
                  <button 
                    className={`mode-btn ${scrapingMode === 'batch' ? 'active' : ''}`}
                    onClick={() => setScrapingMode('batch')}
                  >
                    📄 Import Excel
                  </button>
                </div>

                {scrapingMode === 'single' && (
                  <>
                    <label>🎯 Enter USN:</label>
                    <input 
                      type="text" 
                      value={singleUsn}
                      onChange={(e) => setSingleUsn(e.target.value)}
                      placeholder="e.g., 1BI23IS001" 
                      className="scraper-input" 
                    />
                  </>
                )}

                {scrapingMode === 'batch' && (
                  <>
                    <label>� Upload Excel File with USN List:</label>
                    <input 
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            try {
                              const workbook = XLSX.read(evt.target?.result, { type: 'binary' });
                              const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                              const data: any[] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                              
                              // Extract USNs from first column (skip header if exists)
                              const usns: string[] = [];
                              data.forEach((row: any[], index) => {
                                if (index === 0 && typeof row[0] === 'string' && row[0].toLowerCase().includes('usn')) {
                                  return; // Skip header row
                                }
                                if (row[0] && typeof row[0] === 'string') {
                                  const usn = row[0].toString().trim().toUpperCase();
                                  if (usn.length > 0) {
                                    usns.push(usn);
                                  }
                                }
                              });
                              
                              if (usns.length === 0) {
                                alert('❌ No USNs found in Excel file. Make sure USNs are in the first column.');
                                return;
                              }
                              
                              // Store USNs in state (we'll use singleUsn to store the list)
                              setSingleUsn(usns.join(','));
                              alert(`✅ Loaded ${usns.length} USNs from Excel file:\n${usns.slice(0, 5).join(', ')}${usns.length > 5 ? '...' : ''}`);
                            } catch (error) {
                              console.error('Excel parsing error:', error);
                              alert('❌ Failed to parse Excel file. Make sure it\'s a valid .xlsx or .xls file.');
                            }
                          };
                          reader.readAsBinaryString(file);
                        }
                      }}
                      className="scraper-input"
                      style={{ padding: '8px' }}
                    />
                    <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                      📋 Excel format: First column should contain USNs (e.g., 1BI23IS001, 1BI23IS002...)
                    </small>
                    {singleUsn && scrapingMode === 'batch' && (
                      <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                        <strong>📊 Loaded USNs:</strong> {singleUsn.split(',').length} students
                      </div>
                    )}
                  </>
                )}
                
                <label>⚙️ Number of Workers (threads):</label>
                <input 
                  type="number" 
                  value={workers}
                  onChange={(e) => setWorkers(e.target.value)}
                  placeholder="20" 
                  min="1"
                  max="50"
                  className="scraper-input" 
                />
                
                <button 
                  className="scraper-btn" 
                  onClick={handleStartRVScraper}
                  disabled={isScraping || !vtuUrl || !semester || !singleUsn}
                >
                  {isScraping ? 'Scraping...' : 'Start RV Scraper'}
                </button>

                <div className="info-box" style={{ marginTop: '16px', backgroundColor: '#e8f5e9', borderLeft: '4px solid #4caf50' }}>
                  <p><strong>⚠️ RV Scraper - Excel Import Mode:</strong></p>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li><strong>Why Excel?</strong> Only a few students (5-15) apply for RV, not the entire batch</li>
                    <li><strong>Excel format:</strong> First column = USNs (e.g., 1BI23IS001, 1BI23IS002...)</li>
                    <li><strong>Updates records:</strong> Does NOT create new attempts</li>
                    <li><strong>Revaluation:</strong> Same attempt_number, updates external marks</li>
                    <li><strong>Auto-recalculation:</strong> Clears grades → calculate_grades.py reassigns</li>
                    <li>📊 Auto-calculates SGPA/CGPA after completion</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Scraper Progress Card */}
          <div className="scraper-card" style={{ marginTop: '24px' }}>
            <h3>📊 Scraper Progress</h3>
            <div className="scraper-progress">
              {/* Loading State */}
              {isScraping && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div className="spinner" style={{
                    width: '60px',
                    height: '60px',
                    border: '6px solid #f3f3f3',
                    borderTop: '6px solid #2e7d32',
                    borderRadius: '50%',
                    margin: '0 auto 20px',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <p className="progress-status" style={{ fontSize: '18px', fontWeight: 'bold', color: '#2e7d32' }}>
                    🔄 Scraping in Progress...
                  </p>
                  <div className="progress-bar-container" style={{ marginTop: '20px' }}>
                    <div 
                      className="progress-bar" 
                      style={{ 
                        width: `${scraperProgress?.percentage || 0}%`,
                        backgroundColor: '#2e7d32',
                        transition: 'width 0.3s ease'
                      }}
                    ></div>
                  </div>
                  <p className="progress-text" style={{ marginTop: '10px', fontSize: '16px' }}>
                    {scraperProgress ? `${scraperProgress.processed} / ${scraperProgress.total} USNs processed (${scraperProgress.percentage}%)` : '0 / 0 USNs processed'}
                  </p>
                  <button 
                    className="scraper-btn" 
                    onClick={handleStopScraper}
                    style={{ backgroundColor: '#d32f2f', marginTop: '20px' }}
                  >
                    🛑 Stop Scraper
                  </button>
                </div>
              )}

              {/* Completed State */}
              {!isScraping && scraperProgress?.status === 'completed' && (
                <div>
                  <p className="progress-status" style={{ fontSize: '18px', fontWeight: 'bold', color: '#1b5e20' }}>
                    ✅ Scraping Completed!
                  </p>
                  <div className="progress-stats" style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                    <div className="stat-item" style={{ textAlign: 'center', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
                      <span className="stat-label" style={{ display: 'block', fontSize: '14px', color: '#666' }}>✅ Success</span>
                      <span className="stat-value" style={{ display: 'block', fontSize: '28px', fontWeight: 'bold', color: '#2e7d32' }}>{scraperProgress?.success || 0}</span>
                    </div>
                    <div className="stat-item" style={{ textAlign: 'center', padding: '15px', backgroundColor: '#ffebee', borderRadius: '8px' }}>
                      <span className="stat-label" style={{ display: 'block', fontSize: '14px', color: '#666' }}>❌ Failed</span>
                      <span className="stat-value" style={{ display: 'block', fontSize: '28px', fontWeight: 'bold', color: '#d32f2f' }}>{scraperProgress?.failed || 0}</span>
                    </div>
                    <div className="stat-item" style={{ textAlign: 'center', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                      <span className="stat-label" style={{ display: 'block', fontSize: '14px', color: '#666' }}>⏱️ Time</span>
                      <span className="stat-value" style={{ display: 'block', fontSize: '28px', fontWeight: 'bold', color: '#1976d2' }}>{scraperProgress?.timeTaken?.toFixed(1)}s</span>
                    </div>
                  </div>

                  {/* Failed USNs List */}
                  {scraperProgress?.failures && scraperProgress.failures.length > 0 && (
                    <div style={{ marginTop: '25px', padding: '20px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '2px solid #ff9800' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h4 style={{ margin: 0, color: '#e65100' }}>⚠️ Failed USNs ({scraperProgress.failures.length})</h4>
                        <button 
                          onClick={handleRetryFailedUSNs}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#ff9800',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f57c00')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ff9800')}
                        >
                          🔄 Retry Failed USNs
                        </button>
                      </div>
                      <div style={{ 
                        maxHeight: '300px', 
                        overflowY: 'auto', 
                        backgroundColor: '#fff', 
                        padding: '15px', 
                        borderRadius: '6px',
                        border: '1px solid #ffb74d'
                      }}>
                        <ul style={{ margin: 0, padding: '0 0 0 20px', listStyle: 'none' }}>
                          {scraperProgress.failures.map((usn: string, index: number) => (
                            <li key={index} style={{ 
                              padding: '8px 0', 
                              borderBottom: index < scraperProgress.failures.length - 1 ? '1px solid #ffe0b2' : 'none',
                              fontFamily: 'monospace',
                              fontSize: '14px',
                              color: '#d84315'
                            }}>
                              ❌ {usn}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p style={{ marginTop: '15px', fontSize: '13px', color: '#666' }}>
                        💡 <strong>Note:</strong> Click "Retry Failed USNs" to automatically re-scrape only the failed students.
                      </p>
                    </div>
                  )}

                  {/* Success Message if No Failures */}
                  {(!scraperProgress?.failures || scraperProgress.failures.length === 0) && (
                    <div style={{ marginTop: '25px', padding: '20px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '2px solid #4caf50', textAlign: 'center' }}>
                      <h4 style={{ margin: 0, color: '#2e7d32', fontSize: '18px' }}>🎉 Perfect! All USNs scraped successfully!</h4>
                    </div>
                  )}
                </div>
              )}

              {/* Idle State */}
              {!isScraping && (!scraperProgress || scraperProgress?.status !== 'completed') && (
                <p className="progress-status" style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '16px' }}>
                  ⏸️ Idle - Start a scraper to see progress
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Students Management Section */}
      {activeView === 'students' && (
        <div className="management-section">
          <h2>👨‍🎓 Student Management</h2>
          <div className="section-card">
            <h3>📤 Bulk Import Students from Excel</h3>
            <p>Upload an Excel file with columns: <strong>USN, Name, Batch, Discipline, Scheme</strong> (Optional: Section, Gender, DOB)</p>
            <p style={{ color: '#f44336', fontSize: '14px', marginTop: '8px' }}><strong>⚠️ Required:</strong> Discipline must be "VTU" or "Autonomous"</p>
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              className="file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleBulkImportStudents(file);
                e.target.value = ''; // Reset input
              }}
            />
            <div className="info-box" style={{ marginTop: '12px' }}>
              <p><strong>📋 Excel Format Example:</strong></p>
              <table style={{ fontSize: '12px', marginTop: '8px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '4px 8px', border: '1px solid #ddd' }}>USN</th>
                    <th style={{ padding: '4px 8px', border: '1px solid #ddd' }}>Name</th>
                    <th style={{ padding: '4px 8px', border: '1px solid #ddd' }}>Batch</th>
                    <th style={{ padding: '4px 8px', border: '1px solid #ddd' }}>Discipline</th>
                    <th style={{ padding: '4px 8px', border: '1px solid #ddd' }}>Scheme</th>
                    <th style={{ padding: '4px 8px', border: '1px solid #ddd' }}>Section</th>
                    <th style={{ padding: '4px 8px', border: '1px solid #ddd' }}>Gender</th>
                    <th style={{ padding: '4px 8px', border: '1px solid #ddd' }}>DOB</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>1BI23IS001</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>John Doe</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>2023</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>Autonomous</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>22</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>A</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>Male</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>2005-01-15</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="section-card">
            <h3>➕ Add Single Student</h3>
            <div className="form-grid">
              <input 
                type="text" 
                placeholder="USN (e.g., 1BI23IS082)" 
                className="form-input"
                value={studentFormData.usn}
                onChange={(e) => setStudentFormData({...studentFormData, usn: e.target.value.toUpperCase()})}
              />
              <input 
                type="text" 
                placeholder="Full Name" 
                className="form-input"
                value={studentFormData.name}
                onChange={(e) => setStudentFormData({...studentFormData, name: e.target.value})}
              />
              <select 
                className="form-input"
                value={studentFormData.batch}
                onChange={(e) => setStudentFormData({...studentFormData, batch: e.target.value})}
              >
                <option value="2024">Batch 2024</option>
                <option value="2023">Batch 2023</option>
                <option value="2022">Batch 2022</option>
                <option value="2021">Batch 2021</option>
              </select>
              <select 
                className="form-input"
                value={studentFormData.section}
                onChange={(e) => setStudentFormData({...studentFormData, section: e.target.value})}
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
              </select>
              <select 
                className="form-input"
                value={studentFormData.scheme}
                onChange={(e) => setStudentFormData({...studentFormData, scheme: e.target.value})}
              >
                <option value="22">Scheme 22</option>
                <option value="21">Scheme 21</option>
              </select>
              <input 
                type="date" 
                placeholder="Date of Birth" 
                className="form-input"
                value={studentFormData.dob}
                onChange={(e) => setStudentFormData({...studentFormData, dob: e.target.value})}
              />
            </div>
            <button 
              className="action-btn-primary"
              onClick={handleAddStudent}
              disabled={!studentFormData.usn || !studentFormData.name}
            >
              ➕ Add Student
            </button>
          </div>
        </div>
      )}

      {/* Subjects Management Section */}
      {activeView === 'subjects' && (
        <div className="management-section">
          <h2>📚 Subject Management</h2>
          
          <div className="section-card">
            <h3>📤 Bulk Import Subjects from Excel</h3>
            <p>Upload Excel file with columns: <strong>Subject_Code, Subject_Name, Semester, Credits, Scheme, Is_Placeholder</strong></p>
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              className="file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleBulkImportSubjects(file);
                e.target.value = ''; // Reset input
              }}
            />
            <div className="info-box" style={{ marginTop: '12px' }}>
              <p><strong>📋 Excel Format Example:</strong></p>
              <table style={{ fontSize: '12px', marginTop: '8px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '4px 8px', border: '1px solid #ddd' }}>Subject_Code</th>
                    <th style={{ padding: '4px 8px', border: '1px solid #ddd' }}>Subject_Name</th>
                    <th style={{ padding: '4px 8px', border: '1px solid #ddd' }}>Semester</th>
                    <th style={{ padding: '4px 8px', border: '1px solid #ddd' }}>Credits</th>
                    <th style={{ padding: '4px 8px', border: '1px solid #ddd' }}>Scheme</th>
                    <th style={{ padding: '4px 8px', border: '1px solid #ddd' }}>Is_Placeholder</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>22CS41</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>Data Structures</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>4</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>4</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>22</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>no</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="section-card">
            <h3>➕ Add Single Subject</h3>
            <div className="form-grid">
              <input 
                type="text" 
                placeholder="Subject Code (e.g., 22CS41)" 
                className="form-input"
                value={subjectFormData.subjectCode}
                onChange={(e) => setSubjectFormData({...subjectFormData, subjectCode: e.target.value.toUpperCase()})}
              />
              <input 
                type="text" 
                placeholder="Subject Name" 
                className="form-input"
                value={subjectFormData.subjectName}
                onChange={(e) => setSubjectFormData({...subjectFormData, subjectName: e.target.value})}
              />
              <select 
                className="form-input"
                value={subjectFormData.semester}
                onChange={(e) => setSubjectFormData({...subjectFormData, semester: e.target.value})}
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
                <option value="8">Semester 8</option>
              </select>
              <input 
                type="number" 
                placeholder="Credits" 
                min="1" 
                max="4" 
                className="form-input"
                value={subjectFormData.credits}
                onChange={(e) => setSubjectFormData({...subjectFormData, credits: e.target.value})}
              />
              <select 
                className="form-input"
                value={subjectFormData.scheme}
                onChange={(e) => setSubjectFormData({...subjectFormData, scheme: e.target.value})}
              >
                <option value="22">Scheme 22</option>
                <option value="21">Scheme 21</option>
              </select>
              <select 
                className="form-input"
                value={subjectFormData.isPlaceholder}
                onChange={(e) => setSubjectFormData({...subjectFormData, isPlaceholder: e.target.value})}
              >
                <option value="no">Regular Subject</option>
                <option value="yes">Elective Placeholder</option>
              </select>
            </div>
            <button 
              className="action-btn-primary"
              onClick={handleAddSubject}
              disabled={!subjectFormData.subjectCode || !subjectFormData.subjectName}
            >
              ➕ Add Subject
            </button>
          </div>

          <div className="info-box">
            <p><strong>💡 Auto-Addition:</strong> Subjects are automatically added when scraping encounters new subject codes. Manual addition is only needed for pre-population.</p>
            <p><strong>📋 Excel Format:</strong> Column headers must match exactly - Subject_Code, Subject_Name, Semester, Credits, Scheme, Is_Placeholder</p>
          </div>
        </div>
      )}

      {/* Teachers Management Section */}
      {activeView === 'teachers' && (
        <div className="management-section">
          <h2>Teacher Management & Subject Assignment</h2>
          
          <div className="section-card">
            <h3>Assign Teacher to Subjects</h3>
            
            <div className="form-grid">
              {/* Batch Selection */}
              <div>
                <label htmlFor="batch-select" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Batch Year
                </label>
                <select 
                  id="batch-select"
                  className="form-input"
                  value={teacherAssignmentData.selectedBatch}
                  onChange={(e) => setTeacherAssignmentData({
                    ...teacherAssignmentData,
                    selectedBatch: e.target.value,
                    selectedSemester: '',
                    selectedSection: '',
                    selectedSubjects: []
                  })}
                >
                  <option value="">Select Batch</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                  <option value="2021">2021</option>
                  <option value="2020">2020</option>
                </select>
              </div>

              {/* Semester Selection - Only show if batch is selected */}
              {teacherAssignmentData.selectedBatch && (
                <div>
                  <label htmlFor="semester-select" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Semester
                  </label>
                  <select 
                    id="semester-select"
                    className="form-input"
                    value={teacherAssignmentData.selectedSemester}
                    onChange={(e) => setTeacherAssignmentData({
                      ...teacherAssignmentData,
                      selectedSemester: e.target.value,
                      selectedSection: '',
                      selectedSubjects: []
                    })}
                  >
                    <option value="">Select Semester</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                    <option value="5">Semester 5</option>
                    <option value="6">Semester 6</option>
                    <option value="7">Semester 7</option>
                    <option value="8">Semester 8</option>
                  </select>
                </div>
              )}

              {/* Section Selection - Only show if semester is selected */}
              {teacherAssignmentData.selectedSemester && (
                <div>
                  <label htmlFor="section-select" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Section
                  </label>
                  <select 
                    id="section-select"
                    className="form-input"
                    value={teacherAssignmentData.selectedSection}
                    onChange={(e) => setTeacherAssignmentData({
                      ...teacherAssignmentData,
                      selectedSection: e.target.value
                    })}
                  >
                    <option value="">Select Section</option>
                    {availableSections.length > 0 ? (
                      availableSections.map(section => (
                        <option key={section} value={section}>{section}</option>
                      ))
                    ) : (
                      <option value="A">A (Default)</option>
                    )}
                  </select>
                  <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                    {availableSections.length === 0 ? 'No students found. Using default section A.' : `${availableSections.length} section(s) available`}
                  </small>
                </div>
              )}

              {/* Teacher Selection - Only show if section is selected */}
              {teacherAssignmentData.selectedSection && (
                <div>
                  <label htmlFor="teacher-select" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Teacher
                  </label>
                  <select 
                    id="teacher-select"
                    className="form-input"
                    value={teacherAssignmentData.selectedTeacher}
                    onChange={(e) => setTeacherAssignmentData({
                      ...teacherAssignmentData,
                      selectedTeacher: e.target.value
                    })}
                    disabled={loadingTeachers}
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map(teacher => (
                      <option key={teacher.teacher_id} value={teacher.teacher_id}>
                        {teacher.teacher_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject Selection - Only show if teacher is selected */}
              {teacherAssignmentData.selectedTeacher && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="subjects-select" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Subjects (Hold Ctrl/Cmd to select multiple)
                  </label>
                  <select 
                    id="subjects-select"
                    className="form-input" 
                    multiple 
                    style={{
                      height: '200px',
                      padding: '8px',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      border: '2px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: '#f9f9f9'
                    }}
                    value={teacherAssignmentData.selectedSubjects}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                      setTeacherAssignmentData({
                        ...teacherAssignmentData,
                        selectedSubjects: selectedOptions
                      });
                    }}
                  >
                    {availableSubjects.length === 0 ? (
                      <option disabled style={{ color: '#999', fontStyle: 'italic' }}>
                        No subjects available for this batch/semester
                      </option>
                    ) : (
                      availableSubjects.map(subject => (
                        <option 
                          key={subject.subject_code} 
                          value={subject.subject_code}
                          style={{
                            padding: '8px',
                            marginBottom: '4px',
                            borderBottom: '1px solid #eee',
                            cursor: 'pointer'
                          }}
                        >
                          {subject.subject_code} - {subject.subject_name} ({subject.credits} credits)
                        </option>
                      ))
                    )}
                  </select>
                  {teacherAssignmentData.selectedSubjects.length > 0 && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '8px 12px', 
                      backgroundColor: '#e8f5e9', 
                      borderRadius: '4px',
                      fontSize: '13px',
                      color: '#2e7d32'
                    }}>
                      {teacherAssignmentData.selectedSubjects.length} subject(s) selected
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Assignment Button */}
            {teacherAssignmentData.selectedTeacher && teacherAssignmentData.selectedSubjects.length > 0 && (
              <button 
                className="action-btn-primary"
                onClick={handleAssignTeacher}
                style={{ marginTop: '16px' }}
              >
                Assign Subjects to Teacher
              </button>
            )}
          </div>

          {/* Current Assignments Table */}
          <div className="section-card">
            <h3>Current Teacher-Subject Assignments</h3>
            <div className="mapping-table">
              <table className="simple-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Batch</th>
                    <th>Section</th>
                    <th>Assigned Subjects</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No teacher assignments yet. Use the form above to assign teachers to subjects.
                      </td>
                    </tr>
                  ) : (
                    teacherAssignments.map((assignment, index) => (
                      <tr key={index}>
                        <td>{assignment.teacher_name}</td>
                        <td>{assignment.batch}</td>
                        <td>{assignment.section}</td>
                        <td>
                          {assignment.subject_codes.split(',').map((code, idx) => {
                            const names = assignment.subject_names.split(',');
                            return (
                              <div 
                                key={idx} 
                                style={{ 
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: '8px',
                                  padding: '6px 0'
                                }}
                              >
                                <span>
                                  <strong>{code}</strong> - {names[idx]}
                                </span>
                                <button
                                  onClick={() => handleDeleteAssignment(
                                    assignment.teacher_id,
                                    assignment.batch,
                                    assignment.section,
                                    code
                                  )}
                                  className="action-btn delete"
                                  style={{
                                    marginLeft: '12px',
                                    minWidth: '70px',
                                    fontSize: '12px'
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                        </td>
                        <td>
                          <span style={{ color: '#4caf50', fontSize: '12px' }}>
                            {assignment.subject_codes.split(',').length} subject(s)
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="info-box" style={{ backgroundColor: '#fff3e0', borderLeft: '4px solid #ff9800', marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#e65100' }}>How to Add Teachers</h4>
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              <li><strong>Step 1:</strong> Go to the <strong>User Management</strong> tab</li>
              <li><strong>Step 2:</strong> Click "Add User" and create a new user with Role = <strong>TEACHER</strong></li>
              <li><strong>Step 3:</strong> Return to this tab to assign subjects to that teacher</li>
            </ol>
            <p style={{ margin: '8px 0 0 0', color: '#e65100' }}>
              <em>Teachers must exist as users before you can assign subjects</em>
            </p>
          </div>

          <div className="info-box">
            <p><strong>Workflow Summary:</strong></p>
            <ol>
              <li>Create teacher accounts in <strong>User Management</strong> tab</li>
              <li>Add subjects in <strong>Subjects</strong> tab or let scraper auto-add them</li>
              <li>Select batch, semester, and section using the cascading dropdowns above</li>
              <li>Choose a teacher and select one or more subjects to assign</li>
              <li>Teachers can then view their assigned subject results in Teacher Dashboard</li>
            </ol>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="modal-overlay" onClick={() => setShowUserForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? 'Edit User' : 'Create New User'}</h2>
            <p>
              {editingUser 
                ? 'Update user information below' 
                : 'Enter user details to create a new account'}
            </p>

            <input
              type="text"
              placeholder="Full Name"
              value={userFormData.name}
              onChange={(e) => setUserFormData({...userFormData, name: e.target.value})}
              className="modal-input"
            />

            <input
              type="email"
              placeholder="Email Address"
              value={userFormData.email}
              onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
              className="modal-input"
            />

            {!editingUser && (
              <input
                type="password"
                placeholder="Password"
                value={userFormData.password}
                onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                className="modal-input"
              />
            )}

            <select
              value={userFormData.role}
              onChange={(e) => setUserFormData({...userFormData, role: e.target.value as any})}
              className="modal-input"
            >
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher</option>
              <option value="HOD">HOD</option>
              <option value="ADMIN">Admin</option>
            </select>

            {userFormData.role === 'STUDENT' && (
              <input
                type="text"
                placeholder="USN (e.g., 1BI23IS082)"
                value={userFormData.usn}
                onChange={(e) => setUserFormData({...userFormData, usn: e.target.value})}
                className="modal-input"
              />
            )}

            <div className="modal-actions">
              <button onClick={() => setShowUserForm(false)} className="modal-btn-cancel">
                Cancel
              </button>
              <button 
                onClick={editingUser ? handleUpdateUser : handleCreateUser} 
                className="modal-btn"
              >
                {editingUser ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
