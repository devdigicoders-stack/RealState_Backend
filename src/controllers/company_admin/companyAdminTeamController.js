import { SalesExecutive } from '../../models/SalesExecutive.js';
import { User } from '../../models/User.js';
import { Lead } from '../../models/Lead.js';
import { CallLog } from '../../models/CallLog.js';
import { SiteVisit } from '../../models/SiteVisit.js';
import { Booking } from '../../models/Booking.js';

// Auto-generate employee ID
const generateEmployeeId = async (companyId) => {
  const count = await SalesExecutive.countDocuments({ companyId });
  const num = String(count + 1).padStart(4, '0');
  return `EMP-${num}`;
};

// @desc    Get all Sales Executives from SalesExecutive collection
// @route   GET /api/company-admin/team
// @access  Private (company_admin, manager)
export const getTeamMembers = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search, status } = req.query;

    let query = { companyId };

    // Strict multi-tenancy & branch isolation
    if (req.user.role === 'manager' && req.user.branchId) {
      query.branchId = req.user.branchId;
    } else if (req.user.role === 'company_admin') {
      // Company Admin should ONLY see branch-created sales users AFTER branch has handed over!
      query.$or = [
        { branchId: null },
        { branchId: { $exists: false } },
        { createdByType: 'company_admin' },
        { handoverStatus: { $in: ['Reviewed & Handed Over', 'Company Approved', 'Company Rejected'] } }
      ];
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: regex },
        { loginEmail: regex },
        { mobileNumber: regex },
        { employeeId: regex },
        { designation: regex },
        { branchName: regex }
      ];
    }

    if (status && status !== 'All') {
      if (status === 'Active') query.accountStatus = 'Active';
      else if (status === 'Pending') query.accountStatus = 'Pending Verification';
      else if (status === 'Rejected') query.accountStatus = 'Rejected';
    }

    const executives = await SalesExecutive.find(query).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: executives.length,
      data: executives.map(m => ({
        ...m,
        id: m._id,
        _id: m._id,
        name: m.fullName,
        fullName: m.fullName,
        email: m.loginEmail,
        loginEmail: m.loginEmail,
        phone: m.mobileNumber,
        mobileNumber: m.mobileNumber,
        employeeId: m.employeeId,
        designation: m.designation,
        role: m.designation,
        branchId: m.branchId || null,
        branchName: m.branchName || 'Not Assigned',
        addedBy: m.createdByUserName || (m.createdByType === 'branch_manager' ? 'Branch Manager' : 'Company Admin'),
        createdByType: m.createdByType || 'company_admin',
        assignedProjects: Array.isArray(m.assignedProjects) && m.assignedProjects.length > 0 ? m.assignedProjects.join(', ') : 'All Projects',
        teamSize: m.assignedTeam || 'Sales Wing',
        status: m.accountStatus || 'Pending Verification',
        handoverStatus: m.handoverStatus || 'Direct Company Created',
        isReviewedByBranch: m.isReviewedByBranch || false
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Single Sales Executive Detail with Performance & Activity Tracking (Dedicated Page)
// @route   GET /api/company-admin/team/:id
// @access  Private (company_admin, manager)
export const getTeamMemberDetail = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    let query = { _id: id, companyId };
    if (req.user.role === 'manager' && req.user.branchId) {
      query.branchId = req.user.branchId;
    }

    const executive = await SalesExecutive.findOne(query).lean();
    if (!executive) {
      return res.status(404).json({ success: false, message: 'Sales executive not found or unauthorized' });
    }

    // Related User Login Record
    const user = await User.findOne({ email: executive.loginEmail }).select('-password').lean();

    const mongoose = (await import('mongoose')).default;
    const execId = executive._id;
    const userId = user?._id;

    const execIdMatch = [];
    if (mongoose.Types.ObjectId.isValid(execId)) {
      execIdMatch.push(new mongoose.Types.ObjectId(execId));
    }
    execIdMatch.push(execId.toString());

    const userIdMatch = [];
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      userIdMatch.push(new mongoose.Types.ObjectId(userId));
      userIdMatch.push(userId.toString());
    }

    const nameRegex = new RegExp(executive.fullName, 'i');
    const emailLower = executive.loginEmail.toLowerCase();

    // Track Sales User Actual Performance & Live Work Data
    // 1. Leads managed / assigned
    const leads = await Lead.find({
      companyId,
      $or: [
        { assignedTo: { $in: [...execIdMatch, ...userIdMatch] } },
        { salesExecutiveId: { $in: execIdMatch } },
        { assignedUserEmail: emailLower },
        { assignedUserName: nameRegex }
      ]
    }).sort({ createdAt: -1 }).lean();

    // 2. Calls made
    const calls = await CallLog.find({
      companyId,
      $or: [
        { callerId: { $in: [...execIdMatch, ...userIdMatch] } },
        { userId: { $in: [...execIdMatch, ...userIdMatch] } },
        { executiveName: nameRegex },
        { callerName: nameRegex }
      ]
    }).sort({ callDate: -1, createdAt: -1 }).lean();

    // 3. Site visits conducted
    const siteVisits = await SiteVisit.find({
      companyId,
      $or: [
        { executiveId: { $in: [...execIdMatch, ...userIdMatch] } },
        { assignedTo: { $in: [...execIdMatch, ...userIdMatch] } },
        { executiveName: nameRegex }
      ]
    }).sort({ visitDate: -1, createdAt: -1 }).lean();

    // 4. Bookings closed
    const bookings = await Booking.find({
      companyId,
      $or: [
        { salesExecutiveId: { $in: [...execIdMatch, ...userIdMatch] } },
        { executiveName: nameRegex },
        { salesExecutive: nameRegex }
      ]
    }).sort({ createdAt: -1 }).lean();

    const totalSalesVolume = bookings.reduce((sum, b) => sum + (Number(b.totalAmount || b.dealValue || 0)), 0);

    const stats = {
      totalLeads: leads.length,
      activeLeads: leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').length,
      totalCalls: calls.length,
      interestedCalls: calls.filter(c => c.callResult === 'Interested' || c.status === 'Interested').length,
      siteVisitsCount: siteVisits.length,
      completedSiteVisits: siteVisits.filter(s => s.status === 'Completed').length,
      totalBookings: bookings.length,
      totalSalesVolume
    };

    res.status(200).json({
      success: true,
      data: {
        executive,
        user,
        stats,
        leads: leads.slice(0, 50),
        calls: calls.slice(0, 50),
        siteVisits: siteVisits.slice(0, 50),
        bookings: bookings.slice(0, 50)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register new Sales Executive in SalesExecutive Collection
// @route   POST /api/company-admin/team
// @access  Private (company_admin, manager)
export const createTeamMember = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Check SaaS Plan User Limits
    const Company = (await import('../../models/Company.js')).Company;
    const company = await Company.findById(companyId);
    if (company && company.usersLimit) {
      const currentUsersCount = await User.countDocuments({ companyId });
      if (currentUsersCount >= company.usersLimit) {
        return res.status(403).json({
          success: false,
          message: `User limit reached (${currentUsersCount}/${company.usersLimit}). Please upgrade your SaaS plan to add more team members.`
        });
      }
    }

    const body = req.body;
    const fullName = (body.fullName || body.name || '').trim();
    const loginEmail = (body.loginEmail || body.email || '').trim().toLowerCase();
    const mobileNumber = (body.mobileNumber || body.phone || '').trim();

    if (!fullName || !loginEmail || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Full Name, Mobile Number, and Login Email are mandatory'
      });
    }

    // Check existing
    const existing = await SalesExecutive.findOne({
      companyId,
      $or: [{ loginEmail }, { mobileNumber }]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A sales executive with this email or mobile number already exists in your company'
      });
    }

    const isManager = req.user.role === 'manager';
    const isCompanyAdmin = req.user.role === 'company_admin';
    const isDirectCompany = !isManager;

    // Validation: Company Admin MUST assign sales executive to a branch!
    let branchId = null;
    let branchName = '';

    if (isManager) {
      // Branch Manager automatically creates for their own branch
      branchId = req.user.branchId;
      branchName = req.user.branchName || 'Branch';
    } else if (isCompanyAdmin) {
      if (!body.branchId) {
        return res.status(400).json({
          success: false,
          message: 'Branch assignment is mandatory! Company Admin must assign Sales Team Member to a branch.'
        });
      }
      branchId = body.branchId;
      branchName = body.branchName || '';

      if (!branchName && branchId) {
        const Branch = (await import('../../models/Branch.js')).Branch;
        const branchDoc = await Branch.findById(branchId);
        if (branchDoc) branchName = branchDoc.name;
      }
    } else {
      branchId = body.branchId || null;
      branchName = body.branchName || '';
    }

    const employeeId = body.employeeId || await generateEmployeeId(companyId);

    const executive = await SalesExecutive.create({
      companyId,
      branchId,
      branchName,

      // 1. Personal Information
      fullName,
      profilePhoto: body.profilePhoto || '',
      gender: body.gender || 'Male',
      dob: body.dob || '',
      fatherName: body.fatherName || '',
      mobileNumber,
      alternatePhone: body.alternatePhone || '',
      personalEmail: (body.personalEmail || '').trim().toLowerCase(),
      currentAddress: body.currentAddress || '',
      permanentAddress: body.permanentAddress || '',

      // 2. Employment Information
      employeeId,
      designation: body.designation || 'Sales Executive',
      department: body.department || 'Sales',
      reportingManager: body.reportingManager || '',
      reportingManagerId: body.reportingManagerId || null,
      joiningDate: body.joiningDate || new Date().toISOString().split('T')[0],
      employmentType: body.employmentType || 'Full Time',
      workLocation: body.workLocation || 'Office',
      employmentStatus: body.employmentStatus || 'Active',

      // 3. Professional Information
      previousCompany: body.previousCompany || '',
      previousDesignation: body.previousDesignation || '',
      totalExperience: body.totalExperience || '',
      relevantExperience: body.relevantExperience || '',
      skills: body.skills || '',
      previousSalary: body.previousSalary || '',

      // 4. Salary Information
      salaryType: body.salaryType || 'Monthly',
      basicSalary: Number(body.basicSalary) || 0,
      hra: Number(body.hra) || 0,
      allowances: Number(body.allowances) || 0,
      incentives: body.incentives || '',
      monthlyCtc: Number(body.monthlyCtc) || (Number(body.basicSalary || 0) + Number(body.hra || 0) + Number(body.allowances || 0)),
      paymentMode: body.paymentMode || 'Bank Transfer',
      bankDetails: {
        accountHolderName: body.bankDetails?.accountHolderName || fullName,
        bankName: body.bankDetails?.bankName || '',
        accountNumber: body.bankDetails?.accountNumber || '',
        ifscCode: body.bankDetails?.ifscCode || ''
      },

      // 5. Identity & Documents
      aadhaarNumber: body.aadhaarNumber || '',
      panNumber: body.panNumber || '',
      aadhaarDoc: body.aadhaarDoc || '',
      panCardDoc: body.panCardDoc || '',
      resumeDoc: body.resumeDoc || '',
      photoDoc: body.photoDoc || body.profilePhoto || '',
      experienceLetterDoc: body.experienceLetterDoc || '',
      educationCertDoc: body.educationCertDoc || '',
      addressProofDoc: body.addressProofDoc || '',
      offerLetterDoc: body.offerLetterDoc || '',
      joiningLetterDoc: body.joiningLetterDoc || '',

      // 6. Sales Permissions & Assignment
      assignedProjects: Array.isArray(body.assignedProjects) ? body.assignedProjects : [],
      assignedTeam: body.assignedTeam || '',
      leadAccess: body.leadAccess || 'Own',
      callingAccess: body.callingAccess !== false,
      followUpAccess: body.followUpAccess !== false,
      siteVisitAccess: body.siteVisitAccess !== false,
      bookingAccess: body.bookingAccess !== false,
      customerAccess: body.customerAccess !== false,

      // 7. Login Credentials
      loginEmail,
      username: body.username || loginEmail.split('@')[0],
      password: body.password || 'password123',
      accountStatus: isDirectCompany ? 'Active' : 'Pending Verification',
      isApproved: isDirectCompany,
      approvedAt: isDirectCompany ? new Date() : null,
      approvedBy: isDirectCompany ? req.user.id : null,

      // 8. Emergency Contact
      emergencyContact: {
        name: body.emergencyContact?.name || '',
        relationship: body.emergencyContact?.relationship || '',
        phone: body.emergencyContact?.phone || '',
        address: body.emergencyContact?.address || ''
      },

      // 9. Workflow tracking
      createdByType: isManager ? 'branch_manager' : 'company_admin',
      createdByUserId: req.user._id || req.user.id,
      createdByUserName: req.user.name || (isManager ? 'Branch Manager' : 'Company Admin'),
      isReviewedByBranch: false,
      handoverStatus: isDirectCompany ? 'Direct Company Created' : 'Draft'
    });

    // If Company Admin created, auto create/activate User login account
    if (isDirectCompany) {
      let user = await User.findOne({ email: loginEmail });
      if (!user) {
        user = await User.create({
          name: fullName,
          email: loginEmail,
          phone: mobileNumber,
          password: body.password || 'password123',
          role: 'sales_user',
          badge: body.designation || 'Sales Executive',
          companyId,
          branchId,
          branchName,
          isActive: true,
          avatar: body.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        });
        executive.userId = user._id;
        await executive.save();
      } else {
        user.isActive = true;
        user.companyId = companyId;
        user.branchId = branchId;
        user.branchName = branchName;
        user.role = 'sales_user';
        if (body.password) user.password = body.password;
        await user.save();
      }
    }

    res.status(201).json({
      success: true,
      message: isDirectCompany
        ? `Sales Executive "${executive.fullName}" (${executive.employeeId}) registered and activated successfully!`
        : `Sales Executive "${executive.fullName}" (${executive.employeeId}) added by branch. Please verify documents and handover to Company Admin for final approval.`,
      data: executive
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve / Reject / Handover Sales Executive
// @route   PUT /api/company-admin/team/:id/approval
// @access  Private (company_admin, manager)
export const updateTeamMemberApproval = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { action, remarks } = req.body; // 'handover_to_company' | 'approve' | 'reject' | 'suspend'

    let query = { _id: id, companyId };
    if (req.user.role === 'manager' && req.user.branchId) {
      query.branchId = req.user.branchId;
    }

    const executive = await SalesExecutive.findOne(query);
    if (!executive) {
      return res.status(404).json({ success: false, message: 'Sales executive not found or unauthorized' });
    }

    // 1. Branch Manager Handover
    if (action === 'handover_to_company') {
      if (req.user.role !== 'manager' && req.user.role !== 'company_admin') {
        return res.status(403).json({ success: false, message: 'Only branch manager or company admin can handover' });
      }

      executive.isReviewedByBranch = true;
      executive.branchReviewedAt = new Date();
      executive.branchReviewedBy = req.user._id || req.user.id;
      executive.branchReviewedByName = req.user.name || 'Branch Manager';
      executive.branchReviewRemarks = remarks || 'Branch manager verified credentials and documents. Handed over to Company Admin for final approval.';
      executive.handoverStatus = 'Reviewed & Handed Over';
      executive.accountStatus = 'Pending Verification';
      await executive.save();

      return res.status(200).json({
        success: true,
        message: `Employee "${executive.fullName}" verified and handed over to Company Admin for final approval!`,
        data: executive
      });
    }

    // 2. Manager cannot directly Approve/Reject
    if (req.user.role === 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Branch manager cannot directly activate or reject employees. Please use "Verify & Handover to Company".'
      });
    }

    // 3. Company Admin Final Actions
    if (action === 'approve') {
      executive.accountStatus = 'Active';
      executive.isApproved = true;
      executive.approvedAt = new Date();
      executive.approvedBy = req.user.id;
      executive.handoverStatus = 'Company Approved';
      await executive.save();

      // Check or create User login record
      let user = await User.findOne({ email: executive.loginEmail }).select('+password');
      if (!user) {
        user = await User.create({
          name: executive.fullName,
          email: executive.loginEmail,
          phone: executive.mobileNumber,
          password: executive.password || 'password123',
          role: 'sales_user',
          badge: executive.designation || 'Sales Executive',
          companyId,
          branchId: executive.branchId || null,
          branchName: executive.branchName || '',
          isActive: true,
          avatar: executive.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        });
        executive.userId = user._id;
        await executive.save();
      } else {
        user.isActive = true;
        user.companyId = companyId;
        user.branchId = executive.branchId || user.branchId;
        user.branchName = executive.branchName || user.branchName;
        user.role = 'sales_user';
        if (executive.password) user.password = executive.password;
        await user.save();
      }

      return res.status(200).json({
        success: true,
        message: `Sales Executive "${executive.fullName}" Approved by Company! Login access is now Active.`,
        data: executive
      });
    } else if (action === 'reject') {
      executive.accountStatus = 'Rejected';
      executive.isApproved = false;
      executive.handoverStatus = 'Company Rejected';
      executive.companyRejectionReason = remarks || 'Documents not verified or invalid.';
      executive.companyRejectedAt = new Date();
      await executive.save();

      if (executive.loginEmail) {
        await User.findOneAndUpdate({ email: executive.loginEmail }, { isActive: false });
      }

      return res.status(200).json({
        success: true,
        message: `Sales Executive "${executive.fullName}" rejected by Company. Login blocked until corrected documents are re-uploaded.`,
        data: executive
      });
    } else if (action === 'suspend') {
      executive.accountStatus = 'Inactive';
      executive.isApproved = false;
      await executive.save();

      if (executive.loginEmail) {
        await User.findOneAndUpdate({ email: executive.loginEmail }, { isActive: false });
      }

      return res.status(200).json({
        success: true,
        message: `Sales Executive "${executive.fullName}" account suspended. Login access blocked.`,
        data: executive
      });
    }

    res.status(400).json({ success: false, message: 'Invalid action provided' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Sales Executive details
// @route   PUT /api/company-admin/team/:id
// @access  Private (company_admin, manager)
export const updateTeamMember = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    let query = { _id: req.params.id, companyId };
    if (req.user.role === 'manager' && req.user.branchId) {
      query.branchId = req.user.branchId;
    }

    const executive = await SalesExecutive.findOne(query);
    if (!executive) {
      return res.status(404).json({ success: false, message: 'Sales executive not found or unauthorized' });
    }

    const body = req.body;

    // If was rejected and re-submitting updated documents
    if (executive.accountStatus === 'Rejected' || executive.handoverStatus === 'Company Rejected') {
      body.accountStatus = 'Pending Verification';
      body.handoverStatus = 'Draft';
      body.isReviewedByBranch = false;
      body.companyRejectionReason = '';
    }

    // Manager cannot directly set Active
    if (req.user.role === 'manager' && body.accountStatus === 'Active') {
      delete body.accountStatus;
    }

    const updated = await SalesExecutive.findOneAndUpdate(
      query,
      body,
      { new: true, runValidators: true }
    );

    // Sync User login record if email or password updated
    if (updated.loginEmail) {
      let user = await User.findOne({ email: updated.loginEmail });
      if (user) {
        if (body.fullName) user.name = body.fullName;
        if (body.mobileNumber) user.phone = body.mobileNumber;
        if (body.password && body.password.length >= 6) user.password = body.password;
        if (body.profilePhoto) user.avatar = body.profilePhoto;
        if (updated.accountStatus === 'Active') user.isActive = true;
        else if (updated.accountStatus === 'Rejected' || updated.accountStatus === 'Inactive') user.isActive = false;
        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      message: `Sales Executive "${updated.fullName}" updated successfully!`,
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Sales Executive
// @route   DELETE /api/company-admin/team/:id
// @access  Private (company_admin)
export const deleteTeamMember = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const executive = await SalesExecutive.findOneAndDelete({ _id: req.params.id, companyId });

    if (!executive) {
      return res.status(404).json({ success: false, message: 'Sales executive not found' });
    }

    if (executive.loginEmail) {
      await User.findOneAndDelete({ email: executive.loginEmail, role: 'sales_user' });
    }

    res.status(200).json({
      success: true,
      message: `Sales Executive "${executive.fullName}" removed successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
