import { Branch } from '../../models/Branch.js';
import { User } from '../../models/User.js';

// Auto generate branch code
const generateBranchCode = async (companyId) => {
  const count = await Branch.countDocuments({ companyId });
  return `BR-${String(count + 1).padStart(3, '0')}`;
};

// @desc    Get all branches for current company
// @route   GET /api/company-admin/branches
// @access  Private (company_admin)
export const getBranches = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search, status } = req.query;

    let query = { companyId };
    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { branchCode: regex },
        { city: regex },
        { managerName: regex },
        { phone: regex },
        { branchType: regex }
      ];
    }

    const branches = await Branch.find(query).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches.map(b => ({
        ...b,
        id: b._id,
        contactPerson: b.managerName,
        staffCount: `${b.numberOfEmployees || 5} Members`,
        projectsCovered: b.assignedProjects?.length ? b.assignedProjects.join(', ') : 'All Projects',
        addedBy: b.createdByUserName || 'Company Admin'
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new branch with 6 complete sections
// @route   POST /api/company-admin/branches
// @access  Private (company_admin)
export const createBranch = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const body = req.body;

    if (!body.name || !body.phone || !body.managerName || !body.addressLine1 || !body.city || !body.state || !body.pinCode) {
      return res.status(400).json({
        success: false,
        message: 'Branch Name, Phone, Address Line 1, City, State, PIN Code and Manager Name are required'
      });
    }

    const branchCode = body.branchCode || await generateBranchCode(companyId);

    const branch = await Branch.create({
      companyId,
      // 1. Basic Information
      name: body.name.trim(),
      branchCode,
      branchType: body.branchType || 'Sales Office',
      status: body.status || 'Active',
      openingDate: body.openingDate || new Date().toISOString().split('T')[0],
      description: body.description || '',
      createdByUserId: req.user._id || req.user.id,
      createdByUserName: req.user.name || 'Company Admin',

      // 2. Contact Information
      phone: body.phone.trim(),
      alternatePhone: body.alternatePhone || '',
      email: body.email ? body.email.trim().toLowerCase() : '',
      website: body.website || '',

      // 3. Address
      addressLine1: body.addressLine1.trim(),
      addressLine2: body.addressLine2 || '',
      country: body.country || 'India',
      state: body.state.trim(),
      city: body.city.trim(),
      pinCode: body.pinCode.trim(),
      googleMapsLocation: body.googleMapsLocation || '',

      // 4. Branch Manager
      managerMode: body.managerMode || 'new',
      managerId: body.managerId || null,
      managerName: body.managerName.trim(),
      managerEmail: body.managerEmail ? body.managerEmail.trim().toLowerCase() : '',
      managerPhone: body.managerPhone || body.phone.trim(),
      managerDesignation: body.managerDesignation || 'Branch Manager',
      managerJoiningDate: body.managerJoiningDate || '',
      managerPassword: body.managerPassword || 'password123',

      // 5. Operations
      assignedProjects: Array.isArray(body.assignedProjects) ? body.assignedProjects : [],
      assignedSalesTeams: Array.isArray(body.assignedSalesTeams) ? body.assignedSalesTeams : [],
      numberOfEmployees: Number(body.numberOfEmployees) || 5,
      workingDays: body.workingDays || 'Monday - Saturday',
      openingTime: body.openingTime || '09:30 AM',
      closingTime: body.closingTime || '06:30 PM',
      operationsNotes: body.operationsNotes || '',

      // 6. Settings
      settings: {
        allowLeadAssignment: body.settings?.allowLeadAssignment ?? true,
        allowPropertyManagement: body.settings?.allowPropertyManagement ?? true,
        allowBookingManagement: body.settings?.allowBookingManagement ?? true,
        allowAgentManagement: body.settings?.allowAgentManagement ?? true,
        allowPaymentManagement: body.settings?.allowPaymentManagement ?? true,
        allowReportsAccess: body.settings?.allowReportsAccess ?? true
      }
    });

    // Auto-create or link User login account for Branch Manager (role: 'manager')
    const managerEmail = (branch.managerEmail || `manager.${branch.branchCode.toLowerCase()}@crm.com`).trim().toLowerCase();
    let managerUser = await User.findOne({ email: managerEmail });
    if (!managerUser) {
      managerUser = await User.create({
        name: branch.managerName,
        email: managerEmail,
        phone: branch.managerPhone || branch.phone,
        password: branch.managerPassword || 'password123',
        role: 'manager',
        badge: `${branch.name} Head`,
        companyId,
        branchId: branch._id,
        branchName: branch.name,
        isActive: branch.status === 'Active'
      });
      branch.managerId = managerUser._id;
      await branch.save();
    } else {
      managerUser.role = 'manager';
      managerUser.companyId = companyId;
      managerUser.branchId = branch._id;
      managerUser.branchName = branch.name;
      managerUser.isActive = branch.status === 'Active';
      if (branch.managerPassword) {
        managerUser.password = branch.managerPassword;
      }
      await managerUser.save();
    }

    res.status(201).json({
      success: true,
      message: `Branch "${branch.name}" (${branch.branchCode}) created successfully! Manager login created (${managerEmail}).`,
      data: branch
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update branch
// @route   PUT /api/company-admin/branches/:id
// @access  Private (company_admin)
export const updateBranch = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const branch = await Branch.findOneAndUpdate(
      { _id: id, companyId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    // Sync Manager user account
    const managerEmail = (branch.managerEmail || `manager.${branch.branchCode.toLowerCase()}@crm.com`).trim().toLowerCase();
    let managerUser = await User.findOne({ email: managerEmail }).select('+password');
    if (!managerUser) {
      managerUser = await User.create({
        name: branch.managerName,
        email: managerEmail,
        phone: branch.managerPhone || branch.phone,
        password: branch.managerPassword || req.body.managerPassword || 'password123',
        role: 'manager',
        badge: `${branch.name} Head`,
        companyId,
        branchId: branch._id,
        branchName: branch.name,
        isActive: branch.status === 'Active'
      });
      branch.managerId = managerUser._id;
      await branch.save();
    } else {
      managerUser.role = 'manager';
      managerUser.name = branch.managerName;
      managerUser.companyId = companyId;
      managerUser.branchId = branch._id;
      managerUser.branchName = branch.name;
      if (req.body.status) {
        managerUser.isActive = branch.status === 'Active';
      }
      if (req.body.managerPassword && req.body.managerPassword.trim()) {
        managerUser.password = req.body.managerPassword.trim();
      }
      await managerUser.save();
    }

    res.status(200).json({
      success: true,
      message: `Branch "${branch.name}" updated successfully!`,
      data: branch
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete branch
// @route   DELETE /api/company-admin/branches/:id
// @access  Private (company_admin)
export const deleteBranch = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const branch = await Branch.findOneAndDelete({ _id: id, companyId });
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    res.status(200).json({
      success: true,
      message: `Branch "${branch.name}" deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single branch with full activity & staff tracking
// @route   GET /api/company-admin/branches/:id
// @access  Private (company_admin)
export const getBranchDetail = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const branch = await Branch.findOne({ _id: id, companyId }).lean();
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    // 1. Staff Members in this branch
    const staffMembers = await User.find({
      companyId,
      $or: [
        { branchId: branch._id },
        { branchName: branch.name }
      ]
    }).select('-password').sort({ createdAt: -1 }).lean();

    const staffUserIds = staffMembers.map(s => s._id);

    // 2. Leads handled by branch or branch staff
    const Lead = (await import('../../models/Lead.js')).Lead;
    const leads = await Lead.find({
      companyId,
      $or: [
        { branchId: branch._id },
        { branch: branch.name },
        { assignedTo: { $in: staffUserIds } }
      ]
    }).sort({ createdAt: -1 }).limit(100).lean();

    // 3. Bookings closed by branch or branch staff
    const Booking = (await import('../../models/Booking.js')).Booking;
    const bookings = await Booking.find({
      companyId,
      $or: [
        { branchId: branch._id },
        { branch: branch.name },
        { salesExecutiveId: { $in: staffUserIds } }
      ]
    }).sort({ createdAt: -1 }).lean();

    // 4. Site Visits conducted by branch
    const SiteVisit = (await import('../../models/SiteVisit.js')).SiteVisit;
    const siteVisits = await SiteVisit.find({
      companyId,
      $or: [
        { branchId: branch._id },
        { assignedTo: { $in: staffUserIds } }
      ]
    }).sort({ visitDate: -1 }).limit(50).lean();

    // Calculate aggregated metrics
    const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.dealValue || b.totalAmount || b.plotPrice || 0)), 0);
    const totalCollected = bookings.reduce((sum, b) => sum + (Number(b.bookingAmount || b.downPayment || 0)), 0);
    const activeStaff = staffMembers.filter(s => s.isActive).length;

    res.status(200).json({
      success: true,
      data: {
        branch,
        stats: {
          totalStaff: staffMembers.length,
          activeStaff,
          totalLeads: leads.length,
          convertedLeads: leads.filter(l => l.status === 'Won' || l.status === 'Booked').length,
          totalBookings: bookings.length,
          totalRevenue,
          totalCollected,
          totalSiteVisits: siteVisits.length
        },
        staffMembers,
        leads,
        bookings,
        siteVisits
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
