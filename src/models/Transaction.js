import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    invoiceNo: {
      type: String,
      required: true,
      unique: true
    },
    company: {
      type: String,
      required: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null
    },
    ownerName: {
      type: String,
      default: 'Owner'
    },
    plan: {
      type: String,
      default: 'Standard Growth'
    },
    amount: {
      type: Number,
      required: true
    },
    gst: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    },
    method: {
      type: String,
      default: 'Razorpay PG'
    },
    status: {
      type: String,
      enum: ['Success', 'Pending', 'Failed', 'Refunded'],
      default: 'Success'
    },
    billingDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export const Transaction = mongoose.model('Transaction', transactionSchema);
