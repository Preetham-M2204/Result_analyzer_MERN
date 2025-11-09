/**
 * Script to assign teacherId to teacher user in MongoDB
 * This links MongoDB user account to MySQL teacher record
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function assignTeacherId() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vtu_auth';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Find teacher by email
    const teacherEmail = 'abc@gmail.com';
    const teacherId = 'T-001'; // This should match the teacher_id in MySQL teachers table

    const teacher = await User.findOne({ email: teacherEmail });

    if (!teacher) {
      console.log(`❌ Teacher with email ${teacherEmail} not found in MongoDB`);
      console.log('Please create the user first using the admin panel');
      process.exit(1);
    }

    console.log(`\n📝 Found teacher: ${teacher.name} (${teacher.email})`);
    console.log(`   Current role: ${teacher.role}`);
    console.log(`   Current teacherId: ${teacher.teacherId || 'Not set'}`);

    // Update teacherId
    teacher.teacherId = teacherId;
    await teacher.save();

    console.log(`\n✅ Successfully assigned teacherId: ${teacherId} to ${teacher.name}`);
    console.log(`\nNow the teacher can:`);
    console.log(`1. Login with email: ${teacherEmail}`);
    console.log(`2. Access teacher dashboard`);
    console.log(`3. View subjects assigned to teacher_id '${teacherId}' in MySQL`);

    console.log(`\n⚠️  Make sure:`);
    console.log(`1. Teacher '${teacherId}' exists in MySQL teachers table`);
    console.log(`2. Subjects are assigned to '${teacherId}' in teacher_subject_assignments table`);
    console.log(`3. Results exist for those subjects in results table`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

assignTeacherId();
