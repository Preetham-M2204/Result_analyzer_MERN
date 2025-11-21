/**
 * STUDENT DASHBOARD
 * =================
 * Complete student dashboard with results, charts, and analytics
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as studentApi from '../api/studentApi';
import type { StudentProfile, StudentSummary, SemesterResults, ClassRank, BatchCGPAData, SectionCGPAData } from '../types/student.types';

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
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

import '../styles/StudentDashboard.css';

const StudentDashboard = () => {
  const { user, logout } = useAuth();

  // State
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [semesterResults, setSemesterResults] = useState<SemesterResults | null>(null);
  const [classRank, setClassRank] = useState<ClassRank | null>(null);
  const [batchCGPA, setBatchCGPA] = useState<BatchCGPAData | null>(null);
  const [sectionCGPA, setSectionCGPA] = useState<SectionCGPAData | null>(null);
  const [selectedGraph, setSelectedGraph] = useState<'sgpa' | 'batch' | 'section'>('sgpa');
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sectionInput, setSectionInput] = useState('');

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Load semester-specific data when semester changes
  useEffect(() => {
    if (selectedSemester) {
      loadSemesterData(selectedSemester);
    }
  }, [selectedSemester]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load profile, summary, and CGPA distributions in parallel
      const [profileData, summaryData, batchData, sectionData] = await Promise.all([
        studentApi.getProfile(),
        studentApi.getSummary(),
        studentApi.getBatchCGPA(),
        studentApi.getSectionCGPA()
      ]);
      
      setProfile(profileData.profile);
      setSummary(summaryData);
      setBatchCGPA(batchData);
      setSectionCGPA(sectionData);
      
      // Check if section is missing
      if (!profileData.profile.section) {
        setShowProfileModal(true);
      }
      
      // Auto-select latest semester
      if (summaryData.semesterWiseGPA.length > 0) {
        const latestSem = Math.max(...summaryData.semesterWiseGPA.map(s => s.semester));
        setSelectedSemester(latestSem);
      }
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSemesterData = async (semester: number) => {
    try {
      const [resultsData, rankData] = await Promise.all([
        studentApi.getSemesterResults(semester),
        studentApi.getClassRank(semester)
      ]);
      
      setSemesterResults(resultsData);
      setClassRank(rankData);
    } catch (error) {
      console.error('Failed to load semester data:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!sectionInput.trim()) {
      alert('Please enter your section');
      return;
    }
    
    try {
      await studentApi.updateProfile({ section: sectionInput });
      setShowProfileModal(false);
      loadDashboardData(); // Reload data
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner-large"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  // SGPA Trend Chart Data
  const sgpaTrendData = {
    labels: summary?.semesterWiseGPA.map(s => `Sem ${s.semester}`) || [],
    datasets: [
      {
        label: 'SGPA',
        data: summary?.semesterWiseGPA.map(s => Number(s.sgpa)) || [],
        borderColor: '#2e7d32',
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  // Batch CGPA Distribution Chart Data
  const batchCGPAData = {
    labels: batchCGPA?.distribution.map(d => `${d.cgpa_range}-${d.cgpa_range + 1}`) || [],
    datasets: [
      {
        label: 'Number of Students',
        data: batchCGPA?.distribution.map(d => d.student_count) || [],
        backgroundColor: 'rgba(46, 125, 50, 0.7)',
        borderColor: '#2e7d32',
        borderWidth: 1
      }
    ]
  };

  // Section CGPA Distribution Chart Data
  const sectionCGPAData = {
    labels: sectionCGPA?.distribution.map(d => `${d.cgpa_range}-${d.cgpa_range + 1}`) || [],
    datasets: [
      {
        label: 'Number of Students',
        data: sectionCGPA?.distribution.map(d => d.student_count) || [],
        backgroundColor: 'rgba(27, 94, 32, 0.7)',
        borderColor: '#1b5e20',
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 6,
        max: 10,
        ticks: {
          stepSize: 0.5
        }
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        },
        title: {
          display: true,
          text: 'Number of Students',
          font: {
            family: 'Roboto',
            size: 12
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'CGPA Range',
          font: {
            family: 'Roboto',
            size: 12
          }
        }
      }
    }
  };

  return (
    <div className="student-dashboard">
      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Complete Your Profile</h2>
            <p>Please enter your section to continue</p>
            <input
              type="text"
              placeholder="Enter section (e.g., A, B, C)"
              value={sectionInput}
              onChange={(e) => setSectionInput(e.target.value.toUpperCase())}
              className="modal-input"
            />
            <button onClick={handleUpdateProfile} className="modal-btn">
              Save
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <img src="/Logo.jpeg" alt="Logo" className="admin-logo" />
            <div className="header-titles">
              <h1>Student Dashboard</h1>
              <p className="header-subtitle">Welcome, {profile?.name || user?.name} ({profile?.usn})</p>
            </div>
          </div>
          <div className="header-right">
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card cgpa-card">
          <h3>CGPA</h3>
          <div className="card-value">
            {summary?.cgpa ? Number(summary.cgpa).toFixed(2) : 'N/A'}
          </div>
          <p className="card-label">Cumulative Grade Point Average</p>
        </div>
        
        <div className="card backlogs-card">
          <h3>Backlogs</h3>
          <div className="card-value backlogs-count">{summary?.backlogs || 0}</div>
          <p className="card-label">
            {summary?.backlogs === 0 ? 'No pending backlogs' : 'Subjects to clear'}
          </p>
        </div>
        
        <div className="card batch-card">
          <h3>Batch</h3>
          <div className="card-value">{summary?.batch || 'N/A'}</div>
          <p className="card-label">Year of Admission</p>
        </div>

        {profile?.section && classRank?.rank && (
          <div className="card rank-card">
            <h3>Class Rank</h3>
            <div className="card-value">
              {classRank.rank}/{classRank.total}
            </div>
            <p className="card-label">Section {profile.section}</p>
          </div>
        )}
      </div>

      {/* Graph Selector and Chart Display */}
      <div className="chart-section">
        <div className="graph-selector-container">
          <label htmlFor="graph-select">Select Graph:</label>
          <select
            id="graph-select"
            value={selectedGraph}
            onChange={(e) => setSelectedGraph(e.target.value as 'sgpa' | 'batch' | 'section')}
            className="graph-dropdown"
          >
            <option value="sgpa">Semester-wise SGPA Trend</option>
            <option value="batch">Batch CGPA Distribution</option>
            {profile?.section && <option value="section">Section CGPA Distribution</option>}
          </select>
        </div>

        <div className="chart-container">
          {selectedGraph === 'sgpa' && (
            <>
              <h3 className="chart-title">Semester-wise SGPA Trend</h3>
              <Line data={sgpaTrendData} options={chartOptions} />
            </>
          )}

          {selectedGraph === 'batch' && batchCGPA && batchCGPA.distribution.length > 0 && (
            <>
              <h3 className="chart-title">
                Batch CGPA Distribution (Batch {batchCGPA.batch})
              </h3>
              <Bar data={batchCGPAData} options={barChartOptions} />
              <p className="chart-subtitle">Where you stand in your entire batch</p>
            </>
          )}

          {selectedGraph === 'section' && sectionCGPA && sectionCGPA.distribution.length > 0 && profile?.section && (
            <>
              <h3 className="chart-title">
                Section {sectionCGPA.section} CGPA Distribution
              </h3>
              <Bar data={sectionCGPAData} options={barChartOptions} />
              <p className="chart-subtitle">Where you stand in your section</p>
            </>
          )}
        </div>
      </div>

      {/* Semester Selector */}
      <div className="semester-selector">
        <label htmlFor="semester">Select Semester:</label>
        <select
          id="semester"
          value={selectedSemester || ''}
          onChange={(e) => setSelectedSemester(Number(e.target.value))}
          className="semester-dropdown"
        >
          <option value="">Choose semester</option>
          {summary?.semesterWiseGPA.map((sem) => (
            <option key={sem.semester} value={sem.semester}>
              Semester {sem.semester}
            </option>
          ))}
        </select>
      </div>

      {/* Semester Results Table */}
      {semesterResults && (
        <div className="results-section">
          <div className="results-header">
            <h2>Semester {semesterResults.semester} Results</h2>
            <div className="results-sgpa">
              SGPA: <strong>{semesterResults.sgpa ? Number(semesterResults.sgpa).toFixed(2) : 'N/A'}</strong>
            </div>
          </div>

          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Credits</th>
                  <th>Internal</th>
                  <th>External</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {semesterResults.results.map((result, index) => (
                  <tr key={index} className={result.result_status === 'FAIL' ? 'failed-subject' : ''}>
                    <td>{result.subject_code}</td>
                    <td className="subject-name">{result.subject_name}</td>
                    <td>{result.credits}</td>
                    <td>{result.internal_marks}</td>
                    <td>{result.external_marks}</td>
                    <td><strong>{result.total_marks}</strong></td>
                    <td>
                      <span className={`status-badge ${result.result_status.toLowerCase()}`}>
                        {result.result_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Download PDF Button */}
          <div className="download-section">
            <button className="download-btn" onClick={() => alert('PDF download feature coming soon!')}>
               Download Semester {semesterResults.semester} Results (PDF)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
