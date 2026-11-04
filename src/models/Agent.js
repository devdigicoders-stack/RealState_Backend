import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema(
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
    // 1. Basic Information
    fullName: {
      type: String,
      required: [true, 'Please provide agent full name'],
      trim: true
    },
    profilePhoto: {
      type: String,
      default: ''
    },
    agentType: {
      type: String,
      default: 'Individual', // Individual / Agency
      trim: true
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
    agencyName: {
      type: String,
      default: '',
      trim: true
    },
    agentCode: {
      type: String,
      unique: true,
      trim: true
    },
    designation: {
      type: String,
      default: 'Channel Partner',
      trim: true
    },

    // 2. Contact Information
    phone: {
      type: String,
      required: [true, 'Please provide mobile number'],
      trim: true,
      index: true
    },
    alternatePhone: {
      type: String,
      default: '',
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please provide email address'],
      lowercase: true,
      trim: true
    },
    whatsappNumber: {
      type: String,
      default: '',
      trim: true
    },
    officeAddress: {
      type: String,
      default: '',
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      default: 'Lucknow',
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      default: 'Uttar Pradesh',
      trim: true
    },
    pinCode: {
      type: String,
      default: '',
      trim: true
    },

    // 3. Identity & KYC Details
    panNumber: {
      type: String,
      default: '',
      trim: true
    },
    aadhaarNumber: {
      type: String,
      default: '',
      trim: true
    },
    gstNumber: {
      type: String,
      default: '',
      trim: true
    },
    panCardDoc: {
      type: String,
      default: ''
    },
    aadhaarCardDoc: {
      type: String,
      default: ''
    },
    addressProofDoc: {
      type: String,
      default: ''
    },
    identityProofDoc: {
      type: String,
      default: ''
    },
    kycStatus: {
      type: String,
      default: 'Pending Verification', // Pending Verification, Verified, Rejected
      trim: true
    },

    // 4. Professional Information
    experienceYears: {
      type: String,
      default: '1-3 Years',
      trim: true
    },
    previousCompany: {
      type: String,
      default: '',
      trim: true
    },
    areaOfOperation: {
      type: String,
      default: '',
      trim: true
    },
    preferredPropertyType: [{
      type: String
    }], // Residential, Commercial, Plots / Land, Industrial
    assignedProjects: [{
      type: String
    }],
    description: {
      type: String,
      default: ''
    },

    // 5. Bank Details
    bankDetails: {
      accountHolderName: { type: String, default: '' },
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      branchName: { type: String, default: '' },
      chequeDoc: { type: String, default: '' }
    },

    // 6. Commission Details
    commissionType: {
      type: String,
      default: 'Percentage (%)', // Percentage (%) / Fixed Amount
      trim: true
    },
    commissionRate: {
      type: String,
      default: '2.5%',
      trim: true
    },
    commissionTier: {
      type: String,
      default: '2.5% on Agreement',
      trim: true
    },
    commissionApplicableOn: {
      type: String,
      default: 'Total Property Value', // Booking Amount / Total Property Value
      trim: true
    },
    commissionPaymentTerms: {
      type: String,
      default: 'On Booking', // On Booking / On Payment Collection / On Full Payment
      trim: true
    },
    specialCommissionNotes: {
      type: String,
      default: ''
    },

    // 7. Login & Account Details
    loginEmail: {
      type: String,
      lowercase: true,
      trim: true
    },
    username: {
      type: String,
      trim: true,
      default: ''
    },
    password: {
      type: String
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    accountStatus: {
      type: String,
      default: 'Pending Verification', // Pending Verification, Submitted to Company, Active, Inactive, Rejected
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

    // Review & Handover Tracking (Branch -> Company workflow)
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
    },

    // 8. Additional Information
    referredBy: {
      type: String,
      default: '',
      trim: true
    },
    joiningDate: {
      type: Date,
      default: Date.now
    },
    internalRemarks: {
      type: String,
      default: ''
    },
    agreementDoc: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

agentSchema.index({ companyId: 1, phone: 1 });
agentSchema.index({ companyId: 1, email: 1 });

export const Agent = mongoose.model('Agent', agentSchema);
