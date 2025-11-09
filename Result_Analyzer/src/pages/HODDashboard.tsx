/**
 * HOD DASHBOARD - VERSION 4.0
 * =============
 * Dashboard for HOD to view department-wide analytics
 */

import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

type TopPerformer = {
  usn: string;
  name: string;
  batch: number;
  section?: string;
  cgpa?: number;
};

type BatchStat = {
  batch: number;
  total_students: number;
  total_sections: number;
  average_cgpa: number;
  highest_cgpa: number;
  lowest_cgpa: number;
  distinction_count?: number;
  first_class_count?: number;
};

const HODDashboard = () => {
  console.log('========================================');
  console.log('NEW HOD DASHBOARD - VERSION 4.0');
  console.log('Loaded at:', new Date().toLocaleTimeString());
  console.log('========================================');
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'toppers' | 'statistics'>('toppers');
  const [cgpaToppers, setCgpaToppers] = useState<TopPerformer[]>([]);
  const [batchStats, setBatchStats] = useState<BatchStat[]>([]);
  const [loadingToppers, setLoadingToppers] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchCgpaToppers = async () => {
    try {
      setLoadingToppers(true);
      console.log('Fetching CGPA toppers...');
      const resp = await apiClient.get('/api/hod/top-performers/cgpa?limit=10');
      console.log('CGPA toppers response:', resp?.data);
      const toppers = resp.data?.data?.toppers || [];
      setCgpaToppers(Array.isArray(toppers) ? toppers : []);
    } catch (err: any) {
      console.error('Failed to load CGPA toppers:', err?.response?.data || err.message);
      setCgpaToppers([]);
    } finally {
      setLoadingToppers(false);
    }
  };

  const fetchBatchStats = async () => {
    try {
      setLoadingStats(true);
      console.log('Fetching batch statistics...');
      const resp = await apiClient.get('/api/hod/batch-statistics');
      console.log('Batch stats response:', resp?.data);
      const stats = resp.data?.data?.batchStats || [];
      setBatchStats(Array.isArray(stats) ? stats : []);
    } catch (err: any) {
      console.error('Failed to load batch stats:', err?.response?.data || err.message);
      setBatchStats([]);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    console.log('Tab changed to:', tab);
    if (tab === 'toppers') fetchCgpaToppers();
    if (tab === 'statistics') fetchBatchStats();
  }, [tab]);

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5', overflow: 'hidden', fontFamily: 'Roboto, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>HOD Dashboard</h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>Welcome, {user?.name || user?.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/hod/dashboard-enhanced')} style={{ padding: '0.5rem 1.25rem', background: '#4caf50', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
            ⚡ Try Enhanced Dashboard
          </button>
          <button onClick={() => navigate('/hod/detailed-analytics')} style={{ padding: '0.5rem 1.25rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
            📊 Detailed Analytics
          </button>
          <button onClick={logout} style={{ padding: '0.5rem 1.25rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 500 }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderBottom: '1px solid #e0e0e0', padding: '0 2rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => setTab('toppers')} style={{ padding: '1rem 1.5rem', background: 'transparent', border: 'none', borderBottom: tab === 'toppers' ? '3px solid #1976d2' : '3px solid transparent', color: tab === 'toppers' ? '#1976d2' : '#616161', cursor: 'pointer', fontWeight: tab === 'toppers' ? 600 : 400 }}>
          Top Performers
        </button>
        <button onClick={() => setTab('statistics')} style={{ padding: '1rem 1.5rem', background: 'transparent', border: 'none', borderBottom: tab === 'statistics' ? '3px solid #1976d2' : '3px solid transparent', color: tab === 'statistics' ? '#1976d2' : '#616161', cursor: 'pointer', fontWeight: tab === 'statistics' ? 600 : 400 }}>
          Batch Statistics
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {tab === 'toppers' && (
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600, color: '#212121' }}>Top Performers by CGPA</h2>
              {loadingToppers ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#757575' }}>Loading toppers...</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead style={{ background: '#f5f5f5' }}>
                    <tr>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Rank</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>USN</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Name</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Batch</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>CGPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cgpaToppers.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#757575' }}>No toppers found</td></tr>
                    )}
                    {cgpaToppers.map((s, i) => (
                      <tr key={s.usn || i} style={{ borderBottom: '1px solid #eeeeee' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '4px', background: i < 3 ? '#1976d2' : '#e0e0e0', color: i < 3 ? 'white' : '#616161', fontWeight: 600 }}>{i + 1}</span>
                        </td>
                        <td style={{ padding: '0.75rem', color: '#424242' }}>{s.usn}</td>
                        <td style={{ padding: '0.75rem', color: '#212121', fontWeight: 500 }}>{s.name}</td>
                        <td style={{ padding: '0.75rem', color: '#616161' }}>{s.batch}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '4px', background: '#4caf50', color: 'white', fontWeight: 600 }}>
                            {typeof s.cgpa === 'number' ? s.cgpa.toFixed(2) : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'statistics' && (
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600, color: '#212121' }}>Batch Statistics</h2>
              {loadingStats ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#757575' }}>Loading statistics...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {batchStats.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#757575' }}>No batch statistics available</div>
                  )}
                  {batchStats.map((b) => (
                    <div key={b.batch} style={{ padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fafafa' }}>
                      <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1976d2', marginBottom: '1rem' }}>Batch {b.batch}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#616161', fontSize: '0.875rem' }}>Total Students:</span>
                          <span style={{ color: '#212121', fontWeight: 600 }}>{b.total_students ?? '-'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#616161', fontSize: '0.875rem' }}>Average CGPA:</span>
                          <span style={{ color: '#212121', fontWeight: 600 }}>{typeof b.average_cgpa === 'number' ? b.average_cgpa.toFixed(2) : '-'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#616161', fontSize: '0.875rem' }}>Highest CGPA:</span>
                          <span style={{ color: '#4caf50', fontWeight: 700 }}>{typeof b.highest_cgpa === 'number' ? b.highest_cgpa.toFixed(2) : '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HODDashboard;
