import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide company name'],
      trim: true
    },
    ownerName: {
      type: String,
      required: [true, 'Please provide owner name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please provide company contact email'],
      unique: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, 'Please provide company phone']
    },
    plan: {
      type: String,
      default: 'Standard Growth'
    },
    planPrice: {
      type: String,
      default: '₹14,999/mo'
    },
    status: {
      type: String,
      enum: ['Active', 'Suspended', 'Expired', 'Deactivated'],
      default: 'Active'
    },
    usersLimit: {
      type: Number,
      default: 15
    },
    projectsLimit: {
      type: Number,
      default: 5
    },
    expiryDate: {
      type: Date
    },
    renewalCount: {
      type: Number,
      default: 0
    },
    lastRenewedAt: {
      type: Date,
      default: Date.now
    },
    callingProvider: {
      type: String,
      default: 'Not Configured'
    },
    smsProvider: {
      type: String,
      default: 'Not Configured'
    },
    gstin: {
      type: String,
      trim: true,
      default: ''
    },
    pan: {
      type: String,
      trim: true,
      default: ''
    },
    reraRegistration: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    website: {
      type: String,
      trim: true,
      default: ''
    },
    logo: {
      type: String,
      default: ''
    },
    leadRoutingMode: {
      type: String,
      default: 'Round-Robin Auto Assignment'
    },
    callingCallerId: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

export const Company = mongoose.model('Company', companySchema);

