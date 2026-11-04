import { Company } from '../../models/Company.js';
import { Plan } from '../../models/Plan.js';
import { User } from '../../models/User.js';
import { Project } from '../../models/Project.js';
import { Transaction } from '../../models/Transaction.js';
import bcrypt from 'bcryptjs';

// @desc    Get All Registered Companies with Index-Optimized Search, Filter & Pagination
// @route   GET /api/superadmin/companies
// @access  Private (SuperAdmin)
export const getCompanies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, status, plan } = req.query;
    let query = {};

    // Search by Name, Owner Name, or Email
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { ownerName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Filter by Status (Active, Suspended, Expired, Deactivated)
    if (status && status !== 'All') {
      query.status = status;
    }

    // Filter by Plan
    if (plan && plan !== 'All') {
      query.plan = plan;
    }

    const totalCount = await Company.countDocuments(query);
    const companies = await Company.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // .lean() for 4x faster read speeds

    // Calculate real dynamic usage counts for each company
    const enrichedCompanies = await Promise.all(
      companies.map(async (company) => {
        const [usersCount, projectsCount] = await Promise.all([
          User.countDocuments({ companyId: company._id }),
          Project.countDocuments({ companyId: company._id })
        ]);

        return {
          ...company,
          usersCount,
          projectsCount
        };
      })
    );

    // Dynamic Top Stats
    const totalActive = await Company.countDocuments({ status: 'Active' });
    const totalExpired = await Company.countDocuments({ status: { $in: ['Expired', 'Suspended'] } });

    res.status(200).json({
      success: true,
      stats: {
        total: totalCount,
        active: totalActive,
        expired: totalExpired
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalItems: totalCount
      },
      data: enrichedCompanies
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Single Company Full Dossier (360 Detail View)
// @route   GET /api/superadmin/companies/:id
// @access  Private (SuperAdmin)
export const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).lean();
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company tenant not found' });
    }

    // Tenant Staff Count
    const staffCount = await User.countDocuments({ companyId: company._id, isActive: true });

    res.status(200).json({
      success: true,
      data: {
        ...company,
        staffCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register New Company Tenant & Auto-provision Owner Login
// @route   POST /api/superadmin/companies
// @access  Private (SuperAdmin)
export const createCompany = async (req, res) => {
  try {
    const {
      name,
      ownerName,
      email,
      phone,
      plan,
      planPrice,
      maxUsers,
      maxProjects,
      callingProvider,
      smsProvider,
      password // Optional custom password for owner
    } = req.body;

    const cleanEmail = email.trim().toLowerCase();

    // Check if company email or user email already taken
    const existingCompany = await Company.findOne({ email: cleanEmail });
    if (existingCompany) {
      return res.status(400).json({ success: false, message: 'Company with this email is already registered' });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    // Set 1-year default license expiration
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const company = await Company.create({
      name: name.trim(),
      ownerName: ownerName.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      plan: plan || 'Standard Growth',
      planPrice: planPrice || '₹14,999/mo',
      status: 'Active',
      usersLimit: Number(maxUsers) || 15,
      projectsLimit: Number(maxProjects) || 5,
      expiryDate,
      renewalCount: 0,
      callingProvider: callingProvider || 'Not Configured',
      smsProvider: smsProvider || 'Not Configured'
    });

    // Auto-create Company Admin / Owner User account with matching credentials
    // Note: User model has pre('save') hook that hashes password automatically. Pass raw password.
    const ownerPassword = password || 'password123';

    await User.create({
      name: `${ownerName.trim()} (Owner)`,
      email: cleanEmail,
      password: ownerPassword,
      role: 'company_admin',
      badge: 'Company Admin / Owner',
      companyId: company._id,
      companyName: company.name,
      phone: phone.trim(),
      isActive: true,
      permissions: ['ALL_COMPANY_PERMISSIONS']
    });

    // Auto-generate Subscription Invoice Transaction in Transaction collection
    try {
      // Parse numeric amount from planPrice (e.g. "₹2,999/mo" -> 2999) or look up in Plan
      let numericAmount = 0;
      if (planPrice) {
        numericAmount = Number(String(planPrice).replace(/[^0-9]/g, '')) || 0;
      }
      if (!numericAmount && plan) {
        const foundPlan = await Plan.findOne({ name: new RegExp(`^${plan.trim()}$`, 'i') });
        if (foundPlan) numericAmount = Number(foundPlan.price) || 0;
      }
      if (!numericAmount) numericAmount = 2999;

      const gst = Math.round(numericAmount * 0.18);
      const total = numericAmount + gst;
      const invoiceNo = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      await Transaction.create({
        invoiceNo,
        company: company.name,
        companyId: company._id,
        ownerName: company.ownerName,
        plan: company.plan,
        amount: numericAmount,
        gst,
        total,
        method: 'Razorpay PG',
        status: 'Success',
        billingDate: new Date()
      });
    } catch (txnErr) {
      console.warn('[Auto-create Transaction Error]:', txnErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Tenant ${company.name} registered and Owner credentials activated!`,
      data: company,
      credentials: {
        email: cleanEmail,
        temporaryPassword: ownerPassword,
        role: 'company_admin'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Company Details & Optionally Reset Owner Password
// @route   PUT /api/superadmin/companies/:id
// @access  Private (SuperAdmin)
export const updateCompany = async (req, res) => {
  try {
    const { name, ownerName, phone, plan, planPrice, maxUsers, maxProjects, status, callingProvider, smsProvider, password } = req.body;

    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company tenant not found' });
    }

    if (name) company.name = name.trim();
    if (ownerName) company.ownerName = ownerName.trim();
    if (phone) company.phone = phone.trim();
    if (plan) company.plan = plan;
    if (planPrice) company.planPrice = planPrice;
    if (maxUsers) company.usersLimit = Number(maxUsers);
    if (maxProjects) company.projectsLimit = Number(maxProjects);
    if (status) company.status = status;
    if (callingProvider) company.callingProvider = callingProvider;
    if (smsProvider) company.smsProvider = smsProvider;

    await company.save();

    // If password provided in edit form, update Owner's password
    let passwordUpdated = false;
    if (password && password.trim().length >= 6) {
      const ownerUser = await User.findOne({ companyId: company._id, role: 'company_admin' });
      if (ownerUser) {
        ownerUser.password = password.trim();
        await ownerUser.save(); // User pre-save hook will hash it
        passwordUpdated = true;
      }
    }

    // Also update companyName / owner name in User document if changed
    if (name || ownerName) {
      const updateFields = {};
      if (name) updateFields.companyName = name.trim();
      await User.updateMany({ companyId: company._id }, { $set: updateFields });
      if (ownerName) {
        await User.updateOne(
          { companyId: company._id, role: 'company_admin' },
          { $set: { name: `${ownerName.trim()} (Owner)` } }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: passwordUpdated 
        ? 'Company details and Owner password updated successfully'
        : 'Company tenant updated successfully',
      data: company,
      passwordUpdated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Company Status (Active <-> Deactivated)
// @route   PATCH /api/superadmin/companies/:id/status
// @access  Private (SuperAdmin)
export const toggleCompanyStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    company.status = status || (company.status === 'Active' ? 'Deactivated' : 'Active');
    await company.save();

    // If company deactivated, disable login access for all users in this company
    const shouldBeActive = company.status === 'Active';
    await User.updateMany({ companyId: company._id }, { isActive: shouldBeActive });

    res.status(200).json({
      success: true,
      message: `Company status changed to ${company.status}`,
      status: company.status
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Company Permanently
// @route   DELETE /api/superadmin/companies/:id
// @access  Private (SuperAdmin)
export const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Cascade delete users belonging to this tenant
    await User.deleteMany({ companyId: company._id });
    await Company.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Company ${company.name} and all associated staff accounts removed successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

