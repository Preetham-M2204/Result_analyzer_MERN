/**
 * DATABASE CONFIGURATION
 * ======================
 * This file manages connections to both databases:
 * 1. MongoDB - For user authentication (email, password, roles)
 * 2. MySQL - For student results data (existing resana database)
 */

const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
require('dotenv').config();

// ============================================================
// MONGODB CONNECTION (for Authentication)
// ============================================================

/**
 * connectMongoDB()
 * 
 * Purpose: Establishes connection to MongoDB for storing user credentials
 * Database: vtu_auth
 * Collections: users (contains Admin, HOD, Teacher, Student accounts)
 * 
 * Why MongoDB for auth?
 * - Fast document-based storage for user profiles
 * - Flexible schema for different user types (roles)
 * - Built-in ObjectId for unique user identification
 */
const connectMongoDB = async () => {
  try {
    // Get MongoDB connection string from .env file
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vtu_auth';
    
    // Extract host info for logging (hide password)
    const isAtlas = mongoURI.includes('mongodb.net');
    const isLocal = mongoURI.includes('localhost');
    let hostInfo = 'Unknown';
    
    if (isAtlas) {
      const match = mongoURI.match(/@([^/]+)/);
      hostInfo = match ? match[1] : 'MongoDB Atlas';
    } else if (isLocal) {
      hostInfo = 'localhost:27017';
    }
    
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   📍 Host: ${hostInfo}`);
    console.log(`   🗄️  Database: vtu_auth`);
    console.log(`   🌐 Provider: ${isAtlas ? 'MongoDB Atlas (Cloud)' : isLocal ? 'Local MongoDB' : 'Custom MongoDB'}`);
    
    // Connect to MongoDB with Atlas Stable API configuration
    await mongoose.connect(mongoURI, {
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      },
      dbName: 'vtu_auth'
    });
    
    console.log('✅ MongoDB connected successfully (Auth DB)\n');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1); // Exit if database connection fails
  }
};

// ============================================================
// MYSQL CONNECTION POOL (for Results Data)
// ============================================================

/**
 * MySQL Connection Pool
 * 
 * Purpose: Manages connections to existing MySQL database (resana)
 * Tables: student_details, subjects, results, student_semester_summary
 * 
 * Why Connection Pool?
 * - Reuses connections instead of creating new ones
 * - Better performance (10 connections ready to use)
 * - Prevents "too many connections" errors
 * - Automatically handles connection lifecycle
 */
const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'resana',
  waitForConnections: true,      // Wait if all connections are busy
  connectionLimit: 10,            // Maximum 10 simultaneous connections
  queueLimit: 0                   // Unlimited queue size for waiting queries
});

/**
 * testMySQLConnection()
 * 
 * Purpose: Verifies MySQL connection on server startup
 * Tests: Runs a simple query to ensure database is accessible
 */
const testMySQLConnection = async () => {
  try {
    const host = process.env.MYSQL_HOST || 'localhost';
    const database = process.env.MYSQL_DATABASE || 'resana';
    const user = process.env.MYSQL_USER || 'root';
    
    // Determine provider
    const isCleverCloud = host.includes('clever-cloud.com');
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    
    console.log('🔌 Connecting to MySQL...');
    console.log(`   📍 Host: ${host}`);
    console.log(`   🗄️  Database: ${database}`);
    console.log(`   👤 User: ${user}`);
    console.log(`   🌐 Provider: ${isCleverCloud ? 'Clever Cloud (Cloud)' : isLocal ? 'Local MySQL' : 'Custom MySQL'}`);
    
    // Execute a test query
    const [rows] = await mysqlPool.query('SELECT 1 + 1 AS result');
    console.log('✅ MySQL connected successfully (Results DB)\n');
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    process.exit(1); // Exit if database connection fails
  }
};

// ============================================================
// EXPORT CONNECTIONS
// ============================================================

module.exports = {
  connectMongoDB,      // MongoDB connection function
  testMySQLConnection, // MySQL test function
  mysqlPool            // MySQL connection pool (use this for all queries)
};
