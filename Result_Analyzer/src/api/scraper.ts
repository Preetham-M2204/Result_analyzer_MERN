/**
 * SCRAPER API
 * ===========
 * API wrapper functions for scraper operations
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/scraper';

// Get authorization header with JWT token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

/**
 * Start VTU Scraper
 */
export const startVTUScraper = async (scraperData: {
  url: string;
  mode: 'single' | 'batch';
  usn?: string;
  batchYear?: string;
  semester: number;
  scheme: string;
  workers?: number;
}) => {
  const response = await axios.post(`${API_BASE}/vtu/start`, scraperData, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Start Autonomous Scraper
 */
export const startAutonomousScraper = async (scraperData: {
  url: string;
  mode: 'single' | 'batch';
  usn?: string;
  batchYear?: string;
  workers?: number;
}) => {
  const response = await axios.post(`${API_BASE}/autonomous/start`, scraperData, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Get Scraper Progress
 */
export const getScraperProgress = async (sessionId: string) => {
  const response = await axios.get(`${API_BASE}/progress/${sessionId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Stop Scraper
 */
export const stopScraper = async (sessionId: string) => {
  const response = await axios.post(`${API_BASE}/stop/${sessionId}`, {}, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Retry Failed USNs
 */
export const retryFailedUSNs = async (sessionId: string, params: {
  url?: string;
  semester?: number;
  scheme?: string;
  workers?: number;
}) => {
  const response = await axios.post(`${API_BASE}/retry/${sessionId}`, params, {
    headers: getAuthHeader()
  });
  return response.data;
};
