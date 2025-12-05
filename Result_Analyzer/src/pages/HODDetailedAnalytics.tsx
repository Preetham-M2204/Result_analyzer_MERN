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
import ExcelJS from 'exceljs';
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

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Sheet 1: Subject-wise Statistics
      const ws1 = workbook.addWorksheet('Subject Statistics');
      ws1.columns = [
        { header: 'Subject Code', key: 'code', width: 15 },
        { header: 'Subject Name', key: 'name', width: 35 },
        { header: 'Total Students', key: 'total', width: 15 },
        { header: 'Passed', key: 'passed', width: 12 },
        { header: 'Pass %', key: 'pass_pct', width: 12 },
        { header: 'Average', key: 'avg', width: 12 },
        { header: 'Highest', key: 'high', width: 12 },
        { header: 'Lowest', key: 'low', width: 12 }
      ];
      
      // Header styling - apply to each cell individually
      ws1.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      
      subjectStats.forEach(s => {
        const row = ws1.addRow({
          code: s.subject_code,
          name: s.subject_name,
          total: s.total_students,
          passed: s.passed_count,
          pass_pct: (s.pass_percentage ? parseFloat(s.pass_percentage.toString()).toFixed(2) : '0') + '%',
          avg: s.average_marks ? parseFloat(s.average_marks.toString()).toFixed(2) : '-',
          high: s.highest_marks,
          low: s.lowest_marks
        });
        
        // Bold subject codes
        row.getCell('code').font = { bold: true };
      });
      
      // Add borders to all cells
      ws1.eachRow((row) => {
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
      
      // Sheet 2: Student-wise Results  
      const ws2 = workbook.addWorksheet('Student Results');
      const studentMap = new Map<string, any>();
      const subjectCols: string[] = [];
      
      results.forEach(r => {
        if (!studentMap.has(r.usn)) {
          studentMap.set(r.usn, {
            usn: r.usn,
            name: r.name,
            section: r.section,
            sgpa: r.sgpa ? parseFloat(r.sgpa.toString()).toFixed(2) : '-',
            percentage: r.percentage ? parseFloat(r.percentage.toString()).toFixed(2) + '%' : '-',
            grade: r.class_grade || '-',
            backlogs: r.backlog_count || 0,
            subjects: {}
          });
        }
        const key = `${r.subject_code}`;
        if (!subjectCols.includes(key)) subjectCols.push(key);
        studentMap.get(r.usn).subjects[key] = { marks: r.total_marks, grade: r.letter_grade, status: r.result_status };
      });
      
      // Define columns
      const cols: any[] = [
        { header: 'USN', key: 'usn', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Section', key: 'section', width: 10 }
      ];
      subjectCols.forEach(sc => cols.push({ header: sc, key: sc, width: 12 }));
      cols.push(
        { header: 'SGPA', key: 'sgpa', width: 10 },
        { header: 'Percentage', key: 'percentage', width: 12 },
        { header: 'Grade', key: 'grade', width: 10 },
        { header: 'Backlogs', key: 'backlogs', width: 12 }
      );
      ws2.columns = cols;
      
      // Header styling - apply to each cell individually
      ws2.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      
      Array.from(studentMap.values()).forEach(student => {
        const rowData: any = {
          usn: student.usn,
          name: student.name,
          section: student.section,
          sgpa: student.sgpa,
          percentage: student.percentage,
          grade: student.grade,
          backlogs: student.backlogs
        };
        subjectCols.forEach(sc => {
          rowData[sc] = student.subjects[sc] ? `${student.subjects[sc].marks} (${student.subjects[sc].grade})` : '-';
        });
        
        const row = ws2.addRow(rowData);
        
        // Color code subject cells based on pass/fail
        subjectCols.forEach((sc, idx) => {
          const cell = row.getCell(idx + 4);
          if (student.subjects[sc]) {
            const status = student.subjects[sc].status;
            if (status === 'PASS' || status === 'P') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF51CF66' } };
              cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            } else if (status === 'FAIL' || status === 'F') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
              cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            }
          }
        });
        
        // Color code grade
        const gradeCell = row.getCell('grade');
        const grade = student.grade;
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
        
        // Color code backlogs
        const backlogCell = row.getCell('backlogs');
        if (student.backlogs > 0) {
          backlogCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
          backlogCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        } else {
          backlogCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF51CF66' } };
          backlogCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        }
      });
      
      // Add borders
      ws2.eachRow((row) => {
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
      
      // Sheet 3: Overall Statistics
      if (overallStats) {
        const ws3 = workbook.addWorksheet('Overall Stats');
        ws3.columns = [
          { header: 'Metric', key: 'metric', width: 30 },
          { header: 'Value', key: 'value', width: 20 }
        ];
        
        ws3.getRow(1).eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        
        ws3.addRow({ metric: 'Total Students', value: overallStats.total_students });
        ws3.addRow({ metric: 'Average SGPA', value: overallStats.average_sgpa ? parseFloat(overallStats.average_sgpa.toString()).toFixed(2) : '-' });
        ws3.addRow({ metric: 'Highest SGPA', value: overallStats.highest_sgpa ? parseFloat(overallStats.highest_sgpa.toString()).toFixed(2) : '-' });
        ws3.addRow({ metric: 'Lowest SGPA', value: overallStats.lowest_sgpa ? parseFloat(overallStats.lowest_sgpa.toString()).toFixed(2) : '-' });
        ws3.addRow({ metric: 'Students Passed', value: overallStats.students_passed });
        ws3.addRow({ metric: 'Students with Backlogs', value: overallStats.students_with_backlogs });
        ws3.addRow({ metric: 'Pass Percentage', value: ((overallStats.students_passed / overallStats.total_students) * 100).toFixed(2) + '%' });
        
        ws3.eachRow((row) => {
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
      }
      
      const filename = `Detailed_Results_Batch${selectedBatch}_Sem${selectedSemester}_${selectedSection !== 'all' ? 'Sec' + selectedSection : 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      
      alert('Excel file downloaded successfully!');
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Failed to export: ' + err.message);
    }
  };

  const exportSubjectWise = async (subjectCode: string, subjectName: string) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(subjectCode);
      
      worksheet.columns = [
        { header: 'USN', key: 'usn', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Section', key: 'section', width: 10 },
        { header: 'Internal', key: 'internal', width: 12 },
        { header: 'External', key: 'external', width: 12 },
        { header: 'Total', key: 'total', width: 12 },
        { header: 'Grade', key: 'grade', width: 10 },
        { header: 'Status', key: 'status', width: 12 }
      ];
      
      // Header styling - apply to each cell individually
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      
      const subjectResults = results.filter(r => r.subject_code === subjectCode);
      subjectResults.forEach(r => {
        const row = worksheet.addRow({
          usn: r.usn,
          name: r.name,
          section: r.section,
          internal: r.internal_marks,
          external: r.external_marks,
          total: r.total_marks,
          grade: r.letter_grade,
          status: r.result_status
        });
        
        // Color code status
        const statusCell = row.getCell('status');
        if (r.result_status === 'PASS' || r.result_status === 'P') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF51CF66' } };
          statusCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        } else if (r.result_status === 'FAIL' || r.result_status === 'F') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
          statusCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        }
      });
      
      // Add borders
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
      
      const filename = `${subjectCode}_${subjectName.replace(/[^a-zA-Z0-9]/g, '_')}_Batch${selectedBatch}_Sem${selectedSemester}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      
      alert('Subject-wise results exported!');
    } catch (err: any) {
      alert('Failed to export: ' + err.message);
    }
  };

  const exportOverallSemester = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Overall Semester Results');
      
      // Group by student and pivot subjects
      const studentMap = new Map<string, any>();
      const subjectCodes: string[] = [];
      
      results.forEach(r => {
        if (!studentMap.has(r.usn)) {
          studentMap.set(r.usn, {
            usn: r.usn,
            name: r.name,
            section: r.section,
            subjects: {},
            sgpa: r.sgpa ? parseFloat(r.sgpa.toString()).toFixed(2) : '-',
            percentage: r.percentage ? parseFloat(r.percentage.toString()).toFixed(2) : '-',
            class_grade: r.class_grade || '-',
            backlogs: r.backlog_count || 0
          });
        }
        const student = studentMap.get(r.usn);
        const code = r.subject_code;
        if (!subjectCodes.includes(code)) subjectCodes.push(code);
        student.subjects[code] = {
          internal: r.internal_marks,
          external: r.external_marks,
          total: r.total_marks,
          grade: r.letter_grade,
          status: r.result_status
        };
      });
      
      subjectCodes.sort();
      
      // Build columns dynamically
      const cols: any[] = [
        { header: 'USN', key: 'usn', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Section', key: 'section', width: 10 }
      ];
      
      subjectCodes.forEach(code => {
        cols.push(
          { header: `${code}_Int`, key: `${code}_int`, width: 10 },
          { header: `${code}_Ext`, key: `${code}_ext`, width: 10 },
          { header: `${code}_Total`, key: `${code}_total`, width: 10 },
          { header: `${code}_Grade`, key: `${code}_grade`, width: 10 }
        );
      });
      
      cols.push(
        { header: 'Total Marks', key: 'total_marks', width: 12 },
        { header: 'SGPA', key: 'sgpa', width: 10 },
        { header: 'Class Grade', key: 'class_grade', width: 12 },
        { header: 'Backlogs', key: 'backlogs', width: 12 }
      );
      
      worksheet.columns = cols;
      
      // Header styling - apply to each cell individually
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      
      // Add data rows
      Array.from(studentMap.values()).forEach(student => {
        const rowData: any = {
          usn: student.usn,
          name: student.name,
          section: student.section,
          sgpa: student.sgpa,
          class_grade: student.class_grade,
          backlogs: student.backlogs
        };
        
        let totalMarks = 0;
        subjectCodes.forEach(code => {
          const sub = student.subjects[code];
          if (sub) {
            rowData[`${code}_int`] = sub.internal;
            rowData[`${code}_ext`] = sub.external;
            rowData[`${code}_total`] = sub.total;
            rowData[`${code}_grade`] = sub.grade;
            totalMarks += sub.total || 0;
          } else {
            rowData[`${code}_int`] = '-';
            rowData[`${code}_ext`] = '-';
            rowData[`${code}_total`] = '-';
            rowData[`${code}_grade`] = '-';
          }
        });
        
        rowData.total_marks = totalMarks;
        
        const row = worksheet.addRow(rowData);
        
        // Color code grade cells based on pass/fail
        subjectCodes.forEach((code, idx) => {
          const sub = student.subjects[code];
          if (sub) {
            const gradeCell = row.getCell(`${code}_grade`);
            if (sub.status === 'PASS' || sub.status === 'P') {
              gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF51CF66' } };
              gradeCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            } else if (sub.status === 'FAIL' || sub.status === 'F') {
              gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
              gradeCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            }
          }
        });
        
        // Color code class grade
        const gradeCell = row.getCell('class_grade');
        const grade = student.class_grade;
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
        
        // Color code backlogs
        const backlogCell = row.getCell('backlogs');
        if (student.backlogs > 0) {
          backlogCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
          backlogCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        } else {
          backlogCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF51CF66' } };
          backlogCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        }
      });
      
      // Add borders to all cells
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
      
      const filename = `Overall_Semester_Results_Batch${selectedBatch}_Sem${selectedSemester}_${selectedSection !== 'all' ? 'Sec' + selectedSection : 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      
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
                style={{ border: 'none', background: viewMode === 'subject' ? '#f57c00' : '#eee', color: viewMode === 'subject' ? 'white' : '#666', borderRadius: '4px' }}
              >
                Subject-wise View
              </button>
              <button 
                onClick={() => setViewMode('student')} 
                className={`tab-btn ${viewMode === 'student' ? 'active' : ''}`}
                style={{ border: 'none', background: viewMode === 'student' ? '#f57c00' : '#eee', color: viewMode === 'student' ? 'white' : '#666', borderRadius: '4px' }}
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
