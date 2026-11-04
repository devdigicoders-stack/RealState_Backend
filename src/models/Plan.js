import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      unique: true
    },
    price: {
      type: Number,
      required: [true, 'Price is required']
    },
    duration: {
      type: String,
      default: 'Monthly'
    },
    userLimit: {
      type: Number,
      required: true,
      default: 5
    },
    projectLimit: {
      type: Number,
      required: true,
      default: 2
    },
    features: [{
      type: String,
      trim: true
    }],
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    },
    isPopular: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export const Plan = mongoose.model('Plan', planSchema);

