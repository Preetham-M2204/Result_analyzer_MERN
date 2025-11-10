/**
 * SCRAPER ROUTES
 * ==============
 * Admin scraper control endpoints for both VTU and Autonomous scrapers
 */

const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');
const { verifyToken, requireRole } = require('../middleware/auth');

// All routes require ADMIN role
router.use(verifyToken, requireRole('ADMIN'));

// Start VTU scraper
router.post('/vtu/start', scraperController.startVTUScraper);

// Start Autonomous scraper
router.post('/autonomous/start', scraperController.startAutonomousScraper);

// Start RV (Revaluation) scraper
router.post('/rv/start', scraperController.startRVScraper);

// Retry failed USNs from a session
router.post('/retry/:sessionId', scraperController.retryFailedUSNs);

// Get scraper progress
router.get('/progress/:sessionId', scraperController.getScraperProgress);

// Stop running scraper
router.post('/stop/:sessionId', scraperController.stopScraper);

// Get all sessions
router.get('/sessions', scraperController.getAllSessions);

// Health check (FastAPI service)
router.get('/health', scraperController.healthCheck);

module.exports = router;
