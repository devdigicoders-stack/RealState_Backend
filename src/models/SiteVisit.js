import mongoose from 'mongoose';

const siteVisitSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true
    },
    clientName: {
      type: String,
      required: true,
      trim: true
    },
    clientPhone: {
      type: String,
      required: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    projectName: {
      type: String,
      required: true
    },
    executiveName: {
      type: String,
      default: 'Sales Executive'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    vehicle: {
      type: String,
      default: 'Office Vehicle'
    },
    visitDate: {
      type: Date,
      default: Date.now
    },
    timeSlot: {
      type: String,
      default: '11:00 AM'
    },
    status: {
      type: String,
      default: 'Scheduled',
      trim: true
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      index: true
    },
    agentName: {
      type: String,
      default: ''
    },
    plotInterested: {
      type: String,
      default: ''
    },
    negotiationStatus: {
      type: String,
      default: 'Under Discussion'
    },
    feedback: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

export const SiteVisit = mongoose.model('SiteVisit', siteVisitSchema);
