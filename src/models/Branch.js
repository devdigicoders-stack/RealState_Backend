import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    // 1. Branch Basic Information
    name: {
      type: String,
      required: [true, 'Please provide branch name'],
      trim: true
    },
    branchCode: {
      type: String,
      trim: true
    },
    branchType: {
      type: String,
      default: 'Sales Office', // Head Office / Regional Office / Sales Office / Site Office
      trim: true
    },
    status: {
      type: String,
      default: 'Active', // Active / Inactive
      trim: true
    },
    openingDate: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },

    // 2. Branch Contact Information
    phone: {
      type: String,
      required: [true, 'Branch contact number is required'],
      trim: true
    },
    alternatePhone: {
      type: String,
      default: '',
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    website: {
      type: String,
      default: '',
      trim: true
    },

    // 3. Branch Address
    addressLine1: {
      type: String,
      required: [true, 'Address line 1 is required'],
      trim: true
    },
    addressLine2: {
      type: String,
      default: '',
      trim: true
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      default: 'Uttar Pradesh',
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      default: 'Lucknow',
      trim: true
    },
    pinCode: {
      type: String,
      required: [true, 'PIN Code is required'],
      trim: true
    },
    googleMapsLocation: {
      type: String,
      default: '',
      trim: true
    },

    // 4. Branch Manager Details
    managerMode: {
      type: String,
      default: 'new' // existing / new
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    managerName: {
      type: String,
      required: [true, 'Branch manager name is required'],
      trim: true
    },
    managerEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    managerPhone: {
      type: String,
      default: '',
      trim: true
    },
    managerDesignation: {
      type: String,
      default: 'Branch Manager',
      trim: true
    },
    managerJoiningDate: {
      type: String,
      default: ''
    },
    managerPassword: {
      type: String,
      default: ''
    },

    // 5. Branch Operations
    assignedProjects: [{
      type: String
    }],
    assignedSalesTeams: [{
      type: String
    }],
    numberOfEmployees: {
      type: Number,
      default: 5
    },
    workingDays: {
      type: String,
      default: 'Monday - Saturday',
      trim: true
    },
    openingTime: {
      type: String,
      default: '09:30 AM',
      trim: true
    },
    closingTime: {
      type: String,
      default: '06:30 PM',
      trim: true
    },
    operationsNotes: {
      type: String,
      default: ''
    },

    // 6. Branch Settings / Permissions
    settings: {
      allowLeadAssignment: { type: Boolean, default: true },
      allowPropertyManagement: { type: Boolean, default: true },
      allowBookingManagement: { type: Boolean, default: true },
      allowAgentManagement: { type: Boolean, default: true },
      allowPaymentManagement: { type: Boolean, default: true },
      allowReportsAccess: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

branchSchema.index({ companyId: 1, name: 1 });

export const Branch = mongoose.model('Branch', branchSchema);
