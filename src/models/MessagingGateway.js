import mongoose from 'mongoose';

const messagingGatewaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    channel: {
      type: String,
      required: true,
      default: 'WhatsApp Business API'
    },
    latency: {
      type: String,
      default: '< 200ms'
    },
    status: {
      type: String,
      enum: ['Connected', 'Degraded', 'Disabled'],
      default: 'Connected'
    },
    dltEntityId: {
      type: String,
      default: '1701159823489123'
    },
    senderId: {
      type: String,
      default: 'REALST'
    },
    webhookUrl: {
      type: String,
      default: 'https://api.crmplatform.com/v1/messaging/incoming'
    },
    features: [{
      type: String
    }]
  },
  { timestamps: true }
);

export const MessagingGateway = mongoose.model('MessagingGateway', messagingGatewaySchema);
