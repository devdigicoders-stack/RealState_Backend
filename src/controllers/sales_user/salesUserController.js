import { Lead } from '../../models/Lead.js';
import { CallLog } from '../../models/CallLog.js';
import { SiteVisit } from '../../models/SiteVisit.js';
import { Booking } from '../../models/Booking.js';
import { Plot } from '../../models/Plot.js';
import { Customer } from '../../models/Customer.js';
import { SalesExecutive } from '../../models/SalesExecutive.js';
import mongoose from 'mongoose';

// Helper to get all matched identifiers for the logged in sales user
const getSalesIdentifiers = async (user) => {
  const ids = [user._id, user.id];
  const stringIds = [user._id.toString(), user.id.toString()];
  const emails = [user.email.toLowerCase()];

  // Find linked SalesExecutive record if any
  const exec = await SalesExecutive.findOne({
    companyId: user.companyId,
    $or: [{ loginEmail: user.email.toLowerCase() }, { userId: user._id }]
  });

  if (exec) {
    ids.push(exec._id);
    stringIds.push(exec._id.toString());
    if (exec.personalEmail) emails.push(exec.personalEmail.toLowerCase());
  }

  const nameRegex = new RegExp(user.name, 'i');

  return { ids, stringIds, emails, nameRegex, exec };
};

