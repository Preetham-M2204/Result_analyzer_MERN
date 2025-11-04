/**
 * STUDENT API FUNCTIONS
 * =====================
 * All API calls for student features
 */

import apiClient from './apiClient';
import type {
  StudentProfile,
  SemesterResults,
  StudentSummary,
  BatchCGPAData,
  SectionCGPAData,
  ClassRank
} from '../types/student.types';

/**
 * Get Student Profile
 */
export const getProfile = async (): Promise<{ success: boolean; profile: StudentProfile }> => {
  const response = await apiClient.get('/api/student/profile');
  return response.data;
};

/**
 * Update Student Profile
 */
export const updateProfile = async (data: { section: string }): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.put('/api/student/profile', data);
  return response.data;
};

/**
 * Get Student Summary (CGPA, Backlogs, Semester-wise SGPA)
 */
export const getSummary = async (): Promise<StudentSummary> => {
  const response = await apiClient.get('/api/student/summary');
  return response.data;
};

/**
 * Get Semester Results
 */
export const getSemesterResults = async (semester: number): Promise<SemesterResults> => {
  const response = await apiClient.get(`/api/student/results/${semester}`);
  return response.data;
};

/**
 * Get Batch CGPA Distribution
 */
export const getBatchCGPA = async (): Promise<BatchCGPAData> => {
  const response = await apiClient.get('/api/student/batch-cgpa');
  return response.data;
};

/**
 * Get Section CGPA Distribution
 */
export const getSectionCGPA = async (): Promise<SectionCGPAData> => {
  const response = await apiClient.get('/api/student/section-cgpa');
  return response.data;
};

/**
 * Get Class Rank
 */
export const getClassRank = async (semester: number): Promise<ClassRank> => {
  const response = await apiClient.get(`/api/student/rank/${semester}`);
  return response.data;
};
