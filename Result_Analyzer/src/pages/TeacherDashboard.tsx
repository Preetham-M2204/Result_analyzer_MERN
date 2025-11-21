/**
 * TEACHER DASHBOARD
 * =================
 * Dashboard for teachers to view assigned subjects' results
 */

import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import * as XLSX from 'xlsx';
import '../styles/TeacherDashboard.css';

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
      const resp = await apiClient.get('/api/teachers/my-subjects');
      
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
    <div className="teacher-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <img src="/Logo.jpeg" alt="Logo" className="admin-logo" />
            <div className="header-titles">
              <h1>Teacher Dashboard</h1>
              <p className="header-subtitle">Welcome, {teacherName || user?.name || 'Teacher'}</p>
            </div>
          </div>
          <div className="header-right">
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Subject Selection Card */}
        <div className="section-card">
          <h3 className="section-title">Select Subject</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Subject</label>
              <select 
                className="form-select"
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
                <div className="form-group">
                  <label>Batch</label>
                  <select 
                    className="form-select"
                    value={selectedBatch} 
                    onChange={(e) => setSelectedBatch(e.target.value)}
                  >
                    {getAvailableBatches().map(batch => (
                      <option key={batch} value={batch}>{batch}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Section</label>
                  <select 
                    className="form-select"
                    value={selectedSection} 
                    onChange={(e) => setSelectedSection(e.target.value)}
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
          <div className="loading-container">
            <div className="spinner"></div>
            <div>Loading subject data...</div>
          </div>
        )}

        {!loading && overallStats && (
          <>
            {/* Stats Overview */}
            <div className="section-card">
              <h3 className="section-title">
                {selectedSubjectName} - Batch {selectedBatch}, Section {selectedSection}
              </h3>
              
              <div className="stats-grid">
                <div className="stat-card blue">
                  <div className="stat-label">Total Students</div>
                  <div className="stat-value">{overallStats.total_students}</div>
                </div>

                <div className="stat-card green">
                  <div className="stat-label">Passed</div>
                  <div className="stat-value">{overallStats.passed_count}</div>
                </div>

                <div className="stat-card red">
                  <div className="stat-label">Failed</div>
                  <div className="stat-value">{overallStats.failed_count}</div>
                </div>

                <div className="stat-card orange">
                  <div className="stat-label">Pass %</div>
                  <div className="stat-value">
                    {overallStats.pass_percentage ? parseFloat(overallStats.pass_percentage.toString()).toFixed(1) : '0'}%
                  </div>
                </div>

                <div className="stat-card purple">
                  <div className="stat-label">Avg Marks</div>
                  <div className="stat-value">
                    {overallStats.average_marks ? parseFloat(overallStats.average_marks.toString()).toFixed(1) : '-'}
                  </div>
                </div>

                <div className="stat-card teal">
                  <div className="stat-label">Highest</div>
                  <div className="stat-value">{overallStats.highest_marks}</div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="action-bar">
              <div className="view-toggles">
                <button 
                  className={`toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
                  onClick={() => setViewMode('all')} 
                >
                  All Students ({allResults.length})
                </button>
                <button 
                  className={`toggle-btn ${viewMode === 'toppers' ? 'active' : ''}`}
                  onClick={() => setViewMode('toppers')} 
                >
                  Top Performers ({toppers.length})
                </button>
                <button 
                  className={`toggle-btn ${viewMode === 'failed' ? 'active' : ''}`}
                  onClick={() => setViewMode('failed')} 
                >
                  Failed Students ({failedStudents.length})
                </button>
              </div>
              
              <button 
                className="export-btn"
                onClick={viewMode === 'all' ? handleExportAll : viewMode === 'toppers' ? handleExportToppers : handleExportFailed}
              >
                Export to Excel
              </button>
            </div>

            {/* Results Table */}
            {viewMode === 'all' && (
              <div className="section-card">
                <h3 className="section-title">All Student Results</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Sl No</th>
                        <th>USN</th>
                        <th>Name</th>
                        <th>Section</th>
                        <th>Internal</th>
                        <th>External</th>
                        <th>Total</th>
                        <th>Grade</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allResults.map((student, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{student.usn}</td>
                          <td>{student.name}</td>
                          <td>{student.section}</td>
                          <td>{student.internal_marks}</td>
                          <td>{student.external_marks}</td>
                          <td><strong>{student.total_marks}</strong></td>
                          <td>
                            <span className="status-badge grade">
                              {student.letter_grade}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${student.result_status === 'FAIL' ? 'fail' : 'pass'}`}>
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
              <div className="section-card">
                <h3 className="section-title">Top Performers</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>USN</th>
                        <th>Name</th>
                        <th>Section</th>
                        <th>Internal</th>
                        <th>External</th>
                        <th>Total</th>
                        <th>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {toppers.map((topper, idx) => (
                        <tr key={idx}>
                          <td><strong>{idx + 1}</strong></td>
                          <td>{topper.usn}</td>
                          <td>{topper.name}</td>
                          <td>{topper.section}</td>
                          <td>{topper.internal_marks}</td>
                          <td>{topper.external_marks}</td>
                          <td><strong>{topper.total_marks}</strong></td>
                          <td>
                            <span className="status-badge grade">
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
              <div className="section-card">
                <h3 className="section-title">
                  Failed Students ({failedStudents.length})
                </h3>
                {failedStudents.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">-</div>
                    <div>Excellent! No students failed this subject.</div>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>USN</th>
                          <th>Name</th>
                          <th>Section</th>
                          <th>Internal</th>
                          <th>External</th>
                          <th>Total</th>
                          <th>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failedStudents.map((student, idx) => (
                          <tr key={idx}>
                            <td>{student.usn}</td>
                            <td>{student.name}</td>
                            <td>{student.section}</td>
                            <td>{student.internal_marks}</td>
                            <td>{student.external_marks}</td>
                            <td><strong>{student.total_marks}</strong></td>
                            <td>
                              <span className="status-badge fail">
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
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: '8px' }}>No Subjects Assigned</div>
            <div>Please contact your administrator to assign subjects to you.</div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TeacherDashboard;
