import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    },
    clientName: {
      type: String,
      required: true
    },
    clientPhone: {
      type: String,
      required: true
    },
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    callerName: {
      type: String,
      default: 'Sales Executive'
    },
    direction: {
      type: String,
      enum: ['Outbound', 'Inbound'],
      default: 'Outbound'
    },
    durationSeconds: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['Connected', 'Missed', 'Busy', 'Failed', 'Voicemail'],
      default: 'Connected'
    },
    recordingUrl: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

export const CallLog = mongoose.model('CallLog', callLogSchema);

