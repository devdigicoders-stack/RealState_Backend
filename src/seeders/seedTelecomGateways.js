import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CallingProvider } from '../models/CallingProvider.js';
import { MessagingGateway } from '../models/MessagingGateway.js';

dotenv.config();

export const seedTelecomGateways = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/realestate_crm';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Seed Calling Providers (Voice Telephony)
    const callingProviders = [
      {
        name: 'Exotel Cloud',
        type: 'Cloud PBX / PRI',
        latency: '< 18ms',
        supportedCompanies: 'All Active Companies',
        features: ['Click-to-Call', 'Call Recording', 'Dual Number Masking', 'IVR Routing'],
        status: 'Operational',
        apiKey: 'sk_live_exotel_992140',
        webhookUrl: 'https://api.crmplatform.com/v1/telephony/exotel/callback'
      },
      {
        name: 'Tata Tele Services',
        type: 'Smartflo Cloud Trunk',
        latency: '< 22ms',
        supportedCompanies: 'Enterprise Builders Only',
        features: ['Outbound Auto-Dialer', 'SIP Trunking', 'Live Call Barge-In'],
        status: 'Operational',
        apiKey: 'sk_live_tatatele_881923',
        webhookUrl: 'https://api.crmplatform.com/v1/telephony/tatatele/callback'
      },
      {
        name: 'Knowlarity Cloud',
        type: 'SuperReceptionist IVR',
        latency: '< 25ms',
        supportedCompanies: 'Tier-2 & Tier-3 Developers',
        features: ['Multi-agent Distribution', 'Call Whispering', 'Missed Call Alerts'],
        status: 'Operational',
        apiKey: 'sk_live_knowlarity_554109',
        webhookUrl: 'https://api.crmplatform.com/v1/telephony/knowlarity/callback'
      },
      {
        name: 'Twilio Voice',
        type: 'Global Elastic SIP Trunking',
        latency: '< 30ms',
        supportedCompanies: 'International Real Estate Hubs',
        features: ['Global Number Provisioning', 'Voicemail Transcripts', 'WebRTC Softphone'],
        status: 'Operational',
        apiKey: 'sk_live_twilio_voice_442190',
        webhookUrl: 'https://api.crmplatform.com/v1/telephony/twilio/callback'
      }
    ];

    for (const cp of callingProviders) {
      await CallingProvider.findOneAndUpdate(
        { name: cp.name },
        cp,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log('✅ 4 Calling Providers (Voice Gateways) seeded successfully!');

    // 2. Seed Messaging Gateways (SMS & WhatsApp)
    const messagingGateways = [
      {
        name: 'Gupshup Enterprise',
        channel: 'WhatsApp Business API & OTP SMS',
        latency: '< 150ms',
        status: 'Connected',
        dltEntityId: '1701159823489123',
        senderId: 'REALST',
        webhookUrl: 'https://api.crmplatform.com/v1/messaging/gupshup/incoming',
        features: ['Template Messages', 'Brochure PDF Push', 'Interactive Buttons', 'DLT Approved']
      },
      {
        name: 'Twilio SMS & Messaging',
        channel: 'Global SMS & WhatsApp Broadcast',
        latency: '< 180ms',
        status: 'Connected',
        dltEntityId: '1701198421039841',
        senderId: 'PROPST',
        webhookUrl: 'https://api.crmplatform.com/v1/messaging/twilio/incoming',
        features: ['International SMS', 'MMS Site Plans', 'Opt-out Management']
      },
      {
        name: 'ValueFirst / Tanla',
        channel: 'Domestic DLT Bulk Transactional SMS',
        latency: '< 120ms',
        status: 'Connected',
        dltEntityId: '1701994821038475',
        senderId: 'VFIRST',
        webhookUrl: 'https://api.crmplatform.com/v1/messaging/valuefirst/incoming',
        features: ['Lead Welcome SMS', 'Booking Token Receipt', 'Payment Reminder Alert']
      }
    ];

    for (const mg of messagingGateways) {
      await MessagingGateway.findOneAndUpdate(
        { name: mg.name },
        mg,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log('✅ 3 Messaging Gateways seeded successfully!');

    if (process.argv[1]?.includes('seedTelecomGateways.js')) {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error seeding telecom gateways:', error.message);
    if (process.argv[1]?.includes('seedTelecomGateways.js')) {
      process.exit(1);
    }
  }
};

if (process.argv[1]?.includes('seedTelecomGateways.js')) {
  seedTelecomGateways();
}

