/**
 * TEACHER DASHBOARD
 * =================
 * Dashboard for teachers to view assigned subjects' results
 */

import { useAuth } from '../context/AuthContext';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem',
          padding: '1rem',
          background: 'linear-gradient(135deg, #7b1fa2 0%, #9c27b0 100%)',
          borderRadius: '10px',
          color: 'white'
        }}>
          <div>
            <h1 style={{ margin: 0 }}>Teacher Dashboard</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
              Welcome, {user?.name}
            </p>
          </div>
          <button
            onClick={logout}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255,255,255,0.2)',
              border: '2px solid white',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Logout
          </button>
        </div>

        <div style={{
          background: '#f5f5f5',
          padding: '3rem',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#666' }}>📚 Subject Results Coming Soon</h2>
          <p style={{ color: '#999' }}>
            View results for your assigned subjects.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
