import { Project } from '../../models/Project.js';
import { Booking } from '../../models/Booking.js';
import { Plot } from '../../models/Plot.js';
import { CallLog } from '../../models/CallLog.js';
import { SiteVisit } from '../../models/SiteVisit.js';
import { Lead } from '../../models/Lead.js';
import { Customer } from '../../models/Customer.js';
import { User } from '../../models/User.js';

// @desc    Get dynamic company reports and BI charts data
// @route   GET /api/company-admin/reports
// @access  Private (company_admin)
export const getCompanyReports = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // 1. Projects Breakdown
    const projects = await Project.find({ companyId }).lean();
    const bookings = await Booking.find({ companyId }).lean();
    const plots = await Plot.find({ companyId }).lean();
    const leads = await Lead.find({ companyId }).lean();
    const customers = await Customer.find({ companyId }).lean();

    const projectLabels = [];
    const salesVolumeData = [];
    const collectedData = [];

    for (const p of projects) {
      projectLabels.push(p.name);
      const projBookings = bookings.filter(b => String(b.projectId) === String(p._id) || b.projectName === p.name);
      const vol = projBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0) / 100000;
      const coll = projBookings.reduce((sum, b) => sum + (Number(b.paidAmount) || Number(b.tokenAmount) || 0), 0) / 100000;
      salesVolumeData.push(Math.round(vol * 10) / 10);
      collectedData.push(Math.round(coll * 10) / 10);
    }

    // 2. Staff Calling & Visit Efficiency
    const staff = await User.find({ companyId, role: { $in: ['sales_user', 'manager'] } }).lean();
    const staffNames = [];
    const callsConnectedData = [];
    const visitsGeneratedData = [];

    for (const s of staff) {
      staffNames.push(s.name ? s.name.split(' ')[0] : 'Staff');
      const staffCalls = await CallLog.countDocuments({
        companyId,
        $or: [
          { callerId: s._id },
          { callerName: new RegExp(s.name, 'i') }
        ],
        status: 'Connected'
      });
      const staffVisits = await SiteVisit.countDocuments({
        companyId,
        $or: [
          { executiveId: s._id },
          { executiveName: new RegExp(s.name, 'i') }
        ]
      });
      callsConnectedData.push(staffCalls);
      visitsGeneratedData.push(staffVisits);
    }

    // Summary Metric Aggregations
    const totalBookingsVolume = bookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const totalCollected = bookings.reduce((sum, b) => sum + (Number(b.paidAmount) || Number(b.tokenAmount) || 0), 0);
    const totalPlots = plots.length;
    const bookedPlots = plots.filter(pl => pl.status === 'Booked').length;
    const availablePlots = plots.filter(pl => pl.status === 'Available').length;
    const totalVisits = await SiteVisit.countDocuments({ companyId });
    const totalCalls = await CallLog.countDocuments({ companyId });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenueLakhs: Math.round((totalBookingsVolume / 100000) * 10) / 10,
          totalCollectedLakhs: Math.round((totalCollected / 100000) * 10) / 10,
          totalBookings: bookings.length,
          totalPlots,
          bookedPlots,
          availablePlots,
          totalLeads: leads.length,
          totalCustomers: customers.length,
          totalVisits,
          totalCalls
        },
        salesByProject: {
          categories: projectLabels,
          volume: salesVolumeData,
          collected: collectedData
        },
        staffEfficiency: {
          categories: staffNames,
          calls: callsConnectedData,
          visits: visitsGeneratedData
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
