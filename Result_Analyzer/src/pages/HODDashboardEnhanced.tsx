/**
 * HOD DASHBOARD ENHANCED - VERSION 5.0
 * =====================================
 * Comprehensive dashboard with:
 * - 3 types of top performers (CGPA, Semester Total, SGPA)
 * - Advanced filtering (batch, section, limit)
 * - Excel export functionality
 * - Analytics with graphs and visualizations
 */

import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import * as XLSX from 'xlsx';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

type TopPerformer = {
  usn: string;
  name: string;
  batch: number;
  section?: string;
  cgpa?: number;
  sgpa?: number;
  semester?: number;
  percentage?: number;
  class_grade?: string;
  backlog_count?: number;
  total_backlogs?: number;
  cumulative_marks?: number;
  cumulative_maximum?: number;
  overall_percentage?: number;
  total_marks_obtained?: number;
  total_marks_maximum?: number;
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
  second_class_count?: number;
};

type BacklogStat = {
  batch: number;
  total_students: number;
  students_with_backlogs: number;
  total_backlogs: number;
  avg_backlogs_per_student: number;
  max_backlogs: number;
};

type SGPADistribution = {
  sgpa_range: string;
  student_count: number;
  batch: number;
};

type BatchPerformance = {
  batch: number;
  total_students: number;
  average_cgpa: number;
  average_sgpa: number;
  highest_cgpa: number;
  lowest_cgpa: number;
  distinction_count: number;
  students_with_backlogs: number;
  total_backlogs: number;
};

