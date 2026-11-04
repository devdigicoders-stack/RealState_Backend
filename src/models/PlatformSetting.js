import mongoose from 'mongoose';

const platformSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global_config'
    },
    platformName: {
      type: String,
      default: 'RealEstatePro SaaS Cloud ERP'
    },
    tagline: {
      type: String,
      default: 'Multi-Tenant Real Estate & Property CRM System'
    },
    supportEmail: {
      type: String,
      default: 'admin@realestatepro.in'
    },
    salesHelpline: {
      type: String,
      default: '+91 80000 11223'
    },
    trialDays: {
      type: Number,
      default: 14
    },
    defaultCurrency: {
      type: String,
      default: 'INR (₹)'
    },
    enforce2FA: {
      type: Boolean,
      default: true
    },
    maintenanceMode: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export const PlatformSetting = mongoose.model('PlatformSetting', platformSettingSchema);

