/**
 * ADMIN API
 * =========
 * API wrapper functions for admin operations
 */

import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin`;

// Get authorization header with JWT token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

/**
 * Get System Statistics
 */
export const getAdminStats = async () => {
  const response = await axios.get(`${API_BASE}/stats`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Get All Users (with pagination and filtering)
 */
export const getAllUsers = async (role?: string, page?: number, limit?: number) => {
  const params: any = {};
  if (role) params.role = role;
  if (page) params.page = page;
  if (limit) params.limit = limit;

  const response = await axios.get(`${API_BASE}/users`, {
    headers: getAuthHeader(),
    params
  });
  return response.data;
};

/**
 * Create New User
 */
export const createUser = async (userData: {
  name: string;
  email: string;
  password: string;
  role: string;
  usn?: string;
}) => {
  const response = await axios.post(`${API_BASE}/users`, userData, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Update User
 */
export const updateUser = async (userId: string, userData: {
  name?: string;
  email?: string;
  role?: string;
  mustChangePassword?: boolean;
}) => {
  const response = await axios.put(`${API_BASE}/users/${userId}`, userData, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Delete User
 */
export const deleteUser = async (userId: string) => {
  const response = await axios.delete(`${API_BASE}/users/${userId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Reset User Password
 */
export const resetUserPassword = async (userId: string, newPassword: string) => {
  const response = await axios.post(
    `${API_BASE}/users/${userId}/reset-password`,
    { newPassword },
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Get All Students (for batch scraping)
 */
export const getAllStudents = async (batch?: string, section?: string) => {
  const params: any = {};
  if (batch) params.batch = batch;
  if (section) params.section = section;

  const response = await axios.get(`${API_BASE}/students`, {
    headers: getAuthHeader(),
    params
  });
  return response.data;
};

/**
 * Add Single Student
 */
export const addStudent = async (studentData: {
  usn: string;
  name: string;
  batch: number;
  section?: string;
  scheme: string;
  dob?: string;
}) => {
  const response = await axios.post(`${API_BASE}/students/add`, studentData, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Bulk Import Students
 */
export const bulkImportStudents = async (students: Array<{
  usn: string;
  name: string;
  batch: number;
  discipline: string;
  scheme: string;
  section?: string | null;
  gender?: string | null;
  dob?: string | null;
}>) => {
  const response = await axios.post(`${API_BASE}/students/bulk`, { students }, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Get All Subjects
 */
export const getAllSubjects = async () => {
  const response = await axios.get(`${API_BASE}/subjects`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Add Single Subject
 */
export const addSubject = async (subjectData: {
  subjectCode: string;
  subjectName: string;
  semester: number;
  credits: number;
  scheme: string;
  isPlaceholder?: string | boolean;
}) => {
  const response = await axios.post(`${API_BASE}/subjects/add`, subjectData, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Bulk Import Subjects
 */
export const bulkImportSubjects = async (subjects: Array<{
  subjectCode: string;
  subjectName: string;
  semester: number;
  credits: number;
  scheme: string;
  isPlaceholder?: string | boolean;
}>) => {
  const response = await axios.post(`${API_BASE}/subjects/bulk`, { subjects }, {
    headers: getAuthHeader()
  });
  return response.data;
};
