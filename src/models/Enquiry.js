import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    companyName: {
      type: String,
      trim: true,
      default: ''
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true
    },
    emailAddress: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    businessType: {
      type: String,
      trim: true,
      default: 'Real Estate Developer'
    },
    interestedIn: {
      type: String,
      trim: true,
      default: 'Complete Real Estate Software'
    },
    message: {
      type: String,
      trim: true,
      default: ''
    },
    source: {
      type: String,
      default: 'Website Contact Page'
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Demo Scheduled', 'Converted', 'Closed'],
      default: 'New'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export const Enquiry = mongoose.model('Enquiry', enquirySchema);

