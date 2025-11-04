const axios = require('axios');
const { mysqlPool } = require('../config/database');

const SCRAPER_SERVICE_URL = 'http://localhost:8000';
const activeSessions = new Map();

exports.startVTUScraper = async (req, res) => {
  try {
    const { url, mode, usn, batchYear, semester, workers } = req.body;

    if (!url || !semester) {
      return res.status(400).json({ success: false, message: 'URL and semester are required' });
    }

    let students = [];
    let scheme = '22'; // Default scheme

    if (mode === 'single') {
      if (!usn) return res.status(400).json({ success: false, message: 'USN required' });
      students = [usn.toUpperCase()];
      
      // Get scheme from database for this student
      const [rows] = await mysqlPool.execute('SELECT scheme FROM student_details WHERE usn = ?', [usn.toUpperCase()]);
      if (rows.length > 0 && rows[0].scheme) {
        scheme = rows[0].scheme;
      }
    } else if (mode === 'batch') {
      if (!batchYear) return res.status(400).json({ success: false, message: 'Batch year required' });
      
      // Auto-detect scheme from batch year
      // 2021 batch = 21 scheme
      // 2022+ batch = 22 scheme
      scheme = batchYear <= 2021 ? '21' : '22';
      
      // Fetch all students from this batch
      const [rows] = await mysqlPool.execute('SELECT usn FROM student_details WHERE batch = ? ORDER BY usn', [batchYear]);
      students = rows.map(row => row.usn);
      if (students.length === 0) return res.status(404).json({ success: false, message: 'No students found' });
    }

    const sessionId = `vtu_${Date.now()}`;
    activeSessions.set(sessionId, { type: 'vtu', status: 'running', total: students.length, processed: 0, success: 0, failed: 0, failures: [], startTime: new Date(), batch: batchYear, scheme });

    res.status(200).json({ success: true, message: 'Scraper started', data: { sessionId, totalUSNs: students.length, workers: workers || 20, scheme } });

    (async () => {
      try {
        const response = await axios.post(`${SCRAPER_SERVICE_URL}/scrape/vtu`, { url, semester, scheme, usns: students, workers: workers || 20 });
        const session = activeSessions.get(sessionId);
        if (session) {
          session.status = 'completed';
          session.processed = response.data.total;
          session.success = response.data.succeeded;
          session.failed = response.data.failed;
          session.failures = response.data.failed_usns;
          session.endTime = new Date();
          session.timeTaken = response.data.time_taken;
        }
      } catch (error) {
        const session = activeSessions.get(sessionId);
        if (session) {
          session.status = 'failed';
          session.error = error.message;
          session.endTime = new Date();
        }
      }
    })();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to start scraper', error: error.message });
  }
};

exports.getScraperProgress = async (req, res) => {
  try {
    const session = activeSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    
    // Add percentage calculation
    const sessionWithPercentage = {
      ...session,
      percentage: session.total > 0 ? Math.round((session.processed / session.total) * 100) : 0
    };
    
    res.status(200).json({ success: true, data: sessionWithPercentage });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get progress', error: error.message });
  }
};

