import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide user name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please provide email'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Please provide password'],
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ['superadmin', 'company_admin', 'manager', 'sales_user', 'agent'],
      default: 'sales_user'
    },
    phone: {
      type: String,
      trim: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null
    },
    companyName: {
      type: String,
      default: ''
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null
    },
    branchName: {
      type: String,
      default: ''
    },
    badge: {
      type: String,
      default: ''
    },
    permissions: [{
      type: String
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    commissionTier: {
      type: String,
      default: '2.5% on Agreement'
    },

    // 1. Personal Information
    gender: { type: String, default: 'Male' },
    dob: { type: String, default: '' },
    fatherName: { type: String, default: '' },
    alternatePhone: { type: String, default: '' },
    personalEmail: { type: String, default: '' },
    currentAddress: { type: String, default: '' },
    permanentAddress: { type: String, default: '' },

    // 2. Employment Information
    employeeId: { type: String, default: '' },
    designation: { type: String, default: '' },
    department: { type: String, default: '' },
    reportingManager: { type: String, default: '' },
    reportingManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joiningDate: { type: String, default: '' },
    employmentType: { type: String, default: 'Full Time' }, // Full Time, Part Time, Contract, Internship
    workLocation: { type: String, default: 'Office' }, // Office, Remote, Hybrid
    employmentStatus: { type: String, default: 'Active' }, // Active, Probation, Inactive

    // 3. Professional Information
    previousCompany: { type: String, default: '' },
    previousDesignation: { type: String, default: '' },
    totalExperience: { type: String, default: '' },
    relevantExperience: { type: String, default: '' },
    skills: [{ type: String }],
    previousSalary: { type: String, default: '' },

    // 4. Salary Information
    salaryType: { type: String, default: 'Monthly' }, // Monthly / Annual
    basicSalary: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    incentives: { type: String, default: '' },
    monthlyCtc: { type: Number, default: 0 },
    paymentMode: { type: String, default: 'Bank Transfer' },
    bankDetails: {
      accountHolderName: { type: String, default: '' },
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' }
    },

    // 5. Identity & Documents
    aadhaarNumber: { type: String, default: '' },
    panNumber: { type: String, default: '' },
    aadhaarDoc: { type: String, default: '' },
    panCardDoc: { type: String, default: '' },
    resumeDoc: { type: String, default: '' },
    photoDoc: { type: String, default: '' },
    experienceLetterDoc: { type: String, default: '' },
    educationCertDoc: { type: String, default: '' },
    addressProofDoc: { type: String, default: '' },
    offerLetterDoc: { type: String, default: '' },
    joiningLetterDoc: { type: String, default: '' },

    // 6. Sales Permissions & Assignment
    assignedProjects: [{ type: String }],
    assignedTeam: { type: String, default: '' },
    leadAccess: { type: String, default: 'Own' }, // Own / Team
    callingAccess: { type: Boolean, default: true },
    followUpAccess: { type: Boolean, default: true },
    siteVisitAccess: { type: Boolean, default: true },
    bookingAccess: { type: Boolean, default: true },
    customerAccess: { type: Boolean, default: true },

    // 7. Emergency Contact
    emergencyContact: {
      name: { type: String, default: '' },
      relationship: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' }
    },

    // 8. Branch Handover & Verification Tracking
    createdByType: {
      type: String,
      enum: ['branch_manager', 'company_admin', 'superadmin'],
      default: 'company_admin'
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdByUserName: {
      type: String,
      default: ''
    },
    isReviewedByBranch: {
      type: Boolean,
      default: false
    },
    branchReviewedAt: {
      type: Date
    },
    branchReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    branchReviewedByName: {
      type: String,
      default: ''
    },
    branchReviewRemarks: {
      type: String,
      default: ''
    },
    handoverStatus: {
      type: String,
      enum: ['Draft', 'Reviewed & Handed Over', 'Company Approved', 'Company Rejected', 'Direct Company Created'],
      default: 'Direct Company Created'
    },
    companyApprovalStatus: {
      type: String,
      enum: ['Pending Verification', 'Active', 'Rejected', 'Suspended'],
      default: 'Active'
    },
    companyRejectionReason: {
      type: String,
      default: ''
    },
    companyRejectedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT Token
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role, companyId: this.companyId },
    process.env.JWT_SECRET || 'RealEstate_SaaS_Super_Secure_Secret_Key_2026',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

export const User = mongoose.model('User', userSchema);

