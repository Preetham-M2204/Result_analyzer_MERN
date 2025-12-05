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
import ExcelJS from 'exceljs';
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

  // Export to Excel with color coding
  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data');
      let filename = 'export';
      
      if (tab === 'toppers') {
        // Export current toppers
        if (topperType === 'cgpa') {
          filename = `CGPA_Toppers_${selectedBatch}_${new Date().toISOString().split('T')[0]}`;
          
          // Add headers with styling
          worksheet.columns = [
            { header: 'Rank', key: 'rank', width: 8 },
            { header: 'USN', key: 'usn', width: 15 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Batch', key: 'batch', width: 10 },
            { header: 'Section', key: 'section', width: 10 },
            { header: 'CGPA', key: 'cgpa', width: 10 },
            { header: 'Backlogs', key: 'backlogs', width: 12 }
          ];
          
          // Style header row
          worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
          worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
          worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
          
          // Add data rows
          toppers.forEach((t, i) => {
            const row = worksheet.addRow({
              rank: i + 1,
              usn: t.usn,
              name: t.name,
              batch: t.batch,
              section: t.section || '-',
              cgpa: t.cgpa ? parseFloat(t.cgpa.toString()).toFixed(2) : '-',
              backlogs: t.total_backlogs || 0
            });
            
            // Color code rank cell only for top 3
            const rankCell = row.getCell('rank');
            if (i === 0) {
              rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } }; // Gold
              rankCell.font = { bold: true };
            } else if (i === 1) {
              rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0C0C0' } }; // Silver
              rankCell.font = { bold: true };
            } else if (i === 2) {
              rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCD7F32' } }; // Bronze
              rankCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            }
            
            // Color code backlogs
            const backlogCell = row.getCell('backlogs');
            if (t.total_backlogs && t.total_backlogs > 0) {
              backlogCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
              backlogCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            } else {
              backlogCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF51CF66' } };
              backlogCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            }
          });
          
        } else if (topperType === 'sgpa') {
          filename = `SGPA_Toppers_Sem${selectedSemester}_${selectedBatch}_${new Date().toISOString().split('T')[0]}`;
          
          worksheet.columns = [
            { header: 'Rank', key: 'rank', width: 8 },
            { header: 'USN', key: 'usn', width: 15 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Batch', key: 'batch', width: 10 },
            { header: 'Section', key: 'section', width: 10 },
            { header: 'Semester', key: 'semester', width: 10 },
            { header: 'SGPA', key: 'sgpa', width: 10 },
            { header: 'Percentage', key: 'percentage', width: 12 },
            { header: 'Grade', key: 'grade', width: 10 },
            { header: 'Backlogs', key: 'backlogs', width: 12 }
          ];
          
          worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
          worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
          worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
          
          toppers.forEach((t, i) => {
            const row = worksheet.addRow({
              rank: i + 1,
              usn: t.usn,
              name: t.name,
              batch: t.batch,
              section: t.section || '-',
              semester: t.semester,
              sgpa: t.sgpa ? parseFloat(t.sgpa.toString()).toFixed(2) : '-',
              percentage: t.percentage ? parseFloat(t.percentage.toString()).toFixed(2) : '-',
              grade: t.class_grade || '-',
              backlogs: t.backlog_count || 0
            });
            
            // Top 3 rank cell highlighting only
            const rankCell = row.getCell('rank');
            if (i === 0) {
              rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } }; // Gold
              rankCell.font = { bold: true };
            } else if (i === 1) {
              rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0C0C0' } }; // Silver
              rankCell.font = { bold: true };
            } else if (i === 2) {
              rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCD7F32' } }; // Bronze
              rankCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            }
            
            // Grade color coding
            const gradeCell = row.getCell('grade');
            const grade = t.class_grade;
            if (grade === 'FCD') {
              gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF51CF66' } };
              gradeCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            } else if (grade === 'FC') {
              gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF94D82D' } };
              gradeCell.font = { bold: true };
            } else if (grade === 'SC') {
              gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD43B' } };
              gradeCell.font = { bold: true };
            } else if (grade === 'P') {
              gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFA94D' } };
              gradeCell.font = { bold: true };
            } else if (grade === 'F') {
              gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
              gradeCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            }
            
            // Backlog color coding
            const backlogCell = row.getCell('backlogs');
            if (t.backlog_count && t.backlog_count > 0) {
              backlogCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
              backlogCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            } else {
              backlogCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF51CF66' } };
              backlogCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            }
          });
          
        } else {
          filename = `Semester_Total_Toppers_${selectedSemester}_${selectedBatch}_${new Date().toISOString().split('T')[0]}`;
          
          worksheet.columns = [
            { header: 'Rank', key: 'rank', width: 8 },
            { header: 'USN', key: 'usn', width: 15 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Batch', key: 'batch', width: 10 },
            { header: 'Section', key: 'section', width: 10 },
            { header: 'Semester', key: 'semester', width: 10 },
            { header: 'Total Marks', key: 'total', width: 12 },
            { header: 'Maximum', key: 'max', width: 12 },
            { header: 'Percentage', key: 'percentage', width: 12 }
          ];
          
          worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
          worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
          worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
          
          toppers.forEach((t, i) => {
            const row = worksheet.addRow({
              rank: i + 1,
              usn: t.usn,
              name: t.name,
              batch: t.batch,
              section: t.section || '-',
              semester: t.semester,
              total: t.cumulative_marks || '-',
              max: t.cumulative_maximum || '-',
              percentage: t.overall_percentage ? parseFloat(t.overall_percentage.toString()).toFixed(2) : '-'
            });
            
            // Top 3 rank cell highlighting only
            const rankCell = row.getCell('rank');
            if (i === 0) {
              rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } }; // Gold
              rankCell.font = { bold: true };
            } else if (i === 1) {
              rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0C0C0' } }; // Silver
              rankCell.font = { bold: true };
            } else if (i === 2) {
              rankCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCD7F32' } }; // Bronze
              rankCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            }
          });
        }
      } else if (tab === 'statistics') {
        filename = `Batch_Statistics_${new Date().toISOString().split('T')[0]}`;
        
        worksheet.columns = [
          { header: 'Batch', key: 'batch', width: 10 },
          { header: 'Total Students', key: 'total', width: 15 },
          { header: 'Sections', key: 'sections', width: 10 },
          { header: 'Average CGPA', key: 'avg', width: 15 },
          { header: 'Highest CGPA', key: 'high', width: 15 },
          { header: 'Lowest CGPA', key: 'low', width: 15 },
          { header: 'Distinction', key: 'distinction', width: 12 },
          { header: 'First Class', key: 'firstclass', width: 12 }
        ];
        
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        
        batchStats.forEach((b) => {
          const row = worksheet.addRow({
            batch: b.batch,
            total: b.total_students,
            sections: b.total_sections,
            avg: b.average_cgpa ? parseFloat(b.average_cgpa.toString()).toFixed(2) : '-',
            high: b.highest_cgpa ? parseFloat(b.highest_cgpa.toString()).toFixed(2) : '-',
            low: b.lowest_cgpa ? parseFloat(b.lowest_cgpa.toString()).toFixed(2) : '-',
            distinction: b.distinction_count || 0,
            firstclass: b.first_class_count || 0
          });
          
          // Color code distinction/first class counts
          const distinctionCell = row.getCell('distinction');
          distinctionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF51CF66' } };
          distinctionCell.font = { bold: true };
          
          const fcCell = row.getCell('firstclass');
          fcCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF94D82D' } };
          fcCell.font = { bold: true };
        });
      }
      
      // Apply borders to all cells
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
      });
      
      // Generate and download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      
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
