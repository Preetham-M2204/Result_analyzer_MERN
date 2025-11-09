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
  
  const batches = [2022, 2023, 2024];
  const sections = ['A', 'B', 'C', 'D'];
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

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
      console.log('Detailed results response:', resp.data);
      
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
        'Pass %': s.pass_percentage?.toFixed(2) + '%',
        'Average': s.average_marks?.toFixed(2),
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
            'SGPA': r.sgpa?.toFixed(2) || '-',
            'Percentage': r.percentage?.toFixed(2) + '%' || '-',
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
          { 'Metric': 'Average SGPA', 'Value': overallStats.average_sgpa?.toFixed(2) },
          { 'Metric': 'Highest SGPA', 'Value': overallStats.highest_sgpa?.toFixed(2) },
          { 'Metric': 'Lowest SGPA', 'Value': overallStats.lowest_sgpa?.toFixed(2) },
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

  const studentList = Object.values(groupedByStudent);

  // Note: groupedBySubject is prepared for future use
  // const subjectList = Object.values(groupedBySubject);

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5', overflow: 'hidden', fontFamily: 'Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Detailed Results Analytics</h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>Complete semester-wise result analysis</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/hod/dashboard')} style={{ padding: '0.5rem 1.25rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
            Back to Dashboard
          </button>
          <button onClick={logout} style={{ padding: '0.5rem 1.25rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          
          {/* Filters */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#212121' }}>Select Batch & Semester</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#616161' }}>Batch</label>
                <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.875rem' }}>
                  {batches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#616161' }}>Semester</label>
                <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.875rem' }}>
                  {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#616161' }}>Section</label>
                <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.875rem' }}>
                  <option value="all">All Sections</option>
                  {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
                </select>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={fetchDetailedResults} disabled={loading} style={{ width: '100%', padding: '0.5rem', background: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem', opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Loading...' : 'Fetch Results'}
                </button>
              </div>
            </div>
          </div>

          {/* Overall Statistics */}
          {overallStats && (
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#212121' }}>
                  Overall Statistics - Batch {selectedBatch}, Semester {selectedSemester}
                  {selectedSection !== 'all' && `, Section ${selectedSection}`}
                </h3>
                <button onClick={exportToExcel} style={{ padding: '0.5rem 1rem', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
                  Export to Excel
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '6px', border: '1px solid #90caf9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1976d2', fontWeight: 500, marginBottom: '0.25rem' }}>Total Students</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1565c0' }}>{overallStats.total_students}</div>
                </div>
                
                <div style={{ padding: '1rem', background: '#e8f5e9', borderRadius: '6px', border: '1px solid #81c784' }}>
                  <div style={{ fontSize: '0.75rem', color: '#388e3c', fontWeight: 500, marginBottom: '0.25rem' }}>Average SGPA</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2e7d32' }}>{overallStats.average_sgpa?.toFixed(2)}</div>
                </div>
                
                <div style={{ padding: '1rem', background: '#f3e5f5', borderRadius: '6px', border: '1px solid #ba68c8' }}>
                  <div style={{ fontSize: '0.75rem', color: '#7b1fa2', fontWeight: 500, marginBottom: '0.25rem' }}>Highest SGPA</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6a1b9a' }}>{overallStats.highest_sgpa?.toFixed(2)}</div>
                </div>
                
                <div style={{ padding: '1rem', background: '#e8f5e9', borderRadius: '6px', border: '1px solid #81c784' }}>
                  <div style={{ fontSize: '0.75rem', color: '#388e3c', fontWeight: 500, marginBottom: '0.25rem' }}>Passed</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2e7d32' }}>{overallStats.students_passed}</div>
                </div>
                
                <div style={{ padding: '1rem', background: '#ffebee', borderRadius: '6px', border: '1px solid #e57373' }}>
                  <div style={{ fontSize: '0.75rem', color: '#c62828', fontWeight: 500, marginBottom: '0.25rem' }}>With Backlogs</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b71c1c' }}>{overallStats.students_with_backlogs}</div>
                </div>
                
                <div style={{ padding: '1rem', background: '#fff3e0', borderRadius: '6px', border: '1px solid #ffb74d' }}>
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
            <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button onClick={() => setViewMode('subject')} style={{ padding: '0.5rem 1rem', background: viewMode === 'subject' ? '#1976d2' : '#e0e0e0', color: viewMode === 'subject' ? 'white' : '#616161', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
                Subject-wise View
              </button>
              <button onClick={() => setViewMode('student')} style={{ padding: '0.5rem 1rem', background: viewMode === 'student' ? '#1976d2' : '#e0e0e0', color: viewMode === 'student' ? 'white' : '#616161', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
                Student-wise View
              </button>
            </div>
          )}

          {/* Subject-wise Statistics */}
          {viewMode === 'subject' && subjectStats.length > 0 && (
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#212121' }}>Subject-wise Performance</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead style={{ background: '#f5f5f5' }}>
                    <tr>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Code</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Subject Name</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Students</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Passed</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Pass %</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Avg</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Highest</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Lowest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectStats.map(s => (
                      <tr key={s.subject_code} style={{ borderBottom: '1px solid #eeeeee' }}>
                        <td style={{ padding: '0.75rem', color: '#424242', fontFamily: 'monospace', fontWeight: 600 }}>{s.subject_code}</td>
                        <td style={{ padding: '0.75rem', color: '#212121' }}>{s.subject_name}</td>
                        <td style={{ padding: '0.75rem', color: '#616161' }}>{s.total_students}</td>
                        <td style={{ padding: '0.75rem', color: '#4caf50', fontWeight: 600 }}>{s.passed_count}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '4px', background: s.pass_percentage >= 75 ? '#4caf50' : s.pass_percentage >= 50 ? '#ff9800' : '#f44336', color: 'white', fontWeight: 600, fontSize: '0.75rem' }}>
                            {s.pass_percentage?.toFixed(1)}%
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: '#424242' }}>{s.average_marks?.toFixed(1)}</td>
                        <td style={{ padding: '0.75rem', color: '#4caf50', fontWeight: 600 }}>{s.highest_marks}</td>
                        <td style={{ padding: '0.75rem', color: '#616161' }}>{s.lowest_marks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Student-wise Results */}
          {viewMode === 'student' && studentList.length > 0 && (
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#212121' }}>Student-wise Results</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {studentList.map((student: any) => (
                  <div key={student.usn} style={{ padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '6px', background: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#212121' }}>{student.name}</div>
                        <div style={{ fontSize: '0.875rem', color: '#616161', fontFamily: 'monospace' }}>{student.usn} | Section: {student.section}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#4caf50' }}>SGPA: {student.sgpa?.toFixed(2)}</div>
                        <div style={{ fontSize: '0.875rem', color: '#616161' }}>
                          {student.percentage?.toFixed(1)}% | Grade: {student.class_grade} | Backlogs: {student.backlog_count || 0}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                        <thead style={{ background: '#eeeeee' }}>
                          <tr>
                            <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 600, color: '#424242' }}>Subject</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 600, color: '#424242' }}>Internal</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 600, color: '#424242' }}>External</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 600, color: '#424242' }}>Total</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 600, color: '#424242' }}>Grade</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 600, color: '#424242' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {student.subjects.map((sub: StudentResult, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                              <td style={{ padding: '0.5rem', color: '#212121' }}>{sub.subject_code} - {sub.subject_name}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'center', color: '#616161' }}>{sub.internal_marks}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'center', color: '#616161' }}>{sub.external_marks}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'center', color: '#424242', fontWeight: 600 }}>{sub.total_marks}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '4px', background: '#1976d2', color: 'white', fontWeight: 600 }}>
                                  {sub.letter_grade}
                                </span>
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '4px', background: sub.result_status === 'PASS' ? '#4caf50' : '#f44336', color: 'white', fontWeight: 600 }}>
                                  {sub.result_status}
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

          {/* No data message */}
          {!loading && results.length === 0 && (
            <div style={{ background: 'white', padding: '3rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center', color: '#757575' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>No Results Available</div>
              <div style={{ fontSize: '0.875rem' }}>Select a batch and semester above, then click "Fetch Results" to view detailed analytics</div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default HODDetailedAnalytics;
