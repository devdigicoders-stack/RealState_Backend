import mongoose from 'mongoose';

const callingProviderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Provider name is required'],
      unique: true,
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Provider type is required'],
      default: 'Cloud PBX / PRI'
    },
    latency: {
      type: String,
      default: '< 20ms'
    },
    supportedCompanies: {
      type: String,
      default: 'All Active Companies'
    },
    features: [{
      type: String
    }],
    status: {
      type: String,
      enum: ['Operational', 'Degraded', 'Maintenance', 'Active'],
      default: 'Operational'
    },
    apiKey: {
      type: String,
      default: 'sk_live_telephony_secret_key'
    },
    webhookUrl: {
      type: String,
      default: 'https://api.crmplatform.com/v1/telephony/callbacks'
    }
  },
  { timestamps: true }
);

export const CallingProvider = mongoose.model('CallingProvider', callingProviderSchema);
