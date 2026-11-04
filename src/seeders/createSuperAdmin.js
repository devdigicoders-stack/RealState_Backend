import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

dotenv.config();

const createSuperAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/realestate_crm';
    console.log(`[Connecting to MongoDB]: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    const superAdminEmail = 'superadmin@crm.com';
    const plainPassword = 'password123';

    // Check if Super Admin already exists
    let superAdmin = await User.findOne({ email: superAdminEmail });

    if (superAdmin) {
      console.log(`[Found Existing Super Admin]: ${superAdmin.email}. Updating password & role...`);
      superAdmin.password = plainPassword; // pre('save') will hash this automatically
      superAdmin.role = 'superadmin';
      superAdmin.badge = 'Platform Super Admin';
      superAdmin.isActive = true;
      await superAdmin.save();
      console.log('✅ Super Admin credentials updated successfully!');
    } else {
      console.log(`[Creating New Super Admin]: ${superAdminEmail}...`);

      superAdmin = await User.create({
        name: 'Super Administrator',
        email: superAdminEmail,
        password: plainPassword, // pre('save') will hash this automatically
        role: 'superadmin',
        badge: 'Platform Super Admin',
        phone: '+91 99999 88888',
        isActive: true,
        permissions: ['ALL_PERMISSIONS', 'PLATFORM_SUPERADMIN']
      });
      console.log('✅ Super Admin created successfully!');
    }

    console.log('----------------------------------------------------');
    console.log('🛡️  SUPER ADMIN LOGIN CREDENTIALS:');
    console.log(`📧 Email:    ${superAdminEmail}`);
    console.log(`🔑 Password: ${plainPassword}`);
    console.log(`👑 Role:     superadmin`);
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error.message);
    process.exit(1);
  }
};

createSuperAdmin();