exports.stopScraper = async (req, res) => {
  try {
    const session = activeSessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status !== 'running') return res.status(400).json({ success: false, message: 'Session not running' });
    session.status = 'stopped';
    session.endTime = new Date();
    res.status(200).json({ success: true, message: 'Scraper stopped' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to stop scraper', error: error.message });
  }
};

exports.getAllSessions = async (req, res) => {
  try {
    const sessions = Array.from(activeSessions.entries()).map(([id, data]) => ({ sessionId: id, ...data }));
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get sessions', error: error.message });
  }
};

exports.healthCheck = async (req, res) => {
  try {
    const response = await axios.get(`${SCRAPER_SERVICE_URL}/health`, { timeout: 5000 });
    res.status(200).json({ success: true, fastapi: response.data.status === 'healthy', service: response.data.service });
  } catch (error) {
    res.status(503).json({ success: false, fastapi: false, message: 'FastAPI service not reachable' });
  }
};

/**
 * Start Autonomous Scraper
 * Scrapes results from BIT autonomous website (requires USN + DOB)
 */
exports.startAutonomousScraper = async (req, res) => {
  try {
    const { url, mode, usn, batchYear, workers } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }

    let students = [];
    if (mode === 'single') {
      if (!usn) return res.status(400).json({ success: false, message: 'USN required for single mode' });
      // Fetch DOB for single student
      const [rows] = await mysqlPool.execute('SELECT usn, dob FROM student_details WHERE usn = ?', [usn.toUpperCase()]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found or DOB missing' });
      students = rows.map(row => ({ usn: row.usn, dob: row.dob }));
    } else if (mode === 'batch') {
      if (!batchYear) return res.status(400).json({ success: false, message: 'Batch year required for batch mode' });
      // Fetch all students with DOB
      const [rows] = await mysqlPool.execute('SELECT usn, dob FROM student_details WHERE batch = ? AND dob IS NOT NULL ORDER BY usn', [batchYear]);
      students = rows.map(row => ({ usn: row.usn, dob: row.dob }));
      if (students.length === 0) return res.status(404).json({ success: false, message: 'No students found with DOB' });
    }

    const sessionId = `auto_${Date.now()}`;
    activeSessions.set(sessionId, { type: 'autonomous', status: 'running', total: students.length, processed: 0, success: 0, failed: 0, failures: [], startTime: new Date() });

    res.status(200).json({ success: true, message: 'Autonomous scraper started', data: { sessionId, totalUSNs: students.length, workers: workers || 5 } });

    (async () => {
      try {
        const response = await axios.post(`${SCRAPER_SERVICE_URL}/scrape/autonomous`, { url, students, workers: workers || 5 });
        const session = activeSessions.get(sessionId);
        if (session) {
          session.status = 'completed';
          session.processed = response.data.total;
          session.success = response.data.succeeded;
          session.failed = response.data.failed;
          session.failures = response.data.failed_usns;
          session.endTime = new Date();
          session.timeTaken = response.data.time_taken;
        }
      } catch (error) {
        const session = activeSessions.get(sessionId);
        if (session) {
          session.status = 'failed';
          session.error = error.message;
          session.endTime = new Date();
        }
      }
    })();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to start autonomous scraper', error: error.message });
  }
};

/**
 * Retry Failed USNs
 * Re-scrapes only the failed USNs from a completed session
 */
exports.retryFailedUSNs = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const originalSession = activeSessions.get(sessionId);

    if (!originalSession) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (originalSession.status === 'running') {
      return res.status(400).json({ success: false, message: 'Cannot retry while scraper is still running' });
    }

    if (!originalSession.failures || originalSession.failures.length === 0) {
      return res.status(400).json({ success: false, message: 'No failed USNs to retry' });
    }

    const failedUSNs = originalSession.failures;
    const newSessionId = `retry_${sessionId}_${Date.now()}`;

    // Create retry session
    activeSessions.set(newSessionId, {
      type: originalSession.type,
      status: 'running',
      total: failedUSNs.length,
      processed: 0,
      success: 0,
      failed: 0,
      failures: [],
      startTime: new Date(),
      isRetry: true,
      originalSessionId: sessionId
    });

    res.status(200).json({
      success: true,
      message: `Retrying ${failedUSNs.length} failed USNs`,
      data: {
        sessionId: newSessionId,
        totalUSNs: failedUSNs.length,
        originalSessionId: sessionId
      }
    });

    // Execute retry based on scraper type
    (async () => {
      try {
        let response;
        
        if (originalSession.type === 'vtu') {
          // Get original parameters from request or use session data
          const vtuUrl = req.body.url || 'https://results.vtu.ac.in/DJcbcs24/index.php';
          const semester = req.body.semester || 3;
          const workers = req.body.workers || 20;

          // Auto-detect scheme from first failed USN's batch year
          let scheme = originalSession.scheme || '22';
          if (!originalSession.scheme && failedUSNs.length > 0) {
            const [rows] = await mysqlPool.execute('SELECT batch, scheme FROM student_details WHERE usn = ?', [failedUSNs[0]]);
            if (rows.length > 0) {
              scheme = rows[0].scheme || (rows[0].batch <= 2021 ? '21' : '22');
            }
          }

          response = await axios.post(`${SCRAPER_SERVICE_URL}/scrape/vtu`, {
            url: vtuUrl,
            semester,
            scheme,
            usns: failedUSNs,
            workers
          });
        } else if (originalSession.type === 'autonomous') {
          // Fetch DOBs for failed USNs
          const placeholders = failedUSNs.map(() => '?').join(',');
          const [rows] = await mysqlPool.execute(
            `SELECT usn, dob FROM student_details WHERE usn IN (${placeholders})`,
            failedUSNs
          );
          const students = rows.map(row => ({ usn: row.usn, dob: row.dob }));

          const autoUrl = req.body.url || 'https://ioncudos.in/bit_online_results/';
          const workers = req.body.workers || 5;

          response = await axios.post(`${SCRAPER_SERVICE_URL}/scrape/autonomous`, {
            url: autoUrl,
            students,
            workers
          });
        }

        const retrySession = activeSessions.get(newSessionId);
        if (retrySession) {
          retrySession.status = 'completed';
          retrySession.processed = response.data.total;
          retrySession.success = response.data.succeeded;
          retrySession.failed = response.data.failed;
          retrySession.failures = response.data.failed_usns;
          retrySession.endTime = new Date();
          retrySession.timeTaken = response.data.time_taken;
        }
      } catch (error) {
        const retrySession = activeSessions.get(newSessionId);
        if (retrySession) {
          retrySession.status = 'failed';
          retrySession.error = error.message;
          retrySession.endTime = new Date();
        }
      }
    })();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retry scraper', error: error.message });
  }
};