// @desc    Get Sales User Dashboard KPI & recent activity
// @route   GET /api/sales-user/dashboard
// @access  Private (sales_user)
export const getSalesDashboard = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { ids, stringIds, emails, nameRegex } = await getSalesIdentifiers(req.user);

    // 1. My Leads
    const leads = await Lead.find({
      companyId,
      $or: [
        { assignedTo: { $in: [...ids, ...stringIds] } },
        { salesExecutiveId: { $in: [...ids, ...stringIds] } },
        { assignedUserEmail: { $in: emails } },
        { assignedUserName: nameRegex }
      ]
    }).sort({ createdAt: -1 }).lean();

    // 2. My Calls
    const calls = await CallLog.find({
      companyId,
      $or: [
        { callerId: { $in: [...ids, ...stringIds] } },
        { userId: { $in: [...ids, ...stringIds] } },
        { executiveName: nameRegex },
        { callerName: nameRegex }
      ]
    }).sort({ createdAt: -1 }).lean();

    // 3. My Site Visits
    const siteVisits = await SiteVisit.find({
      companyId,
      $or: [
        { executiveId: { $in: [...ids, ...stringIds] } },
        { assignedTo: { $in: [...ids, ...stringIds] } },
        { executiveName: nameRegex }
      ]
    }).sort({ visitDate: -1, createdAt: -1 }).lean();

    // 4. My Bookings
    const bookings = await Booking.find({
      companyId,
      $or: [
        { salesExecutiveId: { $in: [...ids, ...stringIds] } },
        { executiveName: nameRegex },
        { salesExecutive: nameRegex }
      ]
    }).sort({ createdAt: -1 }).lean();

    const todayStr = new Date().toISOString().split('T')[0];
    const callsToday = calls.filter(c => c.callDate?.startsWith(todayStr) || c.createdAt?.toISOString()?.startsWith(todayStr)).length;
    const followupsDue = leads.filter(l => l.nextFollowUpDate && l.status !== 'Won' && l.status !== 'Lost').length;
    const visitsScheduled = siteVisits.filter(s => s.status === 'Scheduled').length;
    const closedBookings = bookings.filter(b => b.status === 'Approved' || b.status === 'Confirmed').length;

    res.status(200).json({
      success: true,
      stats: {
        totalAssignedLeads: leads.length,
        callsToday,
        followupsDue,
        visitsScheduled,
        closedBookings,
        totalBookings: bookings.length
      },
      recentLeads: leads.slice(0, 10),
      recentCalls: calls.slice(0, 10),
      upcomingVisits: siteVisits.filter(s => s.status === 'Scheduled').slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Only My Assigned Leads
// @route   GET /api/sales-user/leads
// @access  Private (sales_user)
export const getMyLeads = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search, status } = req.query;
    const { ids, stringIds, emails, nameRegex } = await getSalesIdentifiers(req.user);

    let query = {
      companyId,
      $or: [
        { assignedTo: { $in: [...ids, ...stringIds] } },
        { salesExecutiveId: { $in: [...ids, ...stringIds] } },
        { assignedUserEmail: { $in: emails } },
        { assignedUserName: nameRegex }
      ]
    };

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      query.$and = [
        {
          $or: [
            { fullName: reg },
            { name: reg },
            { phone: reg },
            { city: reg },
            { projectInterested: reg },
            { leadId: reg }
          ]
        }
      ];
    }

    const leads = await Lead.find(query).sort({ updatedAt: -1, createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Call Result & Add Remark on Lead (Full Sales Workflow)
// @route   PUT /api/sales-user/leads/:id/call-disposition
// @access  Private (sales_user)
export const logCallDisposition = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { callResult, remark, nextFollowUpDate, interestedProject, interestedPlot, duration } = req.body;

    const { ids, stringIds, emails, nameRegex } = await getSalesIdentifiers(req.user);

    const lead = await Lead.findOne({
      _id: id,
      companyId,
      $or: [
        { assignedTo: { $in: [...ids, ...stringIds] } },
        { salesExecutiveId: { $in: [...ids, ...stringIds] } },
        { assignedUserEmail: { $in: emails } },
        { assignedUserName: nameRegex }
      ]
    });

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found or unauthorized' });
    }

    // Update Lead Details
    if (callResult) {
      lead.lastCallResult = callResult;
      if (callResult === 'Interested') lead.status = 'Interested';
      else if (callResult === 'Not Interested') lead.status = 'Lost';
      else if (callResult === 'Follow-up Required') lead.status = 'Follow-up';
      else if (callResult === 'Site Visit') lead.status = 'Site Visit';
    }

    if (remark) {
      lead.lastRemark = remark;
      lead.remarks = remark;
    }

    if (nextFollowUpDate) {
      lead.nextFollowUpDate = nextFollowUpDate;
    }

    if (interestedProject) lead.projectInterested = interestedProject;
    if (interestedPlot) lead.propertySuggested = interestedPlot;

    await lead.save();

    // Create CallLog Entry
    const callLog = await CallLog.create({
      companyId,
      branchId: req.user.branchId || null,
      leadId: lead._id,
      customerName: lead.fullName || lead.name,
      clientPhone: lead.phone,
      callerId: req.user._id,
      userId: req.user._id,
      executiveName: req.user.name,
      callType: 'Outbound',
      duration: duration || '3m 15s',
      callResult: callResult || 'Connected',
      remarks: remark || 'Call disposition updated',
      callDate: new Date(),
      status: callResult === 'Interested' ? 'Interested' : 'Logged'
    });

    res.status(200).json({
      success: true,
      message: `Call disposition logged: ${callResult}`,
      lead,
      callLog
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Only My Calling Logs
// @route   GET /api/sales-user/calls
// @access  Private (sales_user)
export const getMyCalls = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search, result } = req.query;
    const { ids, stringIds, emails, nameRegex } = await getSalesIdentifiers(req.user);

    let query = {
      companyId,
      $or: [
        { callerId: { $in: [...ids, ...stringIds] } },
        { userId: { $in: [...ids, ...stringIds] } },
        { executiveName: nameRegex },
        { callerName: nameRegex }
      ]
    };

    if (result && result !== 'All') {
      query.callResult = result;
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      query.$and = [
        {
          $or: [
            { customerName: reg },
            { clientPhone: reg },
            { remarks: reg }
          ]
        }
      ];
    }

    const calls = await CallLog.find(query).sort({ callDate: -1, createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: calls.length,
      data: calls
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get My Follow-ups Reminders
// @route   GET /api/sales-user/follow-ups
// @access  Private (sales_user)
export const getMyFollowups = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { ids, stringIds, emails, nameRegex } = await getSalesIdentifiers(req.user);

    const leads = await Lead.find({
      companyId,
      nextFollowUpDate: { $exists: true, $ne: '' },
      status: { $nin: ['Won', 'Lost'] },
      $or: [
        { assignedTo: { $in: [...ids, ...stringIds] } },
        { salesExecutiveId: { $in: [...ids, ...stringIds] } },
        { assignedUserEmail: { $in: emails } },
        { assignedUserName: nameRegex }
      ]
    }).sort({ nextFollowUpDate: 1 }).lean();

    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get My Site Visits
// @route   GET /api/sales-user/site-visits
// @access  Private (sales_user)
export const getMySiteVisits = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search, status } = req.query;
    const { ids, stringIds, emails, nameRegex } = await getSalesIdentifiers(req.user);

    let query = {
      companyId,
      $or: [
        { executiveId: { $in: [...ids, ...stringIds] } },
        { assignedTo: { $in: [...ids, ...stringIds] } },
        { executiveName: nameRegex }
      ]
    };

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      query.$and = [
        {
          $or: [
            { customerName: reg },
            { phone: reg },
            { projectName: reg },
            { pickupLocation: reg }
          ]
        }
      ];
    }

    const visits = await SiteVisit.find(query).sort({ visitDate: -1, createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: visits.length,
      data: visits
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Schedule Site Visit from Sales User
// @route   POST /api/sales-user/site-visits
// @access  Private (sales_user)
export const createSiteVisitSales = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const body = req.body;

    const count = await SiteVisit.countDocuments({ companyId });
    const visitId = `SV-${String(count + 1).padStart(3, '0')}`;

    const visit = await SiteVisit.create({
      companyId,
      branchId: req.user.branchId || null,
      visitId,
      leadId: body.leadId || null,
      customerName: body.customerName || body.clientName,
      phone: body.phone || body.clientPhone,
      projectName: body.projectName,
      visitDate: body.visitDate || body.visitDateTime,
      pickupLocation: body.pickupLocation || 'Site Office / Direct Arrival',
      cabAssigned: body.cabAssigned || 'Self Driven',
      driver: body.driver || 'Gate Receptionist',
      executiveId: req.user._id,
      executiveName: req.user.name,
      status: 'Scheduled',
      customerFeedback: body.feedback || '',
      interestedPlot: body.interestedPlot || ''
    });

    res.status(201).json({
      success: true,
      message: 'Site visit scheduled successfully!',
      data: visit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Site Visit Feedback & Plot Interest
// @route   PUT /api/sales-user/site-visits/:id/feedback
// @access  Private (sales_user)
export const updateSiteVisitFeedback = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { status, feedback, interestedPlot, negotiationStatus } = req.body;

    const { ids, stringIds, nameRegex } = await getSalesIdentifiers(req.user);

    const visit = await SiteVisit.findOne({
      _id: id,
      companyId,
      $or: [
        { executiveId: { $in: [...ids, ...stringIds] } },
        { assignedTo: { $in: [...ids, ...stringIds] } },
        { executiveName: nameRegex }
      ]
    });

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Site visit not found or unauthorized' });
    }

    if (status) visit.status = status;
    if (feedback) visit.customerFeedback = feedback;
    if (interestedPlot) visit.interestedPlot = interestedPlot;
    if (negotiationStatus) visit.remarks = negotiationStatus;

    await visit.save();

    res.status(200).json({
      success: true,
      message: 'Site visit feedback updated successfully!',
      data: visit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check Plots Availability & Request Hold (Price edit blocked)
// @route   PUT /api/sales-user/plots/:id/hold-request
// @access  Private (sales_user)
export const requestPlotHold = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { customerName, customerPhone, remarks } = req.body;

    const plot = await Plot.findOne({ _id: id, companyId });
    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found' });
    }

    if (plot.status !== 'Available') {
      return res.status(400).json({
        success: false,
        message: `Plot ${plot.plotNumber} is currently "${plot.status}" and cannot be held.`
      });
    }

    plot.status = 'Hold';
    plot.holdCustomerName = customerName || '';
    plot.holdCustomerPhone = customerPhone || '';
    plot.heldBy = req.user._id;
    plot.heldByName = req.user.name;
    plot.heldAt = new Date();
    plot.holdRemarks = remarks || `Hold requested by sales user ${req.user.name}`;

    await plot.save();

    res.status(200).json({
      success: true,
      message: `Plot ${plot.plotNumber} successfully marked as Hold for ${customerName}!`,
      data: plot
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get My Bookings
// @route   GET /api/sales-user/bookings
// @access  Private (sales_user)
export const getMyBookings = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search, status } = req.query;
    const { ids, stringIds, nameRegex } = await getSalesIdentifiers(req.user);

    let query = {
      companyId,
      $or: [
        { salesExecutiveId: { $in: [...ids, ...stringIds] } },
        { executiveName: nameRegex },
        { salesExecutive: nameRegex }
      ]
    };

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      query.$and = [
        {
          $or: [
            { customerName: reg },
            { buyerName: reg },
            { phone: reg },
            { plotNumber: reg },
            { projectName: reg },
            { bookingId: reg }
          ]
        }
      ];
    }

    const bookings = await Booking.find(query).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit Booking Request (Requires Manager / Company approval, price alteration blocked)
// @route   POST /api/sales-user/bookings
// @access  Private (sales_user)
export const createBookingRequest = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const body = req.body;

    const count = await Booking.countDocuments({ companyId });
    const bookingId = `BK-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    // Get plot details to ensure master plot price is preserved
    let totalAmount = Number(body.totalAmount || 0);
    if (body.plotId) {
      const plot = await Plot.findById(body.plotId);
      if (plot) {
        totalAmount = Number(plot.totalPrice || plot.price || totalAmount);
        plot.status = 'Booked';
        await plot.save();
      }
    }

    const booking = await Booking.create({
      companyId,
      branchId: req.user.branchId || null,
      bookingId,
      customerName: body.customerName || body.buyerName,
      phone: body.phone,
      email: body.email || '',
      projectName: body.projectName,
      plotNumber: body.plotNumber || body.plotNo,
      plotSize: body.plotSize || '',
      totalAmount,
      tokenAmount: Number(body.tokenAmount || 0),
      downPayment: Number(body.downPayment || 0),
      paymentMode: body.paymentMode || 'Bank Transfer',
      salesExecutiveId: req.user._id,
      salesExecutive: req.user.name,
      executiveName: req.user.name,
      status: 'Pending Approval', // Needs manager / company admin approval
      bookingDate: new Date()
    });

    res.status(201).json({
      success: true,
      message: `Booking request (${booking.bookingId}) submitted successfully! Pending Manager / Company Admin approval.`,
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get My Customers
// @route   GET /api/sales-user/customers
// @access  Private (sales_user)
export const getMyCustomers = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search } = req.query;
    const { ids, stringIds, nameRegex } = await getSalesIdentifiers(req.user);

    // Get customers linked to this sales user via bookings or assigned leads
    const bookings = await Booking.find({
      companyId,
      $or: [
        { salesExecutiveId: { $in: [...ids, ...stringIds] } },
        { executiveName: nameRegex }
      ]
    }).lean();

    const customerPhones = [...new Set(bookings.map(b => b.phone).filter(Boolean))];

    let query = {
      companyId,
      $or: [
        { assignedTo: { $in: [...ids, ...stringIds] } },
        { salesExecutiveId: { $in: [...ids, ...stringIds] } },
        { phone: { $in: customerPhones } }
      ]
    };

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      query.$and = [
        {
          $or: [
            { name: reg },
            { customerName: reg },
            { phone: reg },
            { email: reg },
            { city: reg }
          ]
        }
      ];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

