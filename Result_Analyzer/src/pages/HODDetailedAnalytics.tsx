/**
 * HOD DETAILED ANALYTICS PAGE
 * ============================
 * View complete semester results with all subject details
 * - Internal and external marks
 * - Pass percentage per subject
 * - Individual student grades
 * - Overall semester statistics
 */

import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import * as XLSX from 'xlsx';
import '../styles/HODDashboard.css';

type StudentResult = {
  usn: string;
  name: string;
  section: string;
  subject_code: string;
  subject_name: string;
  internal_marks: number;
  external_marks: number;
  total_marks: number;
  letter_grade: string;
  grade_points: number;
  result_status: string;
  sgpa: number;
  percentage: number;
  class_grade: string;
  backlog_count: number;
};

type SubjectStat = {
  subject_code: string;
  subject_name: string;
  total_students: number;
  passed_count: number;
  pass_percentage: number;
  average_marks: number;
  highest_marks: number;
  lowest_marks: number;
};

type OverallStat = {
  total_students: number;
  average_sgpa: number;
  highest_sgpa: number;
  lowest_sgpa: number;
  students_passed: number;
  students_with_backlogs: number;
};

const HODDetailedAnalytics = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const [selectedBatch, setSelectedBatch] = useState<string>('2022');
  const [selectedSemester, setSelectedSemester] = useState<string>('1');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  
  const [results, setResults] = useState<StudentResult[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStat | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'student' | 'subject'>('subject');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [subjectStudents, setSubjectStudents] = useState<any[]>([]);
  
  const batches = [2022, 2023, 2024];
  const sections = ['A', 'B', 'C', 'D'];
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  const handleSubjectClick = async (subjectCode: string, subjectName: string) => {
    try {
      const params = new URLSearchParams({
        subjectCode,
        batch: selectedBatch,
        semester: selectedSemester
      });
      
      if (selectedSection !== 'all') {
        params.append('section', selectedSection);
      }
      
      const resp = await apiClient.get(`/api/hod/subject-student-results?${params.toString()}`);
      setSelectedSubject({ code: subjectCode, name: subjectName, ...resp.data.data });
      setSubjectStudents(resp.data.data.students || []);
      setShowSubjectModal(true);
    } catch (err: any) {
      alert('Failed to load subject details: ' + (err?.response?.data?.message || err.message));
    }
  };

  const fetchDetailedResults = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        batch: selectedBatch,
        semester: selectedSemester
      });
      
      if (selectedSection !== 'all') {
        params.append('section', selectedSection);
      }
      
      const resp = await apiClient.get(`/api/hod/detailed-results?${params.toString()}`);
      
      setResults(resp.data?.data?.results || []);
      setSubjectStats(resp.data?.data?.subjectStats || []);
      setOverallStats(resp.data?.data?.overallStats || null);
    } catch (err: any) {
      console.error('Failed to load detailed results:', err?.response?.data || err.message);
      alert('Failed to load results: ' + (err?.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Subject-wise Statistics
      const subjectData = subjectStats.map(s => ({
        'Subject Code': s.subject_code,
        'Subject Name': s.subject_name,
        'Total Students': s.total_students,
        'Passed': s.passed_count,
        'Pass %': (s.pass_percentage ? parseFloat(s.pass_percentage.toString()).toFixed(2) : '0') + '%',
        'Average': s.average_marks ? parseFloat(s.average_marks.toString()).toFixed(2) : '-',
        'Highest': s.highest_marks,
        'Lowest': s.lowest_marks
      }));
      const ws1 = XLSX.utils.json_to_sheet(subjectData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Subject Statistics');
      
      // Sheet 2: Student-wise Results
      const studentMap = new Map<string, any>();
      results.forEach(r => {
        if (!studentMap.has(r.usn)) {
          studentMap.set(r.usn, {
            'USN': r.usn,
            'Name': r.name,
            'Section': r.section,
            'SGPA': r.sgpa ? parseFloat(r.sgpa.toString()).toFixed(2) : '-',
            'Percentage': r.percentage ? parseFloat(r.percentage.toString()).toFixed(2) + '%' : '-',
            'Grade': r.class_grade || '-',
            'Backlogs': r.backlog_count || 0
          });
        }
        const key = `${r.subject_code} (${r.subject_name})`;
        studentMap.get(r.usn)[key] = `${r.total_marks} (${r.letter_grade})`;
      });
      
      const studentData = Array.from(studentMap.values());
      const ws2 = XLSX.utils.json_to_sheet(studentData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Student Results');
      
      // Sheet 3: Overall Statistics
      if (overallStats) {
        const overallData = [
          { 'Metric': 'Total Students', 'Value': overallStats.total_students },
          { 'Metric': 'Average SGPA', 'Value': overallStats.average_sgpa ? parseFloat(overallStats.average_sgpa.toString()).toFixed(2) : '-' },
          { 'Metric': 'Highest SGPA', 'Value': overallStats.highest_sgpa ? parseFloat(overallStats.highest_sgpa.toString()).toFixed(2) : '-' },
          { 'Metric': 'Lowest SGPA', 'Value': overallStats.lowest_sgpa ? parseFloat(overallStats.lowest_sgpa.toString()).toFixed(2) : '-' },
          { 'Metric': 'Students Passed', 'Value': overallStats.students_passed },
          { 'Metric': 'Students with Backlogs', 'Value': overallStats.students_with_backlogs },
          { 'Metric': 'Pass Percentage', 'Value': ((overallStats.students_passed / overallStats.total_students) * 100).toFixed(2) + '%' }
        ];
        const ws3 = XLSX.utils.json_to_sheet(overallData);
        XLSX.utils.book_append_sheet(wb, ws3, 'Overall Stats');
      }
      
      const filename = `Detailed_Results_Batch${selectedBatch}_Sem${selectedSemester}_${selectedSection !== 'all' ? 'Sec' + selectedSection : 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      alert('Excel file downloaded successfully!');
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Failed to export: ' + err.message);
    }
  };

  const exportSubjectWise = (subjectCode: string, subjectName: string) => {
    try {
      const subjectResults = results.filter(r => r.subject_code === subjectCode);
      const data = subjectResults.map(r => ({
        'USN': r.usn,
        'Name': r.name,
        'Section': r.section,
        'Internal': r.internal_marks,
        'External': r.external_marks,
        'Total': r.total_marks,
        'Grade': r.letter_grade,
        'Status': r.result_status
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, subjectCode);
      
      const filename = `${subjectCode}_${subjectName.replace(/[^a-zA-Z0-9]/g, '_')}_Batch${selectedBatch}_Sem${selectedSemester}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      alert('Subject-wise results exported!');
    } catch (err: any) {
      alert('Failed to export: ' + err.message);
    }
  };

  const exportOverallSemester = () => {
    try {
      // Group by student and pivot subjects
      const studentMap = new Map<string, any>();
      
      results.forEach(r => {
        if (!studentMap.has(r.usn)) {
          studentMap.set(r.usn, {
            'USN': r.usn,
            'Name': r.name,
            'Section': r.section
          });
        }
        const student = studentMap.get(r.usn);
        const prefix = r.subject_code;
        student[`${prefix}_Internal`] = r.internal_marks;
        student[`${prefix}_External`] = r.external_marks;
        student[`${prefix}_Total`] = r.total_marks;
        student[`${prefix}_Grade`] = r.letter_grade;
        
        // Add overall stats (same for all subjects of a student) - will be reordered later
        if (!student['_sgpa']) {
          student['_sgpa'] = r.sgpa ? parseFloat(r.sgpa.toString()).toFixed(2) : '-';
          student['_percentage'] = r.percentage ? parseFloat(r.percentage.toString()).toFixed(2) : '-';
          student['_class_grade'] = r.class_grade || '-';
          student['_backlogs'] = r.backlog_count || 0;
        }
      });

      // Reorder columns: USN, Name, Section, all subject columns (sorted), then summary columns
      const data = Array.from(studentMap.values()).map(student => {
        const reordered: any = {
          'USN': student.USN,
          'Name': student.Name,
          'Section': student.Section
        };
        
        // Get all subject-related keys and sort them to ensure consistent ordering
        const subjectKeys = Object.keys(student)
          .filter(key => key !== 'USN' && key !== 'Name' && key !== 'Section' && !key.startsWith('_'))
          .sort();
        
        // Add subject columns in sorted order
        let totalMarksObtained = 0;
        subjectKeys.forEach(key => {
          reordered[key] = student[key];
          if (key.endsWith('_Total')) {
            totalMarksObtained += student[key] || 0;
          }
        });
        
        // Add summary columns at the end
        reordered['Total_Marks_Obtained'] = totalMarksObtained;
        reordered['SGPA'] = student._sgpa;
        reordered['Class_Grade'] = student._class_grade;
        reordered['Backlogs'] = student._backlogs;
        
        return reordered;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Overall Semester Results');
      
      const filename = `Overall_Semester_Results_Batch${selectedBatch}_Sem${selectedSemester}_${selectedSection !== 'all' ? 'Sec' + selectedSection : 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      alert('Overall semester results exported!');
    } catch (err: any) {
      alert('Failed to export: ' + err.message);
    }
  };

  // Group results by student
  const groupedByStudent = results.reduce((acc, r) => {
    if (!acc[r.usn]) {
      acc[r.usn] = {
        usn: r.usn,
        name: r.name,
        section: r.section,
        sgpa: r.sgpa,
        percentage: r.percentage,
        class_grade: r.class_grade,
        backlog_count: r.backlog_count,
        subjects: []
      };
    }
    acc[r.usn].subjects.push(r);
    return acc;
  }, {} as Record<string, any>);

  // Filter students based on search query
  const allStudents = Object.values(groupedByStudent);
  const studentList = allStudents.filter((student: any) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      student.usn.toLowerCase().includes(query) ||
      student.name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="hod-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <img src="/Logo.jpeg" alt="Logo" className="admin-logo" />
            <div className="header-titles">
              <h1>Detailed Results Analytics</h1>
              <p className="header-subtitle">Complete semester-wise result analysis</p>
            </div>
          </div>
          <div className="header-right">
            <button onClick={() => navigate('/hod/dashboard')} className="logout-btn">
              Back to Dashboard
            </button>
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="dashboard-content">
        
        {/* Filters */}
        <div className="section-card">
          <h3 className="section-title">Select Batch & Semester</h3>
          <div className="form-grid">
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
            
            <div className="form-group">
              <button 
                className="action-btn" 
                onClick={fetchDetailedResults} 
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Loading...' : 'Fetch Results'}
              </button>
            </div>
          </div>
        </div>

        {/* Overall Statistics */}
        {overallStats && (
          <div className="section-card">
            <div className="section-title">
              <span>
                Overall Statistics - Batch {selectedBatch}, Semester {selectedSemester}
                {selectedSection !== 'all' && `, Section ${selectedSection}`}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="export-btn" onClick={exportToExcel}>
                  Export Statistics
                </button>
                <button className="export-btn" onClick={exportOverallSemester} style={{ backgroundColor: '#2196f3' }}>
                  Export Overall Semester
                </button>
              </div>
            </div>
            
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div className="stat-card blue" style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '6px', border: '1px solid #90caf9' }}>
                <div style={{ fontSize: '0.75rem', color: '#1976d2', fontWeight: 500, marginBottom: '0.25rem' }}>Total Students</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1565c0' }}>{overallStats.total_students}</div>
              </div>
              
              <div className="stat-card green" style={{ padding: '1rem', background: '#e8f5e9', borderRadius: '6px', border: '1px solid #81c784' }}>
                <div style={{ fontSize: '0.75rem', color: '#388e3c', fontWeight: 500, marginBottom: '0.25rem' }}>Average SGPA</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2e7d32' }}>
                  {overallStats.average_sgpa ? parseFloat(overallStats.average_sgpa.toString()).toFixed(2) : '-'}
                </div>
              </div>
              
              <div className="stat-card purple" style={{ padding: '1rem', background: '#f3e5f5', borderRadius: '6px', border: '1px solid #ba68c8' }}>
                <div style={{ fontSize: '0.75rem', color: '#7b1fa2', fontWeight: 500, marginBottom: '0.25rem' }}>Highest SGPA</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6a1b9a' }}>
                  {overallStats.highest_sgpa ? parseFloat(overallStats.highest_sgpa.toString()).toFixed(2) : '-'}
                </div>
              </div>
              
              <div className="stat-card green" style={{ padding: '1rem', background: '#e8f5e9', borderRadius: '6px', border: '1px solid #81c784' }}>
                <div style={{ fontSize: '0.75rem', color: '#388e3c', fontWeight: 500, marginBottom: '0.25rem' }}>Passed</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2e7d32' }}>{overallStats.students_passed}</div>
              </div>
              
              <div className="stat-card red" style={{ padding: '1rem', background: '#ffebee', borderRadius: '6px', border: '1px solid #e57373' }}>
                <div style={{ fontSize: '0.75rem', color: '#c62828', fontWeight: 500, marginBottom: '0.25rem' }}>With Backlogs</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b71c1c' }}>{overallStats.students_with_backlogs}</div>
              </div>
              
              <div className="stat-card orange" style={{ padding: '1rem', background: '#fff3e0', borderRadius: '6px', border: '1px solid #ffb74d' }}>
                <div style={{ fontSize: '0.75rem', color: '#f57c00', fontWeight: 500, marginBottom: '0.25rem' }}>Pass %</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e65100' }}>
                  {((overallStats.students_passed / overallStats.total_students) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Mode Toggle */}
        {results.length > 0 && (
          <div className="section-card">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setViewMode('subject')} 
                className={`tab-btn ${viewMode === 'subject' ? 'active' : ''}`}
                style={{ border: 'none', background: viewMode === 'subject' ? 'var(--primary-color)' : '#eee', color: viewMode === 'subject' ? 'white' : '#666', borderRadius: '4px' }}
              >
                Subject-wise View
              </button>
              <button 
                onClick={() => setViewMode('student')} 
                className={`tab-btn ${viewMode === 'student' ? 'active' : ''}`}
                style={{ border: 'none', background: viewMode === 'student' ? 'var(--primary-color)' : '#eee', color: viewMode === 'student' ? 'white' : '#666', borderRadius: '4px' }}
              >
                Student-wise View
              </button>
              
              {viewMode === 'student' && (
                <div className="search-box" style={{ marginLeft: 'auto' }}>
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
              )}
            </div>
          </div>
        )}

        {/* Subject-wise Statistics */}
        {viewMode === 'subject' && subjectStats.length > 0 && (
          <div className="section-card">
            <h3 className="section-title">Subject-wise Performance</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Subject Name</th>
                    <th>Students</th>
                    <th>Passed</th>
                    <th>Pass %</th>
                    <th>Avg</th>
                    <th>Highest</th>
                    <th>Lowest</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectStats.map(s => (
                    <tr 
                      key={s.subject_code} 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSubjectClick(s.subject_code, s.subject_name)}
                    >
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.subject_code}</td>
                      <td>{s.subject_name}</td>
                      <td>{s.total_students}</td>
                      <td style={{ color: '#4caf50', fontWeight: 600 }}>{s.passed_count}</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '4px', background: s.pass_percentage >= 75 ? '#4caf50' : s.pass_percentage >= 50 ? '#ff9800' : '#f44336', color: 'white', fontWeight: 600, fontSize: '0.75rem' }}>
                          {s.pass_percentage ? parseFloat(s.pass_percentage.toString()).toFixed(1) : '0'}%
                        </span>
                      </td>
                      <td>{s.average_marks ? parseFloat(s.average_marks.toString()).toFixed(1) : '-'}</td>
                      <td style={{ color: '#4caf50', fontWeight: 600 }}>{s.highest_marks}</td>
                      <td>{s.lowest_marks}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            exportSubjectWise(s.subject_code, s.subject_name);
                          }}
                          className="action-btn"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'auto', display: 'inline-flex' }}
                        >
                          Export
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Student-wise Results */}
        {viewMode === 'student' && studentList.length > 0 && (
          <div className="section-card">
            <div className="section-title">
              <span>Student-wise Results</span>
              <div style={{ fontSize: '0.875rem', color: '#616161' }}>
                Showing {studentList.length} of {allStudents.length} students
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {studentList.map((student: any) => (
                <div key={student.usn} style={{ padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '6px', background: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#212121' }}>{student.name}</div>
                      <div style={{ fontSize: '0.875rem', color: '#616161', fontFamily: 'monospace' }}>{student.usn} | Section: {student.section}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#4caf50' }}>
                        SGPA: {student.sgpa ? parseFloat(student.sgpa.toString()).toFixed(2) : '-'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#616161' }}>
                        {student.percentage ? parseFloat(student.percentage.toString()).toFixed(1) : '-'}% | Grade: {student.class_grade} | Backlogs: {student.backlog_count || 0}
                      </div>
                    </div>
                  </div>
                  
                  <div className="table-container">
                    <table style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th style={{ textAlign: 'center' }}>Internal</th>
                          <th style={{ textAlign: 'center' }}>External</th>
                          <th style={{ textAlign: 'center' }}>Total</th>
                          <th style={{ textAlign: 'center' }}>Grade</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {student.subjects.map((sub: StudentResult, idx: number) => (
                          <tr key={idx}>
                            <td>{sub.subject_code} - {sub.subject_name}</td>
                            <td style={{ textAlign: 'center' }}>{sub.internal_marks}</td>
                            <td style={{ textAlign: 'center' }}>{sub.external_marks}</td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{sub.total_marks}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '4px', background: '#e3f2fd', color: '#1976d2', fontWeight: 600, fontSize: '0.75rem' }}>
                                {sub.letter_grade}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '4px', background: (sub.result_status === 'PASS' || sub.result_status === 'P') ? '#4caf50' : '#f44336', color: 'white', fontWeight: 600, fontSize: '0.75rem' }}>
                                {sub.result_status === 'P' ? 'PASS' : sub.result_status === 'F' ? 'FAIL' : sub.result_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No students found after search */}
        {viewMode === 'student' && results.length > 0 && studentList.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>No Students Found</div>
            <div>No students match your search query "{searchQuery}"</div>
            <button 
              onClick={() => setSearchQuery('')}
              className="action-btn"
              style={{ marginTop: '1rem', width: 'auto', display: 'inline-flex' }}
            >
              Clear Search
            </button>
          </div>
        )}

        {/* No data message */}
        {!loading && results.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>No Results Available</div>
            <div>Select a batch and semester above, then click "Fetch Results" to view detailed analytics</div>
          </div>
        )}

        {/* Subject Detail Modal */}
        {showSubjectModal && selectedSubject && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setShowSubjectModal(false)}>
            <div style={{ background: 'white', borderRadius: '8px', maxWidth: '1200px', width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#212121' }}>{selectedSubject.name}</h2>
                  <div style={{ fontSize: '0.875rem', color: '#616161', marginTop: '0.25rem' }}>{selectedSubject.code}</div>
                </div>
                <button onClick={() => setShowSubjectModal(false)} style={{ padding: '0.5rem 1rem', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>Close</button>
              </div>
              
              <div style={{ padding: '1.5rem' }}>
                {/* Statistics Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#1976d2', fontWeight: 500, marginBottom: '0.25rem' }}>Total Students</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1565c0' }}>{selectedSubject.statistics?.totalStudents || 0}</div>
                  </div>
                  <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#388e3c', fontWeight: 500, marginBottom: '0.25rem' }}>Passed</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2e7d32' }}>{selectedSubject.statistics?.passedStudents || 0}</div>
                  </div>
                  <div style={{ background: '#ffebee', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#d32f2f', fontWeight: 500, marginBottom: '0.25rem' }}>Failed</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c62828' }}>{selectedSubject.statistics?.failedStudents || 0}</div>
                  </div>
                  <div style={{ background: '#fff3e0', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#f57c00', fontWeight: 500, marginBottom: '0.25rem' }}>Pass %</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef6c00' }}>{selectedSubject.statistics?.passPercentage || 0}%</div>
                  </div>
                  <div style={{ background: '#f3e5f5', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#7b1fa2', fontWeight: 500, marginBottom: '0.25rem' }}>Average</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6a1b9a' }}>{selectedSubject.statistics?.avgMarks || 0}</div>
                  </div>
                  <div style={{ background: '#e0f2f1', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#00796b', fontWeight: 500, marginBottom: '0.25rem' }}>Highest</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00695c' }}>{selectedSubject.statistics?.highestMarks || 0}</div>
                  </div>
                </div>

                {/* Student Results Table */}
                <div className="table-container">
                  <table>
                    <thead style={{ position: 'sticky', top: 0 }}>
                      <tr>
                        <th>USN</th>
                        <th>Name</th>
                        <th>Section</th>
                        <th style={{ textAlign: 'center' }}>Internal</th>
                        <th style={{ textAlign: 'center' }}>External</th>
                        <th style={{ textAlign: 'center' }}>Total</th>
                        <th style={{ textAlign: 'center' }}>Grade</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectStudents.map((student: any) => (
                        <tr key={student.usn}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{student.usn}</td>
                          <td>{student.name}</td>
                          <td style={{ textAlign: 'center' }}>{student.section}</td>
                          <td style={{ textAlign: 'center' }}>{student.internal_marks}</td>
                          <td style={{ textAlign: 'center' }}>{student.external_marks}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: (student.external_marks >= 18 && student.total_marks >= 40) ? '#4caf50' : '#f44336' }}>{student.total_marks}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '4px', background: '#e3f2fd', color: '#1976d2', fontWeight: 600, fontSize: '0.75rem' }}>
                              {student.letter_grade || '-'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '4px', background: student.pass_status === 'PASS' ? '#4caf50' : '#f44336', color: 'white', fontWeight: 600, fontSize: '0.75rem' }}>
                              {student.pass_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default HODDetailedAnalytics;
