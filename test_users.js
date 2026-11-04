import mongoose from 'mongoose';
import { Agent } from './src/models/Agent.js';
import { User } from './src/models/User.js';

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/realestate_crm');
  const agents = await Agent.find({}).lean();
  console.log('--- AGENTS IN COLLECTION ---');
  agents.forEach(a => {
    console.log(`Agent: "${a.fullName}" | Firm: "${a.agencyName || a.firmName}" | Email: "${a.email}" | Phone: "${a.phone}" | Status: "${a.accountStatus || a.status}" | Approved: ${a.isApproved}`);
  });

  const users = await User.find({}).lean();
  console.log('\n--- USERS IN COLLECTION ---');
  users.forEach(u => {
    console.log(`User: "${u.name}" | Role: "${u.role}" | Email: "${u.email}" | Phone: "${u.phone}" | Active: ${u.isActive}`);
  });
  process.exit();
}
check();
