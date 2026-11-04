import { Company } from '../../models/Company.js';
import { Project } from '../../models/Project.js';
import { Plot } from '../../models/Plot.js';
import { Lead } from '../../models/Lead.js';
import { Booking } from '../../models/Booking.js';
import { SiteVisit } from '../../models/SiteVisit.js';
import { CallLog } from '../../models/CallLog.js';
import { User } from '../../models/User.js';

// @desc    Get Tenant Company Dashboard Overview (Stats, Charts, Feeds)
// @route   GET /api/company-admin/dashboard
// @access  Private (company_admin)
export const getCompanyDashboardStats = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'User is not linked to any company tenant' });
    }

    const company = await Company.findById(companyId).lean();
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company tenant not found' });
    }

    // 1. Live Leads Pipeline
    const totalLeads = await Lead.countDocuments({ companyId });
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const leadsLastWeek = await Lead.countDocuments({ companyId, createdAt: { $gte: oneWeekAgo } });
    const leadsGrowthPercent = totalLeads > 0 ? Math.round((leadsLastWeek / totalLeads) * 100) : 0;

    // 2. Telephony / Calls Metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCallsCount = await CallLog.countDocuments({
      companyId,
      createdAt: { $gte: today, $lt: tomorrow }
    });
    const connectedCallsCount = await CallLog.countDocuments({
      companyId,
      createdAt: { $gte: today, $lt: tomorrow },
      status: 'Connected'
    });
    const totalCalls = await CallLog.countDocuments({ companyId });
    const connectionRate = todayCallsCount > 0 
      ? Math.round((connectedCallsCount / todayCallsCount) * 100) 
      : (totalCalls > 0 ? Math.round((connectedCallsCount / totalCalls) * 100) : 0);

    // 3. Site Visits
    const totalVisits = await SiteVisit.countDocuments({ companyId });
    const todayVisitsCount = await SiteVisit.countDocuments({
      companyId,
      visitDate: { $gte: today, $lt: tomorrow }
    });

    // 4. Plot Inventory Live Distribution
    const totalProjects = await Project.countDocuments({ companyId });
    const totalPlots = await Plot.countDocuments({ companyId });
    const availablePlots = await Plot.countDocuments({ companyId, status: 'Available' });
    const bookedPlots = await Plot.countDocuments({ companyId, status: 'Booked' });
    const holdPlots = await Plot.countDocuments({ companyId, status: 'Hold' });
    const registeredPlots = await Plot.countDocuments({ companyId, status: 'Registered' });

    // 5. Bookings & Sales Revenue
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const bookings = await Booking.find({ companyId }).lean();
    const approvedBookings = bookings.filter(b => b.status === 'Approved');
    const mtdBookings = approvedBookings.filter(b => new Date(b.createdAt) >= startOfMonth);

    const totalSalesVolume = approvedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalCollected = bookings.reduce((sum, b) => sum + (b.paidAmount || b.tokenAmount || 0), 0);

    const formatRupees = (amount) => {
      if (!amount || amount === 0) return '₹0';
      if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
      }
      if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} Lakh`;
      }
      return `₹${amount.toLocaleString('en-IN')}`;
    };

    // 6. Conversion Funnel Stages Breakdown
    const stages = ['New Leads', 'Contacted', 'Interested', 'Site Visit Done', 'Token Booking', 'Sale Registered'];
    const funnelCounts = await Promise.all(
      stages.map(async (st) => {
        return await Lead.countDocuments({
          companyId,
          stage: { $regex: new RegExp(`^${st}`, 'i') }
        });
      })
    );

    // 7. Monthly Revenue Trend (Last 6 Months)
    const monthlyRevenue = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthBookings = approvedBookings.filter(b => {
        const bDate = new Date(b.createdAt || b.bookingDate);
        return bDate >= mStart && bDate <= mEnd;
      });
      const revInLakhs = monthBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0) / 100000;
      monthlyRevenue.push({
        month: monthNames[mStart.getMonth()],
        revenue: Math.round(revInLakhs * 10) / 10
      });
    }

    // 8. Staff Count
    const totalStaff = await User.countDocuments({ companyId, isActive: true });

    // 9. Pending Booking Approvals (Latest 5)
    const pendingBookings = await Booking.find({ companyId, status: 'Pending Approval' })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // 10. Today / Upcoming Scheduled Site Visits (Latest 5)
    const upcomingVisits = await SiteVisit.find({ companyId, status: 'Scheduled' })
      .sort({ visitDate: 1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        company: {
          id: company._id,
          name: company.name,
          plan: company.plan,
          status: company.status,
          usersLimit: company.usersLimit,
          projectsLimit: company.projectsLimit,
          callingProvider: company.callingProvider
        },
        kpis: {
          leads: {
            total: totalLeads,
            label: `${totalLeads} Leads`,
            change: leadsGrowthPercent > 0 ? `+${leadsGrowthPercent}% this week` : 'Live Pipeline'
          },
          calls: {
            total: todayCallsCount,
            todayCount: todayCallsCount,
            totalAllTime: totalCalls,
            label: `${todayCallsCount} Calls`,
            change: `${connectionRate}% Connected`
          },
          siteVisits: {
            total: totalVisits,
            today: todayVisitsCount,
            label: `${totalVisits} Visits`,
            change: `${todayVisitsCount || 0} Scheduled Today`
          },
          inventory: {
            total: totalPlots,
            available: availablePlots,
            booked: bookedPlots,
            hold: holdPlots,
            registered: registeredPlots,
            label: `${availablePlots} / ${totalPlots} Plots`,
            change: `${bookedPlots} Booked, ${holdPlots} On Hold`
          },
          bookings: {
            count: approvedBookings.length,
            mtdCount: mtdBookings.length,
            label: `${mtdBookings.length || approvedBookings.length} Units`,
            volume: totalSalesVolume,
            change: `${formatRupees(totalSalesVolume)} Sales Volume`
          },
          revenue: {
            collected: totalCollected,
            label: formatRupees(totalCollected),
            change: 'Token & Installments'
          },
          projects: {
            total: totalProjects,
            limit: company.projectsLimit
          },
          staff: {
            total: totalStaff,
            limit: company.usersLimit
          }
        },
        funnel: {
          categories: stages,
          data: funnelCounts
        },
        plotDistribution: [
          { name: 'Available Plots', y: availablePlots, color: '#0F766E' },
          { name: 'Booked Plots', y: bookedPlots, color: '#102A2E' },
          { name: 'Temporary Hold', y: holdPlots, color: '#D6A84B' },
          { name: 'Registry Done', y: registeredPlots, color: '#3B82F6' }
        ],
        revenueTrend: {
          categories: monthlyRevenue.map(m => m.month),
          data: monthlyRevenue.map(m => m.revenue)
        },
        pendingBookings,
        upcomingVisits
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Quick Add Lead from Company Admin Dashboard
// @route   POST /api/company-admin/dashboard/quick-lead
// @access  Private (company_admin)
export const quickAddLead = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { name, phone, projectName, source } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    const lead = await Lead.create({
      companyId,
      name: name.trim(),
      phone: phone.trim(),
      projectName: projectName || 'Township Project',
      source: source || 'Dashboard Quick Add',
      stage: 'New Leads'
    });

    res.status(201).json({
      success: true,
      message: 'Lead registered successfully!',
      data: lead
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve Booking from Dashboard Feed
// @route   PUT /api/company-admin/dashboard/bookings/:id/approve
// @access  Private (company_admin)
export const approveBooking = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const booking = await Booking.findOne({ _id: req.params.id, companyId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.status = 'Approved';
    await booking.save();

    // Also update plot status if linked
    if (booking.plotId) {
      await Plot.findByIdAndUpdate(booking.plotId, { status: 'Booked' });
    }

    res.status(200).json({
      success: true,
      message: `Booking #${booking.bookingId} approved successfully!`,
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
