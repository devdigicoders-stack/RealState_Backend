import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNo: {
      type: String,
      required: true,
      unique: true
    },
    company: {
      type: String,
      required: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null
    },
    subject: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: 'Billing'
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low', 'Urgent'],
      default: 'Medium'
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open'
    },
    submittedBy: {
      type: String,
      default: 'Tenant Owner'
    },
    messages: [
      {
        sender: String,
        role: String,
        message: String,
        timestamp: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

