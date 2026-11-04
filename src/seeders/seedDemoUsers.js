import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { Plan } from '../models/Plan.js';

dotenv.config();

const seedAllUsers = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/realestate_crm';
    console.log(`[Connecting to MongoDB]: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    // 1. Seed or find a Plan
    let plan = await Plan.findOne({ name: 'Enterprise Elite' });
    if (!plan) {
      plan = await Plan.create({
        name: 'Enterprise Elite',
        price: 14999,
        duration: 'Yearly',
        userLimit: 50,
        projectLimit: 25,
        features: ['Full Telephony Calling', 'WhatsApp Cloud API', 'Unlimited Leads', 'Custom Roles'],
        status: 'Active',
        isPopular: true
      });
      console.log('✅ Plan Created');
    }

    // 2. Seed Demo Company
    let company = await Company.findOne({ email: 'admin@abcdevelopers.com' });
    if (!company) {
      company = await Company.create({
        name: 'ABC Developers Pvt. Ltd.',
        ownerName: 'Vikram Singhania',
        email: 'admin@abcdevelopers.com',
        phone: '+91 98765 43210',
        plan: 'Enterprise Elite',
        planPrice: '₹14,999/yr',
        status: 'Active',
        usersLimit: 50,
        projectsLimit: 25,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
      console.log('✅ Demo Company Created');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // 3. Demo Users for all 5 roles
    const demoUsers = [
      {
        name: 'Super Administrator',
        email: 'superadmin@crm.com',
        phone: '+91 99999 88888',
        role: 'superadmin',
        badge: 'Platform Super Admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        permissions: ['ALL_PERMISSIONS', 'PLATFORM_SUPERADMIN']
      },
      {
        name: 'Vikram Singhania (Owner)',
        email: 'admin@abcdevelopers.com',
        phone: '+91 98765 43210',
        role: 'company_admin',
        badge: 'Company Admin / Owner',
        companyId: company._id,
        companyName: company.name,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        permissions: ['COMPANY_ADMIN', 'MANAGE_PROJECTS', 'MANAGE_STAFF']
      },
      {
        name: 'Rajesh Sharma (Sales Head)',
        email: 'manager@abcdevelopers.com',
        phone: '+91 98111 22334',
        role: 'manager',
        badge: 'Sales Manager',
        companyId: company._id,
        companyName: company.name,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        permissions: ['LEAD_ASSIGNMENT', 'APPROVE_DISCOUNTS', 'TEAM_REPORTS']
      },
      {
        name: 'Amit Kumar (Sales Exec)',
        email: 'sales@abcdevelopers.com',
        phone: '+91 98222 33445',
        role: 'sales_user',
        badge: 'Sales Executive / Telecaller',
        companyId: company._id,
        companyName: company.name,
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
        permissions: ['TELECALLING', 'ADD_LEAD', 'SCHEDULE_VISIT']
      },
      {
        name: 'Sharma Properties (CP)',
        email: 'agent@sharmaproperties.com',
        phone: '+91 98333 44556',
        role: 'agent',
        badge: 'Channel Partner / Broker',
        companyId: company._id,
        companyName: company.name,
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
        permissions: ['SUBMIT_CLIENT', 'VIEW_COMMISSION', 'INVENTORY_VIEW']
      }
    ];

    for (const u of demoUsers) {
      await User.findOneAndUpdate(
        { email: u.email },
        { ...u, password: hashedPassword, isActive: true },
        { upsert: true, new: true }
      );
      console.log(`✅ User seeded: [${u.role}] -> ${u.email}`);
    }

    console.log('\n🚀 ALL 5 ROLES SEEDED IN MONGODB WITH FULL AUTH:');
    console.log('Password for all users: password123');
    process.exit(0);
  } catch (err) {
    console.error('Seeder Error:', err);
    process.exit(1);
  }
};

seedAllUsers();
