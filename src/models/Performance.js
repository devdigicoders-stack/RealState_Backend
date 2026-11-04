import mongoose from 'mongoose';

const performanceSchema = new mongoose.Schema(
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userName: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      default: 'sales_user'
    },
    badge: {
      type: String,
      default: 'Sales Executive'
    },
    period: {
      type: String, // e.g. "2026-11" or "Monthly"
      default: () => new Date().toISOString().slice(0, 7),
      index: true
    },
    // KPIs & Metrics
    callsTarget: {
      type: Number,
      default: 500
    },
    callsMade: {
      type: Number,
      default: 0
    },
    visitsTarget: {
      type: Number,
      default: 20
    },
    visitsDone: {
      type: Number,
      default: 0
    },
    tokensBookedTarget: {
      type: Number,
      default: 5
    },
    tokensBooked: {
      type: Number,
      default: 0
    },
    targetVolume: {
      type: Number,
      default: 20000000 // 2 Cr
    },
    grossVolume: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: String,
      default: '0.0%'
    },
    incentiveEarned: {
      type: Number,
      default: 0
    },
    managerRating: {
      type: Number, // 1 to 5
      default: 4.5
    },
    remarks: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

// Compound index to guarantee 1 performance record per user per month
performanceSchema.index({ companyId: 1, userId: 1, period: 1 }, { unique: true });

export const Performance = mongoose.model('Performance', performanceSchema);

