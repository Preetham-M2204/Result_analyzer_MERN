/**
 * Quick Database Connection Test
 * Tests both MongoDB (Atlas) and MySQL (localhost)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { connectMongoDB, testMySQLConnection, mysqlPool } = require('./src/config/database');

async function testConnections() {
  console.log('='.repeat(60));
  console.log('🧪 TESTING DATABASE CONNECTIONS');
  console.log('='.repeat(60) + '\n');

  try {
    // Test MongoDB Connection
    await connectMongoDB();
    
    // Test MySQL Connection
    await testMySQLConnection();
    
    // Get some stats from MySQL
    console.log('📊 Quick MySQL Stats:');
    const [studentCount] = await mysqlPool.query('SELECT COUNT(*) as count FROM student_details');
    const [resultCount] = await mysqlPool.query('SELECT COUNT(*) as count FROM results');
    const [subjectCount] = await mysqlPool.query('SELECT COUNT(*) as count FROM subjects');
    
    console.log(`   👥 Students: ${studentCount[0].count}`);
    console.log(`   📝 Results: ${resultCount[0].count}`);
    console.log(`   📚 Subjects: ${subjectCount[0].count}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL CONNECTIONS WORKING!');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnections();
