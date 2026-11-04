import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Please provide project name'],
      trim: true
    },
    type: {
      type: String,
      default: 'Township',
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      default: 'Lucknow',
      trim: true
    },
    reraNo: {
      type: String,
      trim: true,
      default: ''
    },
    totalArea: {
      type: String,
      default: '25 Acres'
    },
    totalPlots: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      default: 'Active',
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    image: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

export const Project = mongoose.model('Project', projectSchema);
