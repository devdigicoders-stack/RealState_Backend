import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    // 1. Basic Information
    leadId: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Please provide customer full name'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Please provide customer mobile number'],
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
      lowercase: true,
      trim: true,
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

    // 2. Lead Source Details
    source: {
      type: String,
      required: [true, 'Lead source is required'],
      default: 'Website',
      trim: true
    },
    campaignName: {
      type: String,
      default: '',
      trim: true
    },
    referenceName: {
      type: String,
      default: '',
      trim: true
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent'
    },
    agentName: {
      type: String,
      default: '',
      trim: true
    },

    // 3. Property Requirements
    interestedIn: {
      type: String,
      required: [true, 'Property interest type is required'],
      default: 'Plot / Land',
      trim: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    projectName: {
      type: String,
      default: '',
      trim: true
    },
    preferredLocation: {
      type: String,
      default: '',
      trim: true
    },
    propertySize: {
      type: String,
      default: '1200 sqft',
      trim: true
    },
    budgetFrom: {
      type: String,
      required: [true, 'Budget from is required'],
      default: '₹20 Lakh',
      trim: true
    },
    budgetTo: {
      type: String,
      required: [true, 'Budget to is required'],
      default: '₹35 Lakh',
      trim: true
    },
    preferredFacing: {
      type: String,
      default: 'East Facing',
      trim: true
    },
    purpose: {
      type: String,
      default: 'Self Use', // Investment / Self Use
      trim: true
    },
    expectedPurchaseTimeline: {
      type: String,
      default: 'Within 1 Month', // Immediate / Within 1 Month / Within 3 Months / Within 6 Months / Just Exploring
      trim: true
    },

    // 4. Address Details
    country: {
      type: String,
      default: 'India',
      trim: true
    },
    state: {
      type: String,
      default: 'Uttar Pradesh',
      trim: true
    },
    city: {
      type: String,
      default: 'Lucknow',
      trim: true
    },
    pinCode: {
      type: String,
      default: '',
      trim: true
    },
    completeAddress: {
      type: String,
      default: '',
      trim: true
    },

    // 5. Lead Assignment
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    branchName: {
      type: String,
      default: 'Head Office',
      trim: true
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    managerName: {
      type: String,
      default: '',
      trim: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedToName: {
      type: String,
      required: [true, 'Sales executive assignment is required'],
      default: 'Direct Sales',
      trim: true
    },
    priority: {
      type: String,
      default: 'Warm', // Hot / Warm / Cold
      trim: true
    },
    stage: {
      type: String,
      default: 'New', // New, Contacted, Interested, Follow-up, Site Visit, Negotiation, Won, Lost
      trim: true,
      index: true
    },

    // 6. Follow-up Details
    nextFollowUpDate: {
      type: String,
      default: ''
    },
    followUpTime: {
      type: String,
      default: ''
    },
    followUpType: {
      type: String,
      default: 'Phone Call', // Phone Call, WhatsApp, Meeting, Email
      trim: true
    },
    initialRemarks: {
      type: String,
      default: '',
      trim: true
    },
    additionalNotes: {
      type: String,
      default: ''
    },

    // 7. Additional Information
    leadAttachments: [{
      type: String
    }],
    customerIdProofDoc: {
      type: String,
      default: ''
    },
    internalNotes: {
      type: String,
      default: ''
    },
    createdBy: {
      type: String,
      default: 'Company Admin',
      trim: true
    }
  },
  { timestamps: true }
);

leadSchema.index({ companyId: 1, phone: 1 });
leadSchema.index({ companyId: 1, stage: 1 });

export const Lead = mongoose.model('Lead', leadSchema);
