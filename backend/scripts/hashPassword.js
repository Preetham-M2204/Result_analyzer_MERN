/**
 * Script to generate bcrypt password hashes
 * Usage: node scripts/hashPassword.js
 */

const bcrypt = require('bcrypt');

const passwords = [
  { user: 'Admin', password: 'admin123' },
  { user: 'HOD (T001)', password: 'T001' },
  { user: 'Teacher (T010)', password: 'T010' },
  { user: 'Student (1BI23IS082)', password: '1BI23IS082' }
];

async function generateHashes() {
  console.log('\n🔐 Generating Password Hashes...\n');
  
  for (const item of passwords) {
    const hash = await bcrypt.hash(item.password, 10);
    console.log(`${item.user}:`);
    console.log(`  Plain: ${item.password}`);
    console.log(`  Hash:  ${hash}\n`);
  }
}

generateHashes();
