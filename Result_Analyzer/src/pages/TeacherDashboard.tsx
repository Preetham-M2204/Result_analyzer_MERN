/**
 * TEACHER DASHBOARD
 * =================
 * Dashboard for teachers to view assigned subjects' results
 */

import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import * as XLSX from 'xlsx';

type Subject = {
  subject_code: string;
  subject_name: string;
  semester: number;
  credits: number;
  batch: number;
  section: string;
};

type OverallStats = {
  total_students: number;
  passed_count: number;
  failed_count: number;
  pass_percentage: number;
  average_marks: number;
  highest_marks: number;
  lowest_marks: number;
  avg_internal: number;
  avg_external: number;
};

type StudentResult = {
  usn: string;
  name: string;
  gender: string;
  section: string;
  internal_marks: number;
  external_marks: number;
  total_marks: number;
  letter_grade: string;
  result_status: string;
  attempt_number?: number;
};

type Topper = StudentResult;
type FailedStudent = StudentResult;

const TeacherDashboard = () => {
  const { user, logout } = useAuth();

  const [teacherName, setTeacherName] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [allResults, setAllResults] = useState<StudentResult[]>([]);
  const [toppers, setToppers] = useState<Topper[]>([]);
  const [failedStudents, setFailedStudents] = useState<FailedStudent[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'toppers' | 'failed'>('all');

  useEffect(() => {
    fetchTeacherSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject && selectedBatch) {
      fetchSubjectData();
    }
  }, [selectedSubject, selectedBatch, selectedSection]);

  const fetchTeacherSubjects = async () => {
    try {
      setLoadingSubjects(true);
      // Backend will get teacherId from authenticated user and return teacher details from MySQL
      const resp = await apiClient.get('/api/teachers/my-subjects');
      
      // Set teacher name from MySQL database
      if (resp.data?.teacher?.teacher_name) {
        setTeacherName(resp.data.teacher.teacher_name);
      }
      
      setSubjects(resp.data?.subjects || []);
      
      if (resp.data?.subjects?.length > 0) {
        const firstSubject = resp.data.subjects[0];
        setSelectedSubject(firstSubject.subject_code);
        setSelectedBatch(firstSubject.batch.toString());
        setSelectedSection(firstSubject.section);
      }
    } catch (err: any) {
      console.error('Failed to load subjects:', err);
      alert('Failed to load subjects: ' + (err?.response?.data?.message || err.message));
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchSubjectData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        subjectCode: selectedSubject,
        batch: selectedBatch
      });
      
      if (selectedSection) {
        params.append('section', selectedSection);
      }

      const [analysisResp, toppersResp, failedResp, allResultsResp] = await Promise.all([
        apiClient.get(`/api/teachers/subject-analysis?${params.toString()}`),
        apiClient.get(`/api/teachers/subject-toppers?${params.toString()}&limit=10`),
        apiClient.get(`/api/teachers/failed-students?${params.toString()}`),
        apiClient.get(`/api/teachers/all-results?${params.toString()}`)
      ]);

      setOverallStats(analysisResp.data?.data?.overallStats || null);
      setToppers(toppersResp.data?.data?.toppers || []);
      setFailedStudents(failedResp.data?.data?.failedStudents || []);
      setAllResults(allResultsResp.data?.data?.results || []);
    } catch (err: any) {
      console.error('Failed to load subject data:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = (data: StudentResult[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data.map((student, index) => ({
      'Sl No': index + 1,
      'USN': student.usn,
      'Name': student.name,
      'Gender': student.gender,
      'Section': student.section,
      'Internal Marks': student.internal_marks,
      'External Marks': student.external_marks,
      'Total Marks': student.total_marks,
      'Grade': student.letter_grade,
      'Status': student.result_status,
      'Attempt': student.attempt_number || 1
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, filename);
  };

  const handleExportAll = () => {
    const subjectName = subjects.find(s => s.subject_code === selectedSubject)?.subject_name || selectedSubject;
    const filename = `${subjectName}_Batch${selectedBatch}_Section${selectedSection}_All_Results.xlsx`;
    exportToExcel(allResults, filename);
  };

  const handleExportToppers = () => {
    const subjectName = subjects.find(s => s.subject_code === selectedSubject)?.subject_name || selectedSubject;
    const filename = `${subjectName}_Batch${selectedBatch}_Section${selectedSection}_Toppers.xlsx`;
    exportToExcel(toppers, filename);
  };

  const handleExportFailed = () => {
    const subjectName = subjects.find(s => s.subject_code === selectedSubject)?.subject_name || selectedSubject;
    const filename = `${subjectName}_Batch${selectedBatch}_Section${selectedSection}_Failed_Students.xlsx`;
    exportToExcel(failedStudents, filename);
  };

  const getAvailableBatches = () => {
    const filtered = subjects.filter(s => s.subject_code === selectedSubject);
    return [...new Set(filtered.map(s => s.batch))].sort((a, b) => b - a);
  };

  const getAvailableSections = () => {
    const filtered = subjects.filter(
      s => s.subject_code === selectedSubject && s.batch.toString() === selectedBatch
    );
    return [...new Set(filtered.map(s => s.section))].sort();
  };

  const selectedSubjectName = subjects.find(s => s.subject_code === selectedSubject)?.subject_name || '';

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5', overflow: 'hidden', fontFamily: 'Roboto, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Teacher Dashboard</h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>Welcome, {teacherName || user?.name || 'Teacher'}</p>
        </div>
        <button onClick={logout} style={{ padding: '0.5rem 1.25rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
          Logout
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>

          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#212121' }}>Select Subject</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#616161' }}>Subject</label>
                <select 
                  value={selectedSubject} 
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    const firstMatch = subjects.find(s => s.subject_code === e.target.value);
                    if (firstMatch) {
                      setSelectedBatch(firstMatch.batch.toString());
                      setSelectedSection(firstMatch.section);
                    }
                  }}
                  disabled={loadingSubjects}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.875rem' }}
                >
                  <option value="">Select Subject</option>
                  {[...new Set(subjects.map(s => s.subject_code))].map(code => {
                    const subject = subjects.find(s => s.subject_code === code);
                    return (
                      <option key={code} value={code}>
                        {code} - {subject?.subject_name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedSubject && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#616161' }}>Batch</label>
                    <select 
                      value={selectedBatch} 
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.875rem' }}
                    >
                      {getAvailableBatches().map(batch => (
                        <option key={batch} value={batch}>{batch}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#616161' }}>Section</label>
                    <select 
                      value={selectedSection} 
                      onChange={(e) => setSelectedSection(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.875rem' }}
                    >
                      {getAvailableSections().map(section => (
                        <option key={section} value={section}>Section {section}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#616161' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              <div>Loading subject data...</div>
            </div>
          )}

          {!loading && overallStats && (
            <>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#212121' }}>
                  {selectedSubjectName} - Batch {selectedBatch}, Section {selectedSection}
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '6px', border: '1px solid #90caf9' }}>
                    <div style={{ fontSize: '0.75rem', color: '#1976d2', fontWeight: 500, marginBottom: '0.25rem' }}>Total Students</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1565c0' }}>{overallStats.total_students}</div>
                  </div>

                  <div style={{ padding: '1rem', background: '#e8f5e9', borderRadius: '6px', border: '1px solid #81c784' }}>
                    <div style={{ fontSize: '0.75rem', color: '#388e3c', fontWeight: 500, marginBottom: '0.25rem' }}>Passed</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2e7d32' }}>{overallStats.passed_count}</div>
                  </div>

                  <div style={{ padding: '1rem', background: '#ffebee', borderRadius: '6px', border: '1px solid #e57373' }}>
                    <div style={{ fontSize: '0.75rem', color: '#c62828', fontWeight: 500, marginBottom: '0.25rem' }}>Failed</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b71c1c' }}>{overallStats.failed_count}</div>
                  </div>

                  <div style={{ padding: '1rem', background: '#fff3e0', borderRadius: '6px', border: '1px solid #ffb74d' }}>
                    <div style={{ fontSize: '0.75rem', color: '#f57c00', fontWeight: 500, marginBottom: '0.25rem' }}>Pass %</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e65100' }}>
                      {overallStats.pass_percentage ? parseFloat(overallStats.pass_percentage.toString()).toFixed(1) : '0'}%
                    </div>
                  </div>

                  <div style={{ padding: '1rem', background: '#f3e5f5', borderRadius: '6px', border: '1px solid #ba68c8' }}>
                    <div style={{ fontSize: '0.75rem', color: '#7b1fa2', fontWeight: 500, marginBottom: '0.25rem' }}>Avg Marks</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6a1b9a' }}>
                      {overallStats.average_marks ? parseFloat(overallStats.average_marks.toString()).toFixed(1) : '-'}
                    </div>
                  </div>

                  <div style={{ padding: '1rem', background: '#e0f2f1', borderRadius: '6px', border: '1px solid #4db6ac' }}>
                    <div style={{ fontSize: '0.75rem', color: '#00695c', fontWeight: 500, marginBottom: '0.25rem' }}>Highest</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#004d40' }}>{overallStats.highest_marks}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => setViewMode('all')} 
                    style={{ padding: '0.5rem 1rem', background: viewMode === 'all' ? '#2e7d32' : '#e0e0e0', color: viewMode === 'all' ? 'white' : '#616161', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}
                  >
                    All Students ({allResults.length})
                  </button>
                  <button 
                    onClick={() => setViewMode('toppers')} 
                    style={{ padding: '0.5rem 1rem', background: viewMode === 'toppers' ? '#2e7d32' : '#e0e0e0', color: viewMode === 'toppers' ? 'white' : '#616161', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}
                  >
                    Top Performers ({toppers.length})
                  </button>
                  <button 
                    onClick={() => setViewMode('failed')} 
                    style={{ padding: '0.5rem 1rem', background: viewMode === 'failed' ? '#2e7d32' : '#e0e0e0', color: viewMode === 'failed' ? 'white' : '#616161', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}
                  >
                    Failed Students ({failedStudents.length})
                  </button>
                </div>
                
                <button 
                  onClick={viewMode === 'all' ? handleExportAll : viewMode === 'toppers' ? handleExportToppers : handleExportFailed}
                  style={{ padding: '0.5rem 1.25rem', background: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  📥 Export to Excel
                </button>
              </div>

              {viewMode === 'all' && (
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#212121' }}>All Student Results</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead style={{ background: '#f5f5f5' }}>
                        <tr>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Sl No</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>USN</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Name</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Section</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Internal</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>External</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Total</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Grade</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allResults.map((student, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #eeeeee', background: student.result_status === 'FAIL' ? '#ffebee' : (idx % 2 === 0 ? 'white' : '#fefaf6') }}>
                            <td style={{ padding: '0.75rem', color: '#212121', fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ padding: '0.75rem', color: '#424242' }}>{student.usn}</td>
                            <td style={{ padding: '0.75rem', color: '#424242' }}>{student.name}</td>
                            <td style={{ padding: '0.75rem', color: '#424242' }}>{student.section}</td>
                            <td style={{ padding: '0.75rem', color: '#424242' }}>{student.internal_marks}</td>
                            <td style={{ padding: '0.75rem', color: '#424242' }}>{student.external_marks}</td>
                            <td style={{ padding: '0.75rem', color: '#212121', fontWeight: 600 }}>{student.total_marks}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ padding: '0.25rem 0.5rem', background: '#e3f2fd', color: '#1565c0', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                {student.letter_grade}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ 
                                padding: '0.25rem 0.5rem', 
                                background: student.result_status === 'FAIL' ? '#ffcdd2' : '#c8e6c9', 
                                color: student.result_status === 'FAIL' ? '#c62828' : '#2e7d32', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                fontWeight: 600 
                              }}>
                                {student.result_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewMode === 'toppers' && (
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#212121' }}>Top Performers</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead style={{ background: '#f5f5f5' }}>
                        <tr>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Rank</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>USN</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Name</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Section</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Internal</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>External</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Total</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {toppers.map((topper, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #eeeeee', background: idx % 2 === 0 ? 'white' : '#fefaf6' }}>
                            <td style={{ padding: '0.75rem', color: '#212121', fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ padding: '0.75rem', color: '#424242', fontFamily: 'monospace' }}>{topper.usn}</td>
                            <td style={{ padding: '0.75rem', color: '#212121' }}>{topper.name}</td>
                            <td style={{ padding: '0.75rem', color: '#616161' }}>{topper.section}</td>
                            <td style={{ padding: '0.75rem', color: '#616161' }}>{topper.internal_marks}</td>
                            <td style={{ padding: '0.75rem', color: '#616161' }}>{topper.external_marks}</td>
                            <td style={{ padding: '0.75rem', color: '#4caf50', fontWeight: 700, fontSize: '1rem' }}>{topper.total_marks}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '4px', background: '#1976d2', color: 'white', fontWeight: 600 }}>
                                {topper.letter_grade}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewMode === 'failed' && (
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#212121' }}>
                    Failed Students ({failedStudents.length})
                  </h3>
                  {failedStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#4caf50' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
                      <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>Excellent! No students failed this subject.</div>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead style={{ background: '#ffebee' }}>
                          <tr>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>USN</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Name</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Section</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Internal</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>External</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Total</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#424242', borderBottom: '2px solid #e0e0e0' }}>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {failedStudents.map((student, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #eeeeee', background: idx % 2 === 0 ? 'white' : '#fefaf6' }}>
                              <td style={{ padding: '0.75rem', color: '#424242', fontFamily: 'monospace' }}>{student.usn}</td>
                              <td style={{ padding: '0.75rem', color: '#212121' }}>{student.name}</td>
                              <td style={{ padding: '0.75rem', color: '#616161' }}>{student.section}</td>
                              <td style={{ padding: '0.75rem', color: '#616161' }}>{student.internal_marks}</td>
                              <td style={{ padding: '0.75rem', color: '#616161' }}>{student.external_marks}</td>
                              <td style={{ padding: '0.75rem', color: '#f44336', fontWeight: 700 }}>{student.total_marks}</td>
                              <td style={{ padding: '0.75rem' }}>
                                <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '4px', background: '#f44336', color: 'white', fontWeight: 600 }}>
                                  {student.letter_grade}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!loading && !overallStats && !loadingSubjects && subjects.length === 0 && (
            <div style={{ background: 'white', padding: '3rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center', color: '#757575' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>No Subjects Assigned</div>
              <div style={{ fontSize: '0.875rem' }}>Please contact your administrator to assign subjects to you.</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
