import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    bookingId: {
      type: String,
      required: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    customerPhone: {
      type: String,
      required: true
    },
    customerEmail: {
      type: String,
      default: ''
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    projectName: {
      type: String,
      default: ''
    },
    plotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plot'
    },
    plotNumber: {
      type: String,
      required: true
    },
    tokenAmount: {
      type: Number,
      required: true
    },
    totalAmount: {
      type: Number,
      required: true
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    salesExecutiveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    salesExecutiveName: {
      type: String,
      default: 'Direct Company'
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
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      index: true
    },
    agentName: {
      type: String,
      default: ''
    },
    agentCommissionRate: {
      type: String,
      default: ''
    },
    agentCommissionAmount: {
      type: Number,
      default: 0
    },
    agentCommissionStatus: {
      type: String,
      enum: ['None', 'Pending Approval', 'Approved', 'Paid'],
      default: 'None'
    },
    status: {
      type: String,
      enum: [
        'Hold',
        'Pending Review',
        'Recommended to Company Owner',
        'Approved',
        'Token Paid',
        'Partially Paid',
        'Registered',
        'Sold / Closed',
        'Rejected'
      ],
      default: 'Hold',
      trim: true,
      index: true
    },
    bookingDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export const Booking = mongoose.model('Booking', bookingSchema);
