import { Agent } from '../../models/Agent.js';
import { Project } from '../../models/Project.js';
import { Plot } from '../../models/Plot.js';
import { Lead } from '../../models/Lead.js';
import { Booking } from '../../models/Booking.js';
import { SiteVisit } from '../../models/SiteVisit.js';
import { Customer } from '../../models/Customer.js';
import mongoose from 'mongoose';

/**
 * Strict Agent Resolver Helper:
 * Finds agent document in Agent collection matching logged-in user's email, phone, or name under the companyId
 */
export const getAgentRecord = async (user) => {
  const companyId = user.companyId;
  const orFilters = [];

  if (mongoose.Types.ObjectId.isValid(user._id)) {
    orFilters.push({ userId: user._id });
  }
  if (user.email) {
    orFilters.push({ email: user.email.toLowerCase() });
  }
  if (user.phone) {
    orFilters.push({ phone: user.phone });
  }
  if (user.name) {
    orFilters.push({ fullName: new RegExp(`^${user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    orFilters.push({ agencyName: new RegExp(`^${user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
  }

  let agent = await Agent.findOne({ companyId, $or: orFilters });

  const agentIds = [];
  const stringIds = [];
  const agentNames = [user.name];

  if (agent) {
    agentIds.push(agent._id);
    stringIds.push(String(agent._id));
    if (agent.fullName) agentNames.push(agent.fullName);
    if (agent.agencyName) agentNames.push(agent.agencyName);
  }
  agentIds.push(user._id);
  stringIds.push(String(user._id));

  const uniqueNames = [...new Set(agentNames.filter(Boolean))];
  const nameRegex = { $in: uniqueNames.map(n => new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')) };

  return {
    agent,
    agentIds,
    stringIds,
    nameRegex,
    agentCode: agent?.agentCode || 'CP-PARTNER',
    commissionRate: agent?.commissionPercentage || agent?.commissionStructure?.percentage || '2.0%'
  };
};

// =========================================================================
// 1. AGENT DASHBOARD OVERVIEW
// @route   GET /api/agent/dashboard
// @access  Private (agent)
// =========================================================================
export const getAgentDashboard = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { agent, agentIds, stringIds, nameRegex, commissionRate } = await getAgentRecord(req.user);

    // Filter only my leads
    const leadsQuery = {
      companyId,
      $or: [
        { agentId: { $in: [...agentIds, ...stringIds] } },
        { agentName: nameRegex },
        { referenceName: nameRegex }
      ]
    };
    const totalLeads = await Lead.countDocuments(leadsQuery);

    // Filter only my site visits
    const visitsQuery = {
      companyId,
      $or: [
        { agentId: { $in: [...agentIds, ...stringIds] } },
        { agentName: nameRegex }
      ]
    };
    const totalSiteVisits = await SiteVisit.countDocuments(visitsQuery);
    const scheduledVisits = await SiteVisit.countDocuments({ ...visitsQuery, status: 'Scheduled' });
    const completedVisits = await SiteVisit.countDocuments({ ...visitsQuery, status: 'Completed' });

    // Filter only my bookings
    const bookingsQuery = {
      companyId,
      $or: [
        { agentId: { $in: [...agentIds, ...stringIds] } },
        { agentName: nameRegex }
      ]
    };
    const bookings = await Booking.find(bookingsQuery).sort({ createdAt: -1 }).lean();
    const totalBookings = bookings.length;

    // Commission calculations from approved deals
    let totalSalesVolume = 0;
    let totalEarnedCommission = 0;
    let pendingCommission = 0;
    let approvedCommission = 0;
    let paidCommission = 0;

    bookings.forEach(b => {
      const dealAmount = Number(b.totalAmount) || 0;
      totalSalesVolume += dealAmount;
      const commAmount = Number(b.agentCommissionAmount) || 0;
      totalEarnedCommission += commAmount;

      if (b.agentCommissionStatus === 'Paid') {
        paidCommission += commAmount;
      } else if (b.agentCommissionStatus === 'Approved') {
        approvedCommission += commAmount;
      } else {
        pendingCommission += commAmount;
      }
    });

    // Recent 5 leads & 5 bookings
    const recentLeads = await Lead.find(leadsQuery).sort({ createdAt: -1 }).limit(5).lean();
    const recentBookings = bookings.slice(0, 5);

    // Available Inventory Stats
    const totalAvailablePlots = await Plot.countDocuments({ companyId, status: 'Available' });
    const totalActiveProjects = await Project.countDocuments({ companyId, status: 'Active' });

    res.status(200).json({
      success: true,
      data: {
        agentProfile: {
          name: agent?.fullName || req.user.name,
          agencyName: agent?.agencyName || 'Channel Partner Agency',
          agentCode: agent?.agentCode || 'CP-PARTNER',
          phone: agent?.phone || req.user.phone,
          email: agent?.email || req.user.email,
          commissionRate: commissionRate || '2.0%',
          branchName: agent?.branchName || req.user.branchName || 'Main Office'
        },
        kpis: {
          totalLeads,
          totalSiteVisits,
          scheduledVisits,
          completedVisits,
          totalBookings,
          totalSalesVolume,
          totalEarnedCommission,
          pendingCommission,
          approvedCommission,
          paidCommission,
          totalAvailablePlots,
          totalActiveProjects
        },
        recentLeads,
        recentBookings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 2. AVAILABLE PROJECTS & PLOTS (READ-ONLY INVENTORY FOR AGENT)
// @route   GET /api/agent/projects
// @route   GET /api/agent/plots
// @access  Private (agent)
// =========================================================================
export const getAvailableProjects = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const projects = await Project.find({ companyId, status: 'Active' }).sort({ createdAt: -1 }).lean();

    const result = await Promise.all(projects.map(async p => {
      const availablePlots = await Plot.countDocuments({ companyId, projectId: p._id, status: 'Available' });
      const totalPlots = await Plot.countDocuments({ companyId, projectId: p._id });
      return {
        ...p,
        availablePlots,
        totalPlots
      };
    }));

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAvailablePlots = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { projectId, search, status } = req.query;

    let query = { companyId };
    if (projectId && projectId !== 'All') {
      query.projectId = projectId;
    }
    if (status && status !== 'All') {
      query.status = status;
    }
    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [{ plotNumber: reg }, { block: reg }, { facing: reg }];
    }

    const plots = await Plot.find(query).populate('projectId', 'name code').sort({ plotNumber: 1 }).lean();

    res.status(200).json({
      success: true,
      count: plots.length,
      data: plots
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 3. MY LEADS (STRICT ISOLATION - ONLY AGENT'S CLIENTS)
// @route   GET /api/agent/leads
// @route   POST /api/agent/leads
// @access  Private (agent)
// =========================================================================
export const getMyAgentLeads = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search, status } = req.query;
    const { agent, agentIds, stringIds, nameRegex } = await getAgentRecord(req.user);

    let query = {
      companyId,
      $or: [
        { agentId: { $in: [...agentIds, ...stringIds] } },
        { agentName: nameRegex },
        { referenceName: nameRegex }
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
            { name: reg },
            { fullName: reg },
            { phone: reg },
            { email: reg },
            { projectName: reg },
            { preferredLocation: reg }
          ]
        }
      ];
    }

    const leads = await Lead.find(query).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAgentLead = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { agent, agentCode } = await getAgentRecord(req.user);
    const body = req.body;

    const count = await Lead.countDocuments({ companyId });
    const leadId = `CP-LD-${String(count + 1).padStart(4, '0')}`;

    const newLead = await Lead.create({
      companyId,
      branchId: req.user.branchId || agent?.branchId || null,
      leadId,
      name: body.name || body.fullName,
      phone: body.phone,
      email: body.email || '',
      city: body.city || agent?.city || 'Lucknow',
      source: 'Channel Partner',
      campaignName: `Agent Referral: ${agent?.fullName || req.user.name}`,
      referenceName: `${agent?.fullName || req.user.name} (${agentCode})`,
      agentId: agent?._id || req.user._id,
      agentName: agent?.fullName || req.user.name,
      interestedIn: body.interestedIn || 'Plot / Land',
      projectId: body.projectId || null,
      projectName: body.projectName || '',
      propertySize: body.propertySize || '1200 sqft',
      budgetFrom: body.budgetFrom || '₹20 Lakh',
      budgetTo: body.budgetTo || '₹35 Lakh',
      preferredFacing: body.preferredFacing || 'East',
      purpose: body.purpose || 'Self Use',
      status: 'New',
      remarks: body.remarks || `Customer added directly by Channel Partner ${agent?.fullName || req.user.name}`
    });

    res.status(201).json({
      success: true,
      message: `Customer lead (${newLead.leadId}) registered under your Agency profile!`,
      data: newLead
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 4. MY SITE VISITS (REQUEST SITE VISIT FOR MY CUSTOMER)
// @route   GET /api/agent/site-visits
// @route   POST /api/agent/site-visits
// @access  Private (agent)
// =========================================================================
export const getMyAgentSiteVisits = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { agent, agentIds, stringIds, nameRegex } = await getAgentRecord(req.user);
    const { status, search } = req.query;

    let query = {
      companyId,
      $or: [
        { agentId: { $in: [...agentIds, ...stringIds] } },
        { agentName: nameRegex }
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
            { clientName: reg },
            { clientPhone: reg },
            { projectName: reg },
            { plotInterested: reg }
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

export const requestAgentSiteVisit = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { agent } = await getAgentRecord(req.user);
    const body = req.body;

    const newVisit = await SiteVisit.create({
      companyId,
      branchId: req.user.branchId || agent?.branchId || null,
      clientName: body.clientName || body.customerName,
      clientPhone: body.clientPhone || body.phone,
      projectId: body.projectId || null,
      projectName: body.projectName || 'Township Project',
      plotInterested: body.plotInterested || body.plotNumber || '',
      agentId: agent?._id || req.user._id,
      agentName: agent?.fullName || req.user.name,
      executiveName: 'Sales Team Assigned',
      vehicle: body.vehicle || 'Company Escorted Vehicle',
      visitDate: body.visitDate ? new Date(body.visitDate) : new Date(),
      timeSlot: body.timeSlot || '11:00 AM',
      status: 'Scheduled',
      feedback: body.notes || `Site Visit booked by Agent ${agent?.fullName || req.user.name}`
    });

    res.status(201).json({
      success: true,
      message: `Site visit for ${newVisit.clientName} successfully scheduled! Company sales team will coordinate.`,
      data: newVisit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 5. MY BOOKINGS & SALES
// @route   GET /api/agent/bookings
// @access  Private (agent)
// =========================================================================
export const getMyAgentBookings = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { agent, agentIds, stringIds, nameRegex } = await getAgentRecord(req.user);
    const { status, search } = req.query;

    let query = {
      companyId,
      $or: [
        { agentId: { $in: [...agentIds, ...stringIds] } },
        { agentName: nameRegex }
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
            { customerPhone: reg },
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

// =========================================================================
// 6. MY COMMISSIONS & PAYOUT LEDGER
// @route   GET /api/agent/commissions
// @access  Private (agent)
// =========================================================================
export const getMyAgentCommissions = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { agent, agentIds, stringIds, nameRegex, commissionRate } = await getAgentRecord(req.user);

    const query = {
      companyId,
      $or: [
        { agentId: { $in: [...agentIds, ...stringIds] } },
        { agentName: nameRegex }
      ]
    };

    const bookings = await Booking.find(query).sort({ createdAt: -1 }).lean();

    let totalEarned = 0;
    let pendingCommission = 0;
    let approvedCommission = 0;
    let paidCommission = 0;

    const commissionRecords = bookings.map(b => {
      const totalAmount = Number(b.totalAmount) || 0;
      const rateStr = b.agentCommissionRate || commissionRate || '2.0%';
      const rateNum = parseFloat(rateStr.replace('%', '')) || 2.0;
      const commAmount = Number(b.agentCommissionAmount) || Math.round((totalAmount * rateNum) / 100);
      const status = b.agentCommissionStatus || (b.status === 'Approved' ? 'Approved' : 'Pending Approval');

      totalEarned += commAmount;
      if (status === 'Paid') paidCommission += commAmount;
      else if (status === 'Approved') approvedCommission += commAmount;
      else pendingCommission += commAmount;

      return {
        bookingId: b.bookingId,
        bookingDate: b.bookingDate || b.createdAt,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        projectName: b.projectName,
        plotNumber: b.plotNumber,
        dealValue: totalAmount,
        tokenReceived: b.tokenAmount || 0,
        commissionRate: `${rateNum}%`,
        commissionAmount: commAmount,
        status: status,
        paymentReference: b.paymentReference || 'UTR-PENDING',
        paidDate: b.commissionPaidDate || null
      };
    });

    res.status(200).json({
      success: true,
      summary: {
        totalEarned,
        pendingCommission,
        approvedCommission,
        paidCommission,
        commissionRate: commissionRate || '2.0%',
        totalDeals: bookings.length
      },
      data: commissionRecords
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 7. MY CUSTOMERS (CLIENTS CONVERTED BY THIS AGENT)
// @route   GET /api/agent/customers
// @access  Private (agent)
// =========================================================================
export const getMyAgentCustomers = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { agent, agentIds, stringIds, nameRegex } = await getAgentRecord(req.user);
    const { search } = req.query;

    // Converted bookings by this agent
    const bookings = await Booking.find({
      companyId,
      $or: [
        { agentId: { $in: [...agentIds, ...stringIds] } },
        { agentName: nameRegex }
      ]
    }).lean();

    const customerPhones = [...new Set(bookings.map(b => b.customerPhone).filter(Boolean))];

    let query = {
      companyId,
      $or: [
        { agentId: { $in: [...agentIds, ...stringIds] } },
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

