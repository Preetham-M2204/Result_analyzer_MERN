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
import * as XLSX from 'xlsx';
import '../styles/HODDashboard.css';

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

const HODDashboardEnhanced = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Tab Management
  const [tab, setTab] = useState<'toppers' | 'statistics'>('toppers');
  
  // Toppers State
  const [topperType, setTopperType] = useState<'cgpa' | 'sgpa' | 'semester-total'>('cgpa');
  const [toppers, setToppers] = useState<TopPerformer[]>([]);
  const [loadingToppers, setLoadingToppers] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Filters
  const [selectedBatch, setSelectedBatch] = useState<string>('2022');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('1');
  const [selectedLimit, setSelectedLimit] = useState<string>('10');
  
  // Analytics State
  const [batchStats, setBatchStats] = useState<BatchStat[]>([]);
  // const [backlogStats, setBacklogStats] = useState<BacklogStat[]>([]);
  // const [sgpaDistribution, setSgpaDistribution] = useState<SGPADistribution[]>([]);
  // const [batchPerformance, setBatchPerformance] = useState<BatchPerformance[]>([]);
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
      
      // Handle "all" limit - fetch large number (500) instead
      const limitValue = selectedLimit === 'all' ? '500' : selectedLimit;
      params.append('limit', limitValue);
      
      if (topperType === 'cgpa') {
        endpoint = `/api/hod/top-performers/cgpa?${params.toString()}`;
      } else if (topperType === 'sgpa') {
        params.append('semester', selectedSemester);
        endpoint = `/api/hod/top-performers/sgpa?${params.toString()}`;
      } else if (topperType === 'semester-total') {
        params.append('semester', selectedSemester);
        endpoint = `/api/hod/top-performers/semester-marks?${params.toString()}`;
      }
      
      const resp = await apiClient.get(endpoint);
      const fetchedToppers = resp.data?.data?.toppers || [];
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
      
      const statsResp = await apiClient.get('/api/hod/batch-statistics');
      
      setBatchStats(statsResp.data?.data?.batchStats || []);
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
            'CGPA': t.cgpa ? parseFloat(t.cgpa.toString()).toFixed(2) : '-',
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
            'SGPA': t.sgpa ? parseFloat(t.sgpa.toString()).toFixed(2) : '-',
            'Percentage': t.percentage ? parseFloat(t.percentage.toString()).toFixed(2) : '-',
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
            'Percentage': t.overall_percentage ? parseFloat(t.overall_percentage.toString()).toFixed(2) : '-'
          }));
          filename = `Semester_Total_Toppers_${selectedSemester}_${selectedBatch}_${new Date().toISOString().split('T')[0]}`;
        }
      } else if (tab === 'statistics') {
        data = batchStats.map(b => ({
          'Batch': b.batch,
          'Total Students': b.total_students,
          'Sections': b.total_sections,
          'Average CGPA': b.average_cgpa ? parseFloat(b.average_cgpa.toString()).toFixed(2) : '-',
          'Highest CGPA': b.highest_cgpa ? parseFloat(b.highest_cgpa.toString()).toFixed(2) : '-',
          'Lowest CGPA': b.lowest_cgpa ? parseFloat(b.lowest_cgpa.toString()).toFixed(2) : '-',
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

  // Filter toppers based on search query
  const filteredToppers = toppers.filter((topper) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      topper.usn.toLowerCase().includes(query) ||
      topper.name.toLowerCase().includes(query)
    );
  });

  // Load data when tab changes
  useEffect(() => {
    if (tab === 'toppers') fetchToppers();
    if (tab === 'statistics') fetchAnalytics();
  }, [tab, topperType, selectedBatch, selectedSection, selectedSemester, selectedLimit]);

  return (
    <div className="hod-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <img src="/Logo.jpeg" alt="Logo" className="admin-logo" />
            <div className="header-titles">
              <h1>HOD Dashboard</h1>
              <p className="header-subtitle">Welcome, {user?.name || user?.email}</p>
            </div>
          </div>
          <div className="header-right">
            <button onClick={() => navigate('/hod/detailed-analytics')} className="logout-btn">
              Detailed Analytics
            </button>
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button 
          className={`tab-btn ${tab === 'toppers' ? 'active' : ''}`}
          onClick={() => setTab('toppers')}
        >
          Top Performers
        </button>
        <button 
          className={`tab-btn ${tab === 'statistics' ? 'active' : ''}`}
          onClick={() => setTab('statistics')}
        >
          Batch Statistics
        </button>
      </div>

      {/* Content Area */}
      <div className="dashboard-content">
        
        {/* TOP PERFORMERS TAB */}
        {tab === 'toppers' && (
          <div>
            {/* Filters */}
            <div className="section-card">
              <h3 className="section-title">Filters & Options</h3>
              <div className="form-grid">
                {/* Topper Type */}
                <div className="form-group">
                  <label>Topper Type</label>
                  <select 
                    className="form-select"
                    value={topperType} 
                    onChange={(e) => setTopperType(e.target.value as any)}
                  >
                    <option value="cgpa">Overall CGPA</option>
                    <option value="sgpa">Semester SGPA</option>
                    <option value="semester-total">Semester Total Marks</option>
                  </select>
                </div>
                
                {/* Semester (only for SGPA and semester total) */}
                {(topperType === 'sgpa' || topperType === 'semester-total') && (
                  <div className="form-group">
                    <label>Semester</label>
                    <select 
                      className="form-select"
                      value={selectedSemester} 
                      onChange={(e) => setSelectedSemester(e.target.value)}
                    >
                      {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                )}
                
                {/* Batch */}
                <div className="form-group">
                  <label>Batch</label>
                  <select 
                    className="form-select"
                    value={selectedBatch} 
                    onChange={(e) => setSelectedBatch(e.target.value)}
                  >
                    {batches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                
                {/* Section (only for SGPA) */}
                {topperType === 'sgpa' && (
                  <div className="form-group">
                    <label>Section</label>
                    <select 
                      className="form-select"
                      value={selectedSection} 
                      onChange={(e) => setSelectedSection(e.target.value)}
                    >
                      <option value="all">All Sections</option>
                      {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
                    </select>
                  </div>
                )}
                
                {/* Limit */}
                <div className="form-group">
                  <label>Show Top</label>
                  <select 
                    className="form-select"
                    value={selectedLimit} 
                    onChange={(e) => setSelectedLimit(e.target.value)}
                  >
                    {limits.map(l => <option key={l} value={l}>{l === 'all' ? 'All Students' : `Top ${l}`}</option>)}
                  </select>
                </div>
                
                {/* Export Button */}
                <div className="form-group">
                  <button className="export-btn" onClick={exportToExcel}>
                    Export to Excel
                  </button>
                </div>
              </div>
            </div>

            {/* Toppers Table */}
            <div className="section-card">
              <div className="section-title">
                <span>
                  {topperType === 'cgpa' ? 'Top Performers by Overall CGPA' : 
                   topperType === 'sgpa' ? `Top Performers by SGPA - Semester ${selectedSemester}` :
                   `Top Performers by Total Marks - Semester ${selectedSemester}`}
                </span>
                
                {/* Search Box */}
                <div className="search-box">
                  <input 
                    type="text" 
                    className="search-input"
                    placeholder="Search by USN or Name..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      className="clear-search"
                      onClick={() => setSearchQuery('')}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              
              {loadingToppers ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <div>Loading toppers...</div>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>USN</th>
                        <th>Name</th>
                        <th>Batch</th>
                        <th>Section</th>
                        {topperType === 'cgpa' && <th>CGPA</th>}
                        {topperType === 'sgpa' && <th>SGPA</th>}
                        {topperType === 'sgpa' && <th>Percentage</th>}
                        {topperType === 'semester-total' && <th>Total Marks</th>}
                        {topperType === 'semester-total' && <th>Percentage</th>}
                        <th>Backlogs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredToppers.length === 0 && !loadingToppers && (
                        <tr><td colSpan={10} className="empty-state">
                          {searchQuery ? `No students match your search "${searchQuery}"` : 'No toppers found'}
                        </td></tr>
                      )}
                      {filteredToppers.map((s, i) => (
                        <tr key={s.usn || i}>
                          <td>
                            <span className={`rank-badge ${i < 3 ? `rank-${i+1}` : ''}`}>
                              {i + 1}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace' }}>{s.usn}</td>
                          <td style={{ fontWeight: 500 }}>{s.name}</td>
                          <td>{s.batch}</td>
                          <td>{s.section || '-'}</td>
                          {topperType === 'cgpa' && (
                            <td style={{ fontWeight: 600 }}>
                              {s.cgpa ? parseFloat(s.cgpa.toString()).toFixed(2) : '-'}
                            </td>
                          )}
                          {topperType === 'sgpa' && (
                            <>
                              <td style={{ fontWeight: 600 }}>
                                {s.sgpa ? parseFloat(s.sgpa.toString()).toFixed(2) : '-'}
                              </td>
                              <td>
                                {s.percentage ? parseFloat(s.percentage.toString()).toFixed(2) + '%' : '-'}
                              </td>
                            </>
                          )}
                          {topperType === 'semester-total' && (
                            <>
                              <td style={{ fontWeight: 500 }}>
                                {s.cumulative_marks || s.total_marks_obtained || '-'} / {s.cumulative_maximum || s.total_marks_maximum || '-'}
                              </td>
                              <td>
                                {s.overall_percentage ? parseFloat(s.overall_percentage.toString()).toFixed(2) + '%' : 
                                 (s.percentage ? parseFloat(s.percentage.toString()).toFixed(2) + '%' : '-')}
                              </td>
                            </>
                          )}
                          <td>
                            <span className={`backlog-badge ${(s.backlog_count || s.total_backlogs || 0) > 0 ? 'backlog-exist' : 'backlog-none'}`}>
                              {(s.backlog_count || s.total_backlogs || 0) > 0 ? `${s.backlog_count || s.total_backlogs} Backlogs` : 'No Backlogs'}
                            </span>
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

        {/* STATISTICS TAB */}
        {tab === 'statistics' && (
          <div>
            <div className="section-card">
              <div className="section-title">
                <span>Detailed Batch Statistics</span>
                <button className="export-btn" onClick={exportToExcel}>
                  Export to Excel
                </button>
              </div>
              
              {loadingAnalytics ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <div>Loading statistics...</div>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Batch</th>
                        <th>Students</th>
                        <th>Sections</th>
                        <th>Avg CGPA</th>
                        <th>Highest</th>
                        <th>Lowest</th>
                        <th>Distinction</th>
                        <th>First Class</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchStats.length === 0 && (
                        <tr><td colSpan={8} className="empty-state">No statistics available</td></tr>
                      )}
                      {batchStats.map((b) => (
                        <tr key={b.batch}>
                          <td style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{b.batch}</td>
                          <td>{b.total_students}</td>
                          <td>{b.total_sections}</td>
                          <td style={{ fontWeight: 600 }}>
                            {b.average_cgpa ? parseFloat(b.average_cgpa.toString()).toFixed(2) : '-'}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {b.highest_cgpa ? parseFloat(b.highest_cgpa.toString()).toFixed(2) : '-'}
                          </td>
                          <td>
                            {b.lowest_cgpa ? parseFloat(b.lowest_cgpa.toString()).toFixed(2) : '-'}
                          </td>
                          <td>{b.distinction_count || 0}</td>
                          <td>{b.first_class_count || 0}</td>
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
  );
};

export default HODDashboardEnhanced;
