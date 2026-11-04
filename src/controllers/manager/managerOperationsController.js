import { Lead } from '../../models/Lead.js';
import { Booking } from '../../models/Booking.js';
import { SiteVisit } from '../../models/SiteVisit.js';
import { CallLog } from '../../models/CallLog.js';
import { User } from '../../models/User.js';
import { Branch } from '../../models/Branch.js';
import { Performance } from '../../models/Performance.js';

// Helper to get branch & team IDs for current manager
const getManagerContext = async (req) => {
  const companyId = req.user.companyId;
  const managerId = req.user._id;
  const branchId = req.user.branchId;

  let branch = null;
  if (branchId) {
    branch = await Branch.findOne({ _id: branchId, companyId }).lean();
  } else {
    branch = await Branch.findOne({ companyId, managerId }).lean();
  }

  let teamQuery = { companyId, role: 'sales_user' };
  if (branch?._id) {
    teamQuery.$or = [
      { branchId: branch._id },
      { branchName: branch.name }
    ];
  }
  const teamMembers = await User.find(teamQuery).select('name email phone role isActive avatar badge').lean();
  const teamMemberIds = teamMembers.map(m => m._id);

  return { companyId, branch, teamMembers, teamMemberIds };
};

// ==========================================
// 1. LEADS CONTROLLER (GET & ASSIGN)
// ==========================================
export const getManagerLeads = async (req, res) => {
  try {
    const { companyId, branch, teamMembers, teamMemberIds } = await getManagerContext(req);
    const { search, status, executive } = req.query;

    let query = { companyId };
    if (branch?._id) {
      query.$or = [
        { branchId: branch._id },
        { branch: branch.name },
        { assignedTo: { $in: teamMemberIds } },
        { assignedTo: null },
        { assignedTo: { $exists: false } }
      ];
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (executive && executive !== 'All') {
      if (executive === 'Unassigned') {
        query.$or = [{ assignedTo: null }, { assignedTo: { $exists: false } }];
      } else {
        query.assignedTo = executive;
      }
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$and = [
        {
          $or: [
            { name: regex },
            { phone: regex },
            { email: regex },
            { leadId: regex },
            { projectInterested: regex }
          ]
        }
      ];
    }

    const leads = await Lead.find(query).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads,
      teamMembers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. CALLS CONTROLLER (GET & LOG)
// ==========================================
export const getManagerCalls = async (req, res) => {
  try {
    const { companyId, teamMemberIds, teamMembers } = await getManagerContext(req);
    const { search, status, executive } = req.query;

    let query = { companyId };
    if (teamMemberIds.length > 0) {
      query.callerId = { $in: teamMemberIds };
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (executive && executive !== 'All') {
      query.callerId = executive;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { clientName: regex },
        { clientPhone: regex },
        { callerName: regex },
        { notes: regex }
      ];
    }

    const calls = await CallLog.find(query).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: calls.length,
      data: calls,
      teamMembers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. SITE VISITS CONTROLLER
// ==========================================
export const getManagerSiteVisits = async (req, res) => {
  try {
    const { companyId, branch, teamMemberIds, teamMembers } = await getManagerContext(req);
    const { search, status, executive } = req.query;

    let query = { companyId };
    if (branch?._id) {
      query.$or = [
        { branchId: branch._id },
        { assignedTo: { $in: teamMemberIds } }
      ];
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (executive && executive !== 'All') {
      query.assignedTo = executive;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { clientName: regex },
        { clientPhone: regex },
        { executiveName: regex },
        { projectName: regex }
      ];
    }

    const visits = await SiteVisit.find(query).sort({ visitDate: -1 }).lean();

    res.status(200).json({
      success: true,
      count: visits.length,
      data: visits,
      teamMembers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateManagerSiteVisit = async (req, res) => {
  try {
    const { companyId } = await getManagerContext(req);
    const { id } = req.params;
    const { status, feedback } = req.body;

    const visit = await SiteVisit.findOneAndUpdate(
      { _id: id, companyId },
      { $set: { status, feedback } },
      { new: true }
    );

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Site visit not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Site visit updated successfully',
      data: visit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 4. BOOKINGS CONTROLLER (MANAGER REVIEW)
// ==========================================
export const getManagerBookings = async (req, res) => {
  try {
    const { companyId, branch, teamMemberIds } = await getManagerContext(req);
    const { search, status } = req.query;

    let query = { companyId };
    if (branch?._id) {
      query.$or = [
        { branchId: branch._id },
        { salesExecutiveId: { $in: teamMemberIds } }
      ];
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { customerName: regex },
        { customerPhone: regex },
        { bookingId: regex },
        { plotNumber: regex },
        { projectName: regex }
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

export const reviewManagerBooking = async (req, res) => {
  try {
    const { companyId } = await getManagerContext(req);
    const { id } = req.params;
    const { action, remarks } = req.body; // 'approve' | 'reject'

    const newStatus = action === 'approve' ? 'Recommended to Company Owner' : 'Rejected by Manager';

    const booking = await Booking.findOneAndUpdate(
      { _id: id, companyId },
      {
        $set: {
          status: newStatus,
          managerApproved: action === 'approve',
          managerRemarks: remarks || ''
        }
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({
      success: true,
      message: `Booking has been ${action === 'approve' ? 'recommended to company owner' : 'rejected'}.`,
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 5. PERFORMANCE & LEADERBOARD CONTROLLER (READ ONLY FROM PERFORMANCE COLLECTION)
// ==========================================
export const getManagerPerformance = async (req, res) => {
  try {
    const { companyId, branch, teamMemberIds } = await getManagerContext(req);
    const period = req.query.period;

    let query = { companyId };
    if (branch?._id) {
      query.$or = [
        { branchId: branch._id },
        { userId: { $in: teamMemberIds } }
      ];
    }
    if (period && period !== 'All') {
      query.period = period;
    }

    // Only read from Performance collection without auto-re-creating on delete
    const perfRecords = await Performance.find(query)
      .sort({ tokensBooked: -1, grossVolume: -1 })
      .lean();

    const totalVolume = perfRecords.reduce((sum, p) => sum + (p.grossVolume || 0), 0);

    const formattedLeaderboard = perfRecords.map((p, idx) => ({
      id: p.userId,
      _id: p._id,
      name: p.userName,
      role: p.role,
      badge: p.badge,
      callsMade: p.callsMade || 0,
      visitsDone: p.visitsDone || 0,
      tokensBooked: p.tokensBooked || 0,
      volumeNumber: p.grossVolume || 0,
      volume: (p.grossVolume || 0) >= 10000000 
        ? `₹${((p.grossVolume || 0) / 10000000).toFixed(2)} Cr`
        : ((p.grossVolume || 0) >= 100000 ? `₹${((p.grossVolume || 0) / 100000).toFixed(2)} Lakh` : `₹${(p.grossVolume || 0).toLocaleString('en-IN')}`),
      conversionRate: p.conversionRate || '0.0%',
      callsTarget: p.callsTarget,
      visitsTarget: p.visitsTarget,
      tokensBookedTarget: p.tokensBookedTarget,
      rank: String(idx + 1)
    }));

    res.status(200).json({
      success: true,
      period: period || 'All',
      branch: branch ? { name: branch.name, code: branch.branchCode } : null,
      totalVolumeFormatted: totalVolume >= 10000000 ? `₹${(totalVolume / 10000000).toFixed(2)} Cr` : `₹${(totalVolume / 100000).toFixed(2)} Lakh`,
      data: formattedLeaderboard
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

