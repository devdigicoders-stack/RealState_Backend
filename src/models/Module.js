import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Module name is required'],
      unique: true,
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Module unique code is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      default: 'Core CRM'
    },
    icon: {
      type: String,
      default: 'HiOutlineCube'
    },
    active: {
      type: Boolean,
      default: true
    },
    plans: [{
      type: String
    }],
    allowedRoles: [{
      type: String
    }]
  },
  { timestamps: true }
);

export const Module = mongoose.model('Module', moduleSchema);

