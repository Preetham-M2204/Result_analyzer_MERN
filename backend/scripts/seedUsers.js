/**
 * Script to seed initial users in MongoDB
 * Run this ONCE after MongoDB is set up
 * Usage: node scripts/seedUsers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vtu_auth';

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'HOD', 'TEACHER', 'STUDENT'], required: true },
  
  // Role-specific IDs
  adminId: { type: String },
  hodId: { type: String },
  teacherId: { type: String },
  usn: { type: String },
  
  name: { type: String },
  mustChangePassword: { type: Boolean, default: true },
  
  // Teacher-specific
  assignedSubjects: [{ type: String }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Seed data
const seedUsers = [
  {
    email: 'admin@gmail.com',
    password: 'admin123',
    role: 'ADMIN',
    adminId: 'ADMIN001',
    name: 'System Administrator',
    mustChangePassword: true
  },
  {
    email: 'examplemail@gmail.com',
    password: 'T001',
    role: 'HOD',
    hodId: 'T001',
    name: 'Head of Department',
    mustChangePassword: true
  },
  {
    email: 'abc@gmail.com',
    password: 'T010',
    role: 'TEACHER',
    teacherId: 'T010',
    name: 'Faculty Member',
    assignedSubjects: [], // Will be assigned via admin panel
    mustChangePassword: true
  },
  {
    email: 'mypt1991@gmail.com',
    password: '1BI23IS082',
    role: 'STUDENT',
    usn: '1BI23IS082',
    name: null, // Will be fetched from MySQL
    mustChangePassword: true
  }
];

async function seedDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing users (optional - comment out if you want to keep existing)
    console.log('🗑️  Clearing existing users...');
    await User.deleteMany({});
    console.log('✅ Cleared\n');

    console.log('👥 Creating seed users...\n');

    for (const userData of seedUsers) {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = new User({
        ...userData,
        password: hashedPassword
      });

      await user.save();
      console.log(`✅ Created: ${userData.role} - ${userData.email}`);
    }

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('━'.repeat(60));
    console.log('Admin:   admin@gmail.com / admin123');
    console.log('HOD:     examplemail@gmail.com / T001');
    console.log('Teacher: abc@gmail.com / T010');
    console.log('Student: mypt1991@gmail.com / 1BI23IS082');
    console.log('━'.repeat(60));
    console.log('\n⚠️  All users must change password on first login\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seedDatabase();
