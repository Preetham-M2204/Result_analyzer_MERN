/**
 * HOD ROUTES TEST SCRIPT
 * ======================
 * Tests all HOD endpoints to verify they're accessible and working
 * 
 * Usage: node test-hod-routes.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const HOD_CREDENTIALS = {
  email: 'examplemail@gmail.com',
  password: 'T001'
};

let authToken = null;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testLogin() {
  logSection('TEST 1: HOD Login');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, HOD_CREDENTIALS);
    
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      log('✅ Login successful', 'green');
      log(`   Token: ${authToken.substring(0, 20)}...`, 'blue');
      log(`   User: ${response.data.user.email} (${response.data.user.role})`, 'blue');
      return true;
    } else {
      log('❌ Login failed: No token received', 'red');
      return false;
    }
  } catch (error) {
    log('❌ Login failed', 'red');
    log(`   Error: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function testRoute(method, path, description) {
  const fullUrl = `${BASE_URL}${path}`;
  
  try {
    const config = {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    };
    
    log(`📡 Testing: ${method} ${fullUrl}`, 'cyan');
    
    const response = await axios[method.toLowerCase()](fullUrl, config);
    
    log(`✅ ${description}`, 'green');
    log(`   URL: ${fullUrl}`, 'blue');
    log(`   Status: ${response.status}`, 'blue');
    log(`   Success: ${response.data.success}`, 'blue');
    
    if (response.data.data) {
      const dataType = Array.isArray(response.data.data) ? 'array' : 'object';
      const dataLength = Array.isArray(response.data.data) ? response.data.data.length : Object.keys(response.data.data).length;
      log(`   Data: ${dataType} (${dataLength} items)`, 'blue');
      
      // Show sample of returned data
      if (Array.isArray(response.data.data) && response.data.data.length > 0) {
        log(`   Sample: ${JSON.stringify(response.data.data[0]).substring(0, 100)}...`, 'blue');
      }
    }
    
    return true;
  } catch (error) {
    log(`❌ ${description}`, 'red');
    log(`   URL: ${fullUrl}`, 'blue');
    log(`   Status: ${error.response?.status}`, 'red');
    log(`   Error: ${error.response?.data?.message || error.message}`, 'red');
    
    if (error.response?.status === 404) {
      log(`   ⚠️  Route not found! Check if route is registered in server.js`, 'yellow');
    } else if (error.response?.status === 401) {
      log(`   ⚠️  Unauthorized! Check auth middleware`, 'yellow');
    } else if (error.response?.status === 403) {
      log(`   ⚠️  Forbidden! Check role middleware`, 'yellow');
    }
    
    return false;
  }
}

async function runTests() {
  log('\n🚀 Starting HOD Routes Test Suite', 'cyan');
  log(`   Backend URL: ${BASE_URL}`, 'blue');
  log(`   Testing as: ${HOD_CREDENTIALS.email}`, 'blue');
  
  // Test 1: Login
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    log('\n❌ Cannot continue without valid authentication', 'red');
    process.exit(1);
  }
  
  // Test 2: HOD Routes
  logSection('TEST 2: HOD Routes');
  
  const routes = [
    { method: 'GET', path: '/api/hod/overview', description: 'Get overview statistics' },
    { method: 'GET', path: '/api/hod/top-performers/cgpa', description: 'Get top performers by CGPA' },
    { method: 'GET', path: '/api/hod/top-performers/cgpa?limit=5', description: 'Get top 5 performers by CGPA' },
    { method: 'GET', path: '/api/hod/top-performers/cgpa?batch=2023', description: 'Get batch 2023 top performers' },
    { method: 'GET', path: '/api/hod/top-performers/total-marks', description: 'Get top performers by total marks' },
    { method: 'GET', path: '/api/hod/top-performers/semester-marks?semester=4', description: 'Get top performers by semester marks' },
    { method: 'GET', path: '/api/hod/batch-statistics', description: 'Get batch statistics' },
    { method: 'GET', path: '/api/hod/subject-analytics', description: 'Get subject analytics' },
    { method: 'GET', path: '/api/hod/section-comparison', description: 'Get section comparison' }
  ];
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const route of routes) {
    const success = await testRoute(route.method, route.path, route.description);
    if (success) {
      passedTests++;
    } else {
      failedTests++;
    }
    console.log(''); // Empty line between tests
  }
  
  // Summary
  logSection('TEST SUMMARY');
  log(`Total tests: ${routes.length + 1}`, 'blue');
  log(`✅ Passed: ${passedTests + 1}`, 'green');
  log(`❌ Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  
  if (failedTests === 0) {
    log('\n🎉 All tests passed! HOD routes are working correctly.', 'green');
  } else {
    log(`\n⚠️  ${failedTests} test(s) failed. Check the errors above.`, 'yellow');
  }
}

// Run tests
runTests().catch(error => {
  log('\n💥 Test suite crashed:', 'red');
  log(error.message, 'red');
  process.exit(1);
});
