/**
 * Script to update teacher's display name in MongoDB
 * Links the name shown in dashboard to actual teacher name
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function updateTeacherName() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vtu_auth';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Find teacher by email
    const teacherEmail = 'abc@gmail.com';
    const teacherName = 'Prof T Shilpa'; // This should match the teacher_name in MySQL teachers table

    const teacher = await User.findOne({ email: teacherEmail });

    if (!teacher) {
      console.log(`❌ Teacher with email ${teacherEmail} not found in MongoDB`);
      console.log('Please create the user first using the admin panel');
      process.exit(1);
    }

    console.log(`\n📝 Found teacher: ${teacher.name} (${teacher.email})`);
    console.log(`   Current role: ${teacher.role}`);
    console.log(`   Current teacherId: ${teacher.teacherId || 'Not set'}`);
    console.log(`   Current name: ${teacher.name || 'Not set'}`);

    // Update name
    const previousName = teacher.name;
    teacher.name = teacherName;
    await teacher.save();

    console.log(`\n✅ Successfully updated name: "${previousName}" → "${teacherName}"`);
    console.log(`\nNow the dashboard will show:`);
    console.log(`   "Welcome, ${teacherName}" instead of "Welcome, ${previousName}"`);

    console.log(`\n⚠️  Note: User needs to logout and login again to see the updated name`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateTeacherName();
