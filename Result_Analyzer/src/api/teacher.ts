import apiClient from './apiClient';

export interface Teacher {
  teacher_id: string;
  teacher_name: string;
}

export interface Subject {
  subject_code: string;
  subject_name: string;
  credits: number;
  semester: number;
  scheme: string;
}

export interface Section {
  section: string;
}

export interface TeacherAssignment {
  teacher_id: string;
  teacher_name: string;
  batch: number;
  section: string;
  subject_codes: string;
  subject_names: string;
}

export interface AssignTeacherRequest {
  teacherId: string;
  subjectCodes: string[];
  batch: number;
  section: string;
}

/**
 * Get all teachers from the database
 */
export const getAllTeachers = async (): Promise<Teacher[]> => {
  const response = await apiClient.get<{ success: boolean; teachers: Teacher[] }>('/api/teachers');
  return response.data.teachers;
};

/**
 * Get subjects filtered by batch and semester
 * Automatically detects scheme based on batch year
 */
export const getSubjectsByBatchSemester = async (
  batch: number,
  semester: number
): Promise<Subject[]> => {
  const response = await apiClient.get<{ success: boolean; subjects: Subject[] }>('/api/teachers/subjects', {
    params: { batch, semester }
  });
  return response.data.subjects;
};

/**
 * Get available sections for a specific batch
 * Dynamically fetched from student_details table
 */
export const getSections = async (batch: number): Promise<Section[]> => {
  const response = await apiClient.get<{ success: boolean; sections: Section[] }>('/api/teachers/sections', {
    params: { batch }
  });
  return response.data.sections;
};

/**
 * Assign a teacher to multiple subjects for a specific batch and section
 */
export const assignTeacherToSubjects = async (
  data: AssignTeacherRequest
): Promise<{ message: string; assignments: number }> => {
  const response = await apiClient.post<{ success: boolean; message: string; assignments: number }>(
    '/api/teachers/assign',
    data
  );
  return response.data;
};

/**
 * Get all teacher assignments
 * Returns assignments grouped by teacher, batch, and section
 */
export const getTeacherAssignments = async (): Promise<TeacherAssignment[]> => {
  const response = await apiClient.get<{ success: boolean; assignments: TeacherAssignment[] }>('/api/teachers/assignments');
  return response.data.assignments;
};

/**
 * Delete a teacher assignment for specific batch, section, and subject
 */
export const deleteTeacherAssignment = async (
  teacherId: string,
  batch: number,
  section: string,
  subjectCode: string
): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ success: boolean; message: string }>('/api/teachers/assignment', {
    params: { teacherId, batch, section, subjectCode }
  });
  return response.data;
};

/**
 * Validate adding a new section (admin only)
 * Note: Actual section creation happens when students are added
 */
export const addSection = async (
  batch: number,
  section: string
): Promise<{ message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>('/api/teachers/add-section', {
    batch,
    section
  });
  return response.data;
};
