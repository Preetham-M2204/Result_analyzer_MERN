/**
 * STUDENT DATA TYPES
 * ==================
 * TypeScript interfaces for student-related data
 */

/**
 * Student Profile
 */
export interface StudentProfile {
  usn: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  batch: number;
  discipline: 'VTU' | 'Autonomous';
  scheme: string;
  dob: string | null;
  section: string | null;
  cgpa: number | null;
}

/**
 * Subject Result
 */
export interface SubjectResult {
  subject_code: string;
  subject_name: string;
  credits: number;
  internal_marks: number;
  external_marks: number;
  total_marks: number;
  result_status: string;
}

/**
 * Semester Results Response
 */
export interface SemesterResults {
  success: boolean;
  semester: number;
  sgpa: number | null;
  results: SubjectResult[];
}

/**
 * Student Summary (Overall)
 */
export interface StudentSummary {
  success: boolean;
  cgpa: number | null;
  batch: number | null;
  backlogs: number;
  semesterWiseGPA: Array<{
    semester: number;
    sgpa: number;
  }>;
}

/**
 * Batch CGPA Distribution
 */
export interface BatchCGPAData {
  success: boolean;
  batch: number;
  distribution: Array<{
    cgpa_range: number;
    student_count: number;
  }>;
}

/**
 * Section CGPA Distribution
 */
export interface SectionCGPAData {
  success: boolean;
  section: string;
  batch: number;
  distribution: Array<{
    cgpa_range: number;
    student_count: number;
  }>;
}

/**
 * Class Rank
 */
export interface ClassRank {
  success: boolean;
  rank: number | null;
  total: number | null;
  section: string | null;
  message?: string;
}
