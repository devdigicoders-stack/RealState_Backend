import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Please provide customer name'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Please provide customer phone'],
      trim: true,
      index: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      default: 'Lucknow',
      trim: true
    },
    address: {
      type: String,
      default: '',
      trim: true
    },
    panNumber: {
      type: String,
      default: '',
      trim: true
    },
    aadharNumber: {
      type: String,
      default: '',
      trim: true
    },
    kycStatus: {
      type: String,
      default: 'Verified',
      trim: true
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    },
    stage: {
      type: String,
      default: 'Token Paid',
      trim: true
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

customerSchema.index({ companyId: 1, phone: 1 });

export const Customer = mongoose.model('Customer', customerSchema);

