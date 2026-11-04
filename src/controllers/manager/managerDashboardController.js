import { Lead } from '../../models/Lead.js';
import { Booking } from '../../models/Booking.js';
import { SiteVisit } from '../../models/SiteVisit.js';
import { CallLog } from '../../models/CallLog.js';
import { User } from '../../models/User.js';
import { Branch } from '../../models/Branch.js';

// @desc    Get Manager Dashboard Live Stats & Feeds
// @route   GET /api/manager/dashboard
// @access  Private (manager)
export const getManagerDashboardStats = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const managerId = req.user._id;
    const branchId = req.user.branchId;

    // 1. Fetch branch information if assigned
    let branch = null;
    if (branchId) {
      branch = await Branch.findOne({ _id: branchId, companyId }).lean();
    } else {
      branch = await Branch.findOne({ companyId, managerId }).lean();
    }

    // 2. Fetch sales executives in this manager's team/branch
    let teamQuery = { companyId, role: 'sales_user' };
    if (branch?._id) {
      teamQuery.$or = [
        { branchId: branch._id },
        { branchName: branch.name }
      ];
    }
    const teamMembers = await User.find(teamQuery).select('name email phone role isActive avatar').lean();
    const teamMemberIds = teamMembers.map(m => m._id);

    // 3. Lead stats for manager's branch / company
    let leadFilter = { companyId };
    if (branch?._id) {
      leadFilter.$or = [
        { branchId: branch._id },
        { branch: branch.name },
        { assignedTo: { $in: teamMemberIds } },
        { assignedTo: null },
        { assignedTo: { $exists: false } }
      ];
    }

    const allLeads = await Lead.find(leadFilter).sort({ createdAt: -1 }).lean();

    const unassignedLeads = allLeads.filter(l => !l.assignedTo || l.status === 'New');
    const activePipelineLeads = allLeads.filter(l => l.assignedTo && l.status !== 'Won' && l.status !== 'Lost');
    
    // Follow-ups due today
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysFollowups = allLeads.filter(l => l.nextFollowUpDate && l.nextFollowUpDate.startsWith(todayStr));

    // 4. Call logs made by team
    let callFilter = { companyId };
    if (teamMemberIds.length > 0) {
      callFilter.callerId = { $in: teamMemberIds };
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayCalls = await CallLog.find({
      ...callFilter,
      createdAt: { $gte: startOfToday }
    }).lean();

    // 5. Site visits
    let visitFilter = { companyId };
    if (branch?._id) {
      visitFilter.$or = [
        { branchId: branch._id },
        { assignedTo: { $in: teamMemberIds } }
      ];
    }
    const allVisits = await SiteVisit.find(visitFilter).sort({ visitDate: -1 }).lean();
    const scheduledVisits = allVisits.filter(v => ['Scheduled', 'Confirmed', 'Pending'].includes(v.status));

    // 6. Bookings awaiting review
    let bookingFilter = { companyId };
    if (branch?._id) {
      bookingFilter.$or = [
        { branchId: branch._id },
        { salesExecutiveId: { $in: teamMemberIds } }
      ];
    }
    const bookings = await Booking.find(bookingFilter).sort({ createdAt: -1 }).lean();
    const pendingBookings = bookings.filter(b => b.status === 'Pending' || b.status === 'In Review' || b.status === 'Token Submitted');

    // 7. Team performance metrics for charts (Live Site Visits vs Live Bookings closed per executive)
    const executivePerformance = teamMembers.map(member => {
      const memberVisits = allVisits.filter(v => 
        String(v.executiveName).toLowerCase() === member.name.toLowerCase() || 
        String(v.assignedTo) === String(member._id)
      ).length;
      
      const memberBookings = bookings.filter(b => 
        String(b.salesExecutiveId) === String(member._id) || 
        String(b.salesExecutive).toLowerCase() === member.name.toLowerCase()
      ).length;

      return {
        id: member._id,
        name: member.name,
        visits: memberVisits,
        bookings: memberBookings
      };
    });

    // 8. Pipeline stage distribution
    const stageCounts = {
      fresh: allLeads.filter(l => !l.status || l.status === 'New').length,
      contacted: allLeads.filter(l => l.status === 'Contacted' || l.status === 'Follow-Up' || l.status === 'Interested').length,
      siteVisit: allLeads.filter(l => l.status === 'Site Visit' || l.status === 'Site Visit Scheduled').length,
      booking: allLeads.filter(l => l.status === 'Won' || l.status === 'Booked' || l.status === 'Negotiation').length
    };

    res.status(200).json({
      success: true,
      data: {
        branch: branch ? {
          id: branch._id,
          name: branch.name,
          code: branch.branchCode,
          type: branch.branchType,
          city: branch.city,
          address: branch.addressLine1
        } : null,
        metrics: {
          unassignedLeadsCount: unassignedLeads.length,
          activePipelineCount: activePipelineLeads.length,
          todaysFollowupsCount: todaysFollowups.length,
          todayCallsCount: todayCalls.length,
          siteVisitsCount: scheduledVisits.length,
          pendingBookingsCount: pendingBookings.length,
          teamMembersCount: teamMembers.length
        },
        teamMembers,
        executivePerformance,
        stageCounts,
        freshLeads: unassignedLeads.slice(0, 10).map(l => ({
          id: l.leadId || l._id,
          _id: l._id,
          name: l.name || l.fullName,
          phone: l.phone,
          project: l.projectInterested || l.projectName || 'Township Plot',
          source: l.source || 'Direct Inquiry',
          createdAt: l.createdAt
        })),
        recentBookings: pendingBookings.slice(0, 10).map(b => ({
          id: b.bookingId || b._id,
          _id: b._id,
          client: b.customerName || 'Customer',
          unit: b.plotNumber ? `Plot #${b.plotNumber}` : 'Unit',
          project: b.projectName || 'Township',
          token: `₹${(b.tokenAmount || b.bookingAmount || 51000).toLocaleString('en-IN')}`,
          exec: b.salesExecutive || 'Sales Executive',
          status: b.status || 'Pending Review'
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign Lead to Sales Executive
// @route   POST /api/manager/assign-lead
// @access  Private (manager)
export const assignLeadToExecutive = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { leadId, executiveId } = req.body;

    if (!leadId || !executiveId) {
      return res.status(400).json({ success: false, message: 'leadId and executiveId are required' });
    }

    const executive = await User.findOne({ _id: executiveId, companyId });
    if (!executive) {
      return res.status(404).json({ success: false, message: 'Executive not found' });
    }

    const lead = await Lead.findOneAndUpdate(
      { _id: leadId, companyId },
      {
        $set: {
          assignedTo: executive._id,
          assignedToName: executive.name,
          status: 'Contacted',
          assignedDate: new Date()
        }
      },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({
      success: true,
      message: `Lead successfully assigned to ${executive.name}!`,
      data: lead
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