const HODDashboardEnhanced = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Tab Management
  const [tab, setTab] = useState<'toppers' | 'analytics' | 'statistics'>('toppers');
  
  // Toppers State
  const [topperType, setTopperType] = useState<'cgpa' | 'sgpa' | 'semester-total'>('cgpa');
  const [toppers, setToppers] = useState<TopPerformer[]>([]);
  const [loadingToppers, setLoadingToppers] = useState(false);
  
  // Filters
  const [selectedBatch, setSelectedBatch] = useState<string>('2022');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('1');
  const [selectedLimit, setSelectedLimit] = useState<string>('10');
  
  // Analytics State
  const [batchStats, setBatchStats] = useState<BatchStat[]>([]);
  const [backlogStats, setBacklogStats] = useState<BacklogStat[]>([]);
  const [sgpaDistribution, setSgpaDistribution] = useState<SGPADistribution[]>([]);
  const [batchPerformance, setBatchPerformance] = useState<BatchPerformance[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  
  const batches = [2022, 2023, 2024];
  const sections = ['A', 'B', 'C', 'D'];
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
  const limits = ['10', '50', '100', 'all'];

  // Fetch Top Performers
  const fetchToppers = async () => {
    try {
      setLoadingToppers(true);
      let endpoint = '';
      const params = new URLSearchParams();
      
      // Always include batch since we removed "all" option
      params.append('batch', selectedBatch);
      if (selectedSection !== 'all') params.append('section', selectedSection);
      params.append('limit', selectedLimit);
      
      if (topperType === 'cgpa') {
        endpoint = `/api/hod/top-performers/cgpa?${params.toString()}`;
      } else if (topperType === 'sgpa') {
        params.append('semester', selectedSemester);
        endpoint = `/api/hod/top-performers/sgpa?${params.toString()}`;
      } else if (topperType === 'semester-total') {
        params.append('semester', selectedSemester);
        endpoint = `/api/hod/top-performers/semester-marks?${params.toString()}`;
      }
      
      console.log('Fetching toppers from:', endpoint);
      const resp = await apiClient.get(endpoint);
      console.log('Toppers response:', resp.data);
      const fetchedToppers = resp.data?.data?.toppers || [];
      console.log('Fetched toppers count:', fetchedToppers.length);
      if (fetchedToppers.length > 0) {
        console.log('First topper sample:', fetchedToppers[0]);
        console.log('CGPA value:', fetchedToppers[0].cgpa, 'Type:', typeof fetchedToppers[0].cgpa);
      }
      setToppers(Array.isArray(fetchedToppers) ? fetchedToppers : []);
    } catch (err: any) {
      console.error('Failed to load toppers:', err?.response?.data || err.message);
      setToppers([]);
    } finally {
      setLoadingToppers(false);
    }
  };

  // Fetch Analytics Data
  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      
      const [statsResp, backlogResp, distResp, perfResp] = await Promise.all([
        apiClient.get('/api/hod/batch-statistics'),
        apiClient.get('/api/hod/backlog-statistics'),
        apiClient.get('/api/hod/sgpa-distribution'),
        apiClient.get('/api/hod/batch-performance')
      ]);
      
      setBatchStats(statsResp.data?.data?.batchStats || []);
      setBacklogStats(backlogResp.data?.data?.backlogStats || []);
      setSgpaDistribution(distResp.data?.data?.distribution || []);
      setBatchPerformance(perfResp.data?.data?.performance || []);
    } catch (err: any) {
      console.error('Failed to load analytics:', err?.response?.data || err.message);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      let data: any[] = [];
      let filename = 'export';
      
      if (tab === 'toppers') {
        // Export current toppers
        if (topperType === 'cgpa') {
          data = toppers.map((t, i) => ({
            'Rank': i + 1,
            'USN': t.usn,
            'Name': t.name,
            'Batch': t.batch,
            'Section': t.section || '-',
            'CGPA': t.cgpa?.toFixed(2) || '-',
            'Backlogs': t.total_backlogs || 0
          }));
          filename = `CGPA_Toppers_${selectedBatch}_${new Date().toISOString().split('T')[0]}`;
        } else if (topperType === 'sgpa') {
          data = toppers.map((t, i) => ({
            'Rank': i + 1,
            'USN': t.usn,
            'Name': t.name,
            'Batch': t.batch,
            'Section': t.section || '-',
            'Semester': t.semester,
            'SGPA': t.sgpa?.toFixed(2) || '-',
            'Percentage': t.percentage?.toFixed(2) || '-',
            'Grade': t.class_grade || '-',
            'Backlogs': t.backlog_count || 0
          }));
          filename = `SGPA_Toppers_Sem${selectedSemester}_${selectedBatch}_${new Date().toISOString().split('T')[0]}`;
        } else {
          data = toppers.map((t, i) => ({
            'Rank': i + 1,
            'USN': t.usn,
            'Name': t.name,
            'Batch': t.batch,
            'Section': t.section || '-',
            'Semester': t.semester,
            'Total Marks': t.cumulative_marks || '-',
            'Maximum': t.cumulative_maximum || '-',
            'Percentage': t.overall_percentage?.toFixed(2) || '-'
          }));
          filename = `Semester_Total_Toppers_${selectedSemester}_${selectedBatch}_${new Date().toISOString().split('T')[0]}`;
        }
      } else if (tab === 'statistics') {
        data = batchStats.map(b => ({
          'Batch': b.batch,
          'Total Students': b.total_students,
          'Sections': b.total_sections,
          'Average CGPA': b.average_cgpa?.toFixed(2) || '-',
          'Highest CGPA': b.highest_cgpa?.toFixed(2) || '-',
          'Lowest CGPA': b.lowest_cgpa?.toFixed(2) || '-',
          'Distinction': b.distinction_count || 0,
          'First Class': b.first_class_count || 0
        }));
        filename = `Batch_Statistics_${new Date().toISOString().split('T')[0]}`;
      }
      
      // Create worksheet and workbook
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      
      // Save file
      XLSX.writeFile(wb, `${filename}.xlsx`);
      alert('Excel file downloaded successfully!');
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Failed to export data: ' + err.message);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (tab === 'toppers') fetchToppers();
    if (tab === 'analytics') fetchAnalytics();
    if (tab === 'statistics') fetchAnalytics();
  }, [tab, topperType, selectedBatch, selectedSection, selectedSemester, selectedLimit]);

  // Prepare chart data
  const prepareBatchPerformanceChart = () => {
    return {
      labels: batchPerformance.map(b => `Batch ${b.batch}`),
      datasets: [
        {
          label: 'Average CGPA',
          data: batchPerformance.map(b => b.average_cgpa),
          backgroundColor: 'rgba(25, 118, 210, 0.7)',
          borderColor: 'rgba(25, 118, 210, 1)',
          borderWidth: 1
        },
        {
          label: 'Average SGPA',
          data: batchPerformance.map(b => b.average_sgpa),
          backgroundColor: 'rgba(76, 175, 80, 0.7)',
          borderColor: 'rgba(76, 175, 80, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  const prepareSGPADistributionChart = () => {
    const ranges = ['9.5-10.0', '9.0-9.5', '8.5-9.0', '8.0-8.5', '7.5-8.0', '7.0-7.5', '6.5-7.0', '6.0-6.5', 'Below 6.0'];
    const datasets = batches.map((batch, idx) => {
      const batchData = sgpaDistribution.filter(d => d.batch === batch);
      const colors = ['#1976d2', '#4caf50', '#ff9800'];
      return {
        label: `Batch ${batch}`,
        data: ranges.map(range => {
          const found = batchData.find(d => d.sgpa_range === range);
          return found ? found.student_count : 0;
        }),
        backgroundColor: colors[idx],
        borderColor: colors[idx],
        borderWidth: 1
      };
    });
    
    return { labels: ranges, datasets };
  };

  const prepareBacklogChart = () => {
    return {
      labels: backlogStats.map(b => `Batch ${b.batch}`),
      datasets: [
        {
          label: 'Students with Backlogs',
          data: backlogStats.map(b => b.students_with_backlogs),
          backgroundColor: 'rgba(244, 67, 54, 0.7)',
          borderColor: 'rgba(244, 67, 54, 1)',
          borderWidth: 1
        },
        {
          label: 'Total Students',
          data: backlogStats.map(b => b.total_students),
          backgroundColor: 'rgba(158, 158, 158, 0.7)',
          borderColor: 'rgba(158, 158, 158, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5', overflow: 'hidden', fontFamily: 'Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>HOD Dashboard</h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>Welcome, {user?.name || user?.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/hod/detailed-analytics')} style={{ padding: '0.5rem 1.25rem', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📊 View Detailed Analytics
          </button>
          <button onClick={logout} style={{ padding: '0.5rem 1.25rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #e0e0e0', padding: '0 2rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => setTab('toppers')} style={{ padding: '1rem 1.5rem', background: 'transparent', border: 'none', borderBottom: tab === 'toppers' ? '3px solid #1976d2' : '3px solid transparent', color: tab === 'toppers' ? '#1976d2' : '#616161', cursor: 'pointer', fontWeight: tab === 'toppers' ? 600 : 400, fontSize: '0.875rem' }}>
          Top Performers
        </button>
        <button onClick={() => setTab('analytics')} style={{ padding: '1rem 1.5rem', background: 'transparent', border: 'none', borderBottom: tab === 'analytics' ? '3px solid #1976d2' : '3px solid transparent', color: tab === 'analytics' ? '#1976d2' : '#616161', cursor: 'pointer', fontWeight: tab === 'analytics' ? 600 : 400, fontSize: '0.875rem' }}>
          Analytics & Graphs
        </button>
        <button onClick={() => setTab('statistics')} style={{ padding: '1rem 1.5rem', background: 'transparent', border: 'none', borderBottom: tab === 'statistics' ? '3px solid #1976d2' : '3px solid transparent', color: tab === 'statistics' ? '#1976d2' : '#616161', cursor: 'pointer', fontWeight: tab === 'statistics' ? 600 : 400, fontSize: '0.875rem' }}>
          Batch Statistics
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          
          {/* TOP PERFORMERS TAB */}
          {tab === 'toppers' && (
            <div>
              {/* Filters */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#212121' }}>Filters & Options</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  {/* Topper Type */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#616161' }}>Topper Type</label>
                    <select value={topperType} onChange={(e) => setTopperType(e.target.value as any)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.875rem' }}>
                      <option value="cgpa">Overall CGPA</option>
                      <option value="sgpa">Semester SGPA</option>
                      <option value="semester-total">Semester Total Marks</option>
                    </select>
                  </div>
                  
                  {/* Semester (only for SGPA and semester total) */}
                  {(topperType === 'sgpa' || topperType === 'semester-total') && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#616161' }}>Semester</label>
                      <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.875rem' }}>
                        {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
                      </select>
                    </div>
                  )}
                  
                  {/* Batch */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#616161' }}>Batch</label>
                    <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.875rem' }}>
                      {batches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  
                  {/* Section (only for SGPA) */}
                  {topperType === 'sgpa' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#616161' }}>Section</label>
                      <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.875rem' }}>
                        <option value="all">All Sections</option>
                        {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
                      </select>
                    </div>
                  )}
                  
                  {/* Limit */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#616161' }}>Show Top</label>
                    <select value={selectedLimit} onChange={(e) => setSelectedLimit(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.875rem' }}>
                      {limits.map(l => <option key={l} value={l}>{l === 'all' ? 'All Students' : `Top ${l}`}</option>)}
                    </select>
                  </div>
                  
                  {/* Export Button */}
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button onClick={exportToExcel} style={{ width: '100%', padding: '0.5rem', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
                      Export to Excel
                    </button>
                  </div>
                </div>
              </div>

              {/* Toppers Table */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600, color: '#212121' }}>
                  {topperType === 'cgpa' ? 'Top Performers by Overall CGPA' : 
                   topperType === 'sgpa' ? `Top Performers by SGPA - Semester ${selectedSemester}` :
                   `Top Performers by Total Marks - Semester ${selectedSemester}`}
                </h2>
                
                {loadingToppers ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#757575' }}>Loading toppers...</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead style={{ background: '#f5f5f5' }}>
                        <tr>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Rank</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>USN</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Name</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Batch</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Section</th>
                          {topperType === 'cgpa' && <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>CGPA</th>}
                          {topperType === 'sgpa' && <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>SGPA</th>}
                          {topperType === 'sgpa' && <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Percentage</th>}
                          {topperType === 'semester-total' && <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Total Marks</th>}
                          {topperType === 'semester-total' && <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Percentage</th>}
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Backlogs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {toppers.length === 0 && (
                          <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#757575' }}>No toppers found</td></tr>
                        )}
                        {toppers.map((s, i) => (
                          <tr key={s.usn || i} style={{ borderBottom: '1px solid #eeeeee', background: i % 2 === 0 ? 'white' : '#fefaf6' }}>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: i < 3 ? '#1976d2' : '#616161' }}>{i + 1}</span>
                            </td>
                            <td style={{ padding: '0.75rem', color: '#424242', fontFamily: 'monospace' }}>{s.usn}</td>
                            <td style={{ padding: '0.75rem', color: '#212121', fontWeight: 500 }}>{s.name}</td>
                            <td style={{ padding: '0.75rem', color: '#616161' }}>{s.batch}</td>
                            <td style={{ padding: '0.75rem', color: '#616161' }}>{s.section || '-'}</td>
                            {topperType === 'cgpa' && (
                              <td style={{ padding: '0.75rem', color: '#212121', fontWeight: 600, fontSize: '0.9rem' }}>
                                {s.cgpa ? parseFloat(s.cgpa.toString()).toFixed(2) : '-'}
                              </td>
                            )}
                            {topperType === 'sgpa' && (
                              <>
                                <td style={{ padding: '0.75rem', color: '#212121', fontWeight: 600, fontSize: '0.9rem' }}>
                                  {s.sgpa ? parseFloat(s.sgpa.toString()).toFixed(2) : '-'}
                                </td>
                                <td style={{ padding: '0.75rem', color: '#424242' }}>
                                  {s.percentage ? parseFloat(s.percentage.toString()).toFixed(2) + '%' : '-'}
                                </td>
                              </>
                            )}
                            {topperType === 'semester-total' && (
                              <>
                                <td style={{ padding: '0.75rem', color: '#424242', fontWeight: 500 }}>
                                  {s.cumulative_marks || s.total_marks_obtained || '-'} / {s.cumulative_maximum || s.total_marks_maximum || '-'}
                                </td>
                                <td style={{ padding: '0.75rem', color: '#424242' }}>
                                  {s.overall_percentage ? parseFloat(s.overall_percentage.toString()).toFixed(2) + '%' : 
                                   (s.percentage ? parseFloat(s.percentage.toString()).toFixed(2) + '%' : '-')}
                                </td>
                              </>
                            )}
                            <td style={{ padding: '0.75rem', color: (s.backlog_count || s.total_backlogs || 0) > 0 ? '#d32f2f' : '#388e3c', fontWeight: 600 }}>
                              {s.backlog_count || s.total_backlogs || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ANALYTICS TAB */}
          {tab === 'analytics' && (
            <div>
              {loadingAnalytics ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#757575' }}>Loading analytics...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {/* Batch Performance Comparison */}
                  <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600, color: '#212121' }}>Batch Performance Comparison</h2>
                    <div style={{ height: '350px' }}>
                      <Bar data={prepareBatchPerformanceChart()} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 10 } } }} />
                    </div>
                  </div>

                  {/* SGPA Distribution */}
                  <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600, color: '#212121' }}>SGPA Distribution Across Batches</h2>
                    <div style={{ height: '350px' }}>
                      <Bar data={prepareSGPADistributionChart()} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
                    </div>
                  </div>

                  {/* Backlog Statistics */}
                  <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600, color: '#212121' }}>Backlog Statistics</h2>
                    <div style={{ height: '350px' }}>
                      <Bar data={prepareBacklogChart()} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    {batchPerformance.map(b => (
                      <div key={b.batch} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #e0e0e0' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1976d2', marginBottom: '1rem' }}>Batch {b.batch}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#616161' }}>Total Students:</span>
                            <span style={{ color: '#212121', fontWeight: 600 }}>{b.total_students}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#616161' }}>Avg CGPA:</span>
                            <span style={{ color: '#212121', fontWeight: 700 }}>
                              {b.average_cgpa ? parseFloat(b.average_cgpa.toString()).toFixed(2) : '-'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#616161' }}>Distinction:</span>
                            <span style={{ color: '#212121', fontWeight: 600 }}>{b.distinction_count || 0}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#616161' }}>With Backlogs:</span>
                            <span style={{ color: '#f44336', fontWeight: 700 }}>{b.students_with_backlogs || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATISTICS TAB */}
          {tab === 'statistics' && (
            <div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#212121' }}>Detailed Batch Statistics</h2>
                  <button onClick={exportToExcel} style={{ padding: '0.5rem 1rem', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
                    Export to Excel
                  </button>
                </div>
                
                {loadingAnalytics ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#757575' }}>Loading statistics...</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead style={{ background: '#f5f5f5' }}>
                        <tr>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Batch</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Students</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Sections</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Avg CGPA</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Highest</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Lowest</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Distinction</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>First Class</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchStats.length === 0 && (
                          <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#757575' }}>No statistics available</td></tr>
                        )}
                        {batchStats.map((b, idx) => (
                          <tr key={b.batch} style={{ borderBottom: '1px solid #eeeeee', background: idx % 2 === 0 ? 'white' : '#fefaf6' }}>
                            <td style={{ padding: '0.75rem', color: '#1976d2', fontWeight: 600 }}>{b.batch}</td>
                            <td style={{ padding: '0.75rem', color: '#424242' }}>{b.total_students}</td>
                            <td style={{ padding: '0.75rem', color: '#424242' }}>{b.total_sections}</td>
                            <td style={{ padding: '0.75rem', color: '#212121', fontWeight: 600 }}>
                              {b.average_cgpa ? parseFloat(b.average_cgpa.toString()).toFixed(2) : '-'}
                            </td>
                            <td style={{ padding: '0.75rem', color: '#212121', fontWeight: 600 }}>
                              {b.highest_cgpa ? parseFloat(b.highest_cgpa.toString()).toFixed(2) : '-'}
                            </td>
                            <td style={{ padding: '0.75rem', color: '#616161' }}>
                              {b.lowest_cgpa ? parseFloat(b.lowest_cgpa.toString()).toFixed(2) : '-'}
                            </td>
                            <td style={{ padding: '0.75rem', color: '#424242' }}>{b.distinction_count || 0}</td>
                            <td style={{ padding: '0.75rem', color: '#424242' }}>{b.first_class_count || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default HODDashboardEnhanced;
