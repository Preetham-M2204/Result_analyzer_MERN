/**
 * MAIN APP COMPONENT
 * ==================
 * Sets up routing and authentication context
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import HODDashboard from './pages/HODDashboard';
import HODDashboardEnhanced from './pages/HODDashboardEnhanced';
import HODDetailedAnalytics from './pages/HODDetailedAnalytics';
import AdminDashboard from './pages/AdminDashboard';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes - Student */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - Teacher */}
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - HOD */}
          {/* Main HOD Dashboard - Enhanced Version with all features */}
          <Route
            path="/hod/dashboard"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <HODDashboardEnhanced />
              </ProtectedRoute>
            }
          />
          
          {/* HOD Detailed Analytics - Semester-wise detailed results */}
          <Route
            path="/hod/detailed-analytics"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <HODDetailedAnalytics />
              </ProtectedRoute>
            }
          />
          
          {/* Legacy HOD Dashboard (kept for reference) */}
          <Route
            path="/hod/dashboard-legacy"
            element={
              <ProtectedRoute allowedRoles={['HOD']}>
                <HODDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 404 redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
