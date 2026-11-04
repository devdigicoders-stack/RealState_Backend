import mongoose from 'mongoose';

const plotSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    plotNumber: {
      type: String,
      required: true,
      trim: true
    },
    block: {
      type: String,
      default: 'A',
      trim: true
    },
    sizeSqft: {
      type: Number,
      default: 1200
    },
    dimensions: {
      type: String,
      default: '30x40',
      trim: true
    },
    facing: {
      type: String,
      default: 'East',
      trim: true
    },
    ratePerSqft: {
      type: Number,
      default: 2450
    },
    totalPrice: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['Available', 'Hold', 'Booked', 'Registered', 'Sold / Closed'],
      default: 'Available',
      trim: true,
      index: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true
    },
    bookedBy: {
      customerName: String,
      customerPhone: String,
      tokenAmount: Number,
      bookedDate: Date
    }
  },
  { timestamps: true }
);

export const Plot = mongoose.model('Plot', plotSchema);
