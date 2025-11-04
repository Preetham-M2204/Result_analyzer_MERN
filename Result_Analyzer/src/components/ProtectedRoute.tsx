/**
 * PROTECTED ROUTE COMPONENT
 * =========================
 * Wrapper component for routes that require authentication
 * 
 * Usage:
 * <Route path="/student/dashboard" element={
 *   <ProtectedRoute allowedRoles={['STUDENT']}>
 *     <StudentDashboard />
 *   </ProtectedRoute>
 * } />
 */

import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth.types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[]; // Optional: restrict to specific roles
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  // Not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // User doesn't have permission, redirect to their dashboard
    const dashboardMap: Record<UserRole, string> = {
      ADMIN: '/admin/dashboard',
      HOD: '/hod/dashboard',
      TEACHER: '/teacher/dashboard',
      STUDENT: '/student/dashboard',
    };

    return <Navigate to={dashboardMap[user.role]} replace />;
  }

  // User is authenticated and has permission, render the component
  return <>{children}</>;
};

export default ProtectedRoute;
