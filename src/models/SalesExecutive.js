import mongoose from 'mongoose';

const salesExecutiveSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true
    },
    branchName: {
      type: String,
      default: ''
    },

    // 1. Personal Information
    fullName: {
      type: String,
      required: [true, 'Please provide full name'],
      trim: true
    },
    profilePhoto: {
      type: String,
      default: ''
    },
    gender: {
      type: String,
      default: 'Male',
      trim: true
    },
    dob: {
      type: String,
      default: ''
    },
    fatherName: {
      type: String,
      default: '',
      trim: true
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true
    },
    alternatePhone: {
      type: String,
      default: '',
      trim: true
    },
    personalEmail: {
      type: String,
      default: '',
      lowercase: true,
      trim: true
    },
    currentAddress: {
      type: String,
      default: '',
      trim: true
    },
    permanentAddress: {
      type: String,
      default: '',
      trim: true
    },

    // 2. Employment Information
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      default: 'Sales Executive',
      trim: true
    },
    department: {
      type: String,
      default: 'Sales',
      trim: true
    },
    reportingManager: {
      type: String,
      default: '',
      trim: true
    },
    reportingManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joiningDate: {
      type: String,
      default: ''
    },
    employmentType: {
      type: String,
      default: 'Full Time', // Full Time, Part Time, Contract, Internship
      trim: true
    },
    workLocation: {
      type: String,
      default: 'Office', // Office, Remote, Hybrid
      trim: true
    },
    employmentStatus: {
      type: String,
      default: 'Active', // Active, Probation, Inactive
      trim: true
    },

    // 3. Professional Information
    previousCompany: {
      type: String,
      default: '',
      trim: true
    },
    previousDesignation: {
      type: String,
      default: '',
      trim: true
    },
    totalExperience: {
      type: String,
      default: '',
      trim: true
    },
    relevantExperience: {
      type: String,
      default: '',
      trim: true
    },
    skills: {
      type: String,
      default: ''
    },
    previousSalary: {
      type: String,
      default: ''
    },

    // 4. Salary Information
    salaryType: {
      type: String,
      default: 'Monthly',
      trim: true
    },
    basicSalary: {
      type: Number,
      default: 0
    },
    hra: {
      type: Number,
      default: 0
    },
    allowances: {
      type: Number,
      default: 0
    },
    incentives: {
      type: String,
      default: ''
    },
    monthlyCtc: {
      type: Number,
      default: 0
    },
    paymentMode: {
      type: String,
      default: 'Bank Transfer',
      trim: true
    },
    bankDetails: {
      accountHolderName: { type: String, default: '' },
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' }
    },

    // 5. Identity & Documents
    aadhaarNumber: {
      type: String,
      default: '',
      trim: true
    },
    panNumber: {
      type: String,
      default: '',
      trim: true
    },
    aadhaarDoc: {
      type: String,
      default: ''
    },
    panCardDoc: {
      type: String,
      default: ''
    },
    resumeDoc: {
      type: String,
      default: ''
    },
    photoDoc: {
      type: String,
      default: ''
    },
    experienceLetterDoc: {
      type: String,
      default: ''
    },
    educationCertDoc: {
      type: String,
      default: ''
    },
    addressProofDoc: {
      type: String,
      default: ''
    },
    offerLetterDoc: {
      type: String,
      default: ''
    },
    joiningLetterDoc: {
      type: String,
      default: ''
    },

    // 6. Sales Permissions & Assignment
    assignedProjects: [{
      type: String
    }],
    assignedTeam: {
      type: String,
      default: '',
      trim: true
    },
    leadAccess: {
      type: String,
      default: 'Own', // Own, Team, Branch
      trim: true
    },
    callingAccess: {
      type: Boolean,
      default: true
    },
    followUpAccess: {
      type: Boolean,
      default: true
    },
    siteVisitAccess: {
      type: Boolean,
      default: true
    },
    bookingAccess: {
      type: Boolean,
      default: true
    },
    customerAccess: {
      type: Boolean,
      default: true
    },

    // 7. Login Credentials
    loginEmail: {
      type: String,
      required: [true, 'Login email is required'],
      lowercase: true,
      trim: true,
      index: true
    },
    username: {
      type: String,
      default: '',
      trim: true
    },
    password: {
      type: String,
      default: 'password123'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    accountStatus: {
      type: String,
      default: 'Pending Verification', // Pending Verification, Active, Inactive, Rejected
      trim: true,
      index: true
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    approvedAt: {
      type: Date
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // 8. Emergency Contact
    emergencyContact: {
      name: { type: String, default: '' },
      relationship: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' }
    },

    // 9. Branch Handover & Verification Tracking
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
      default: 'Draft'
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

salesExecutiveSchema.index({ companyId: 1, mobileNumber: 1 });
salesExecutiveSchema.index({ companyId: 1, loginEmail: 1 });

export const SalesExecutive = mongoose.model('SalesExecutive', salesExecutiveSchema);

