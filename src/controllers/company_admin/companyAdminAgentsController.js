import { Agent } from '../../models/Agent.js';
import { User } from '../../models/User.js';
import { Booking } from '../../models/Booking.js';
import { Lead } from '../../models/Lead.js';

// Helper to format currency
const formatINR = (val) => {
  if (!val || val === 0) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

// Generate random agent code
const generateAgentCode = async () => {
  const count = await Agent.countDocuments();
  const num = String(count + 1).padStart(4, '0');
  return `CP-${num}`;
};

// @desc    Get Channel Partners / Agents list from dedicated Agent collection
// @route   GET /api/company-admin/agents
// @access  Private (company_admin)
export const getAgents = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search, status } = req.query;

    let query = { companyId };
    
    // Strict multi-tenancy & branch filtering:
    // If the logged in user is a manager, only show agents belonging to their branch
    if (req.user.role === 'manager' && req.user.branchId) {
      query.branchId = req.user.branchId;
    } else if (req.user.role === 'company_admin') {
      // Company Admin should ONLY see branch-created agents AFTER they are handed over by the branch!
      // (Direct company created agents or agents already handed over)
      query.$or = [
        { branchId: null },
        { branchId: { $exists: false } },
        { createdByType: 'company_admin' },
        { handoverStatus: { $in: ['Reviewed & Handed Over', 'Company Approved', 'Company Rejected'] } }
      ];
    }

    if (status && status !== 'All') {
      query.accountStatus = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: regex },
        { agencyName: regex },
        { agentCode: regex },
        { email: regex },
        { phone: regex },
        { city: regex }
      ];
    }

    const agents = await Agent.find(query).sort({ createdAt: -1 }).lean();

    // Fetch related bookings & leads
    const agentIds = agents.map(a => a._id);
    const bookings = await Booking.find({
      companyId,
      salesExecutiveId: { $in: agentIds }
    }).lean();

    const leads = await Lead.find({
      companyId,
      assignedTo: { $in: agentIds }
    }).lean();

    // Slab stats
    let slabCountMap = {};
    agents.forEach(a => {
      const tier = a.commissionTier || a.commissionRate || '2.5% Slab';
      slabCountMap[tier] = (slabCountMap[tier] || 0) + 1;
    });

    let standardSlab = '2.5% Slab';
    let maxCount = 0;
    for (const [tier, count] of Object.entries(slabCountMap)) {
      if (count > maxCount) {
        maxCount = count;
        standardSlab = tier;
      }
    }

    let totalSalesVolumeValue = 0;

    const mappedAgents = agents.map((a) => {
      const agentBookings = bookings.filter(b => b.salesExecutiveId?.toString() === a._id.toString());
      const agentLeads = leads.filter(l => l.assignedTo?.toString() === a._id.toString());

      const agentSales = agentBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
      totalSalesVolumeValue += agentSales;

      const slabMatch = (a.commissionRate || a.commissionTier || '2.5%').match(/(\d+(\.\d+)?)/);
      const commissionPercent = slabMatch ? parseFloat(slabMatch[1]) : 2.5;

      const earned = Math.round((agentSales * commissionPercent) / 100);
      const approvedSales = agentBookings
        .filter(b => b.status === 'Approved' || b.status === 'Confirmed')
        .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
      const paid = Math.round((approvedSales * commissionPercent) / 100);
      const pending = Math.max(0, earned - paid);

      return {
        ...a,
        id: a._id,
        firmName: a.agencyName || a.fullName,
        contactPerson: a.fullName,
        phone: a.phone || '',
        email: a.email || '',
        branchId: a.branchId || null,
        branchName: a.branchName || 'Not Assigned',
        addedBy: a.createdByUserName || (a.createdByType === 'branch_manager' ? 'Branch Manager' : 'Company Admin'),
        createdByType: a.createdByType || 'company_admin',
        commissionTier: a.commissionTier || `${a.commissionRate || '2.5%'} on ${a.commissionApplicableOn || 'Property Value'}`,
        registeredLeads: agentLeads.length,
        totalSalesVolume: formatINR(agentSales),
        earnedCommission: formatINR(earned),
        paidCommission: formatINR(paid),
        pendingPayout: formatINR(pending),
        status: a.accountStatus || 'Pending Verification'
      };
    });

    res.status(200).json({
      success: true,
      count: mappedAgents.length,
      stats: {
        totalBrokers: mappedAgents.length,
        pendingApprovals: agents.filter(a => a.accountStatus === 'Pending Verification').length,
        activePartners: agents.filter(a => a.accountStatus === 'Active').length,
        standardSlab: agents.length > 0 ? standardSlab : '2.5% Slab',
        totalSalesVolume: formatINR(totalSalesVolumeValue),
        activePipelineCount: bookings.length
      },
      data: mappedAgents
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register new agent with comprehensive 8-step dossier
// @route   POST /api/company-admin/agents
// @access  Private (company_admin)
export const createAgent = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const body = req.body;

    const fullName = body.fullName || body.name || body.contactPerson;
    const phone = body.phone;
    const email = body.email || body.loginEmail;

    if (!fullName || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'Agent Full Name, Mobile Number and Email are required'
      });
    }

    // Check if phone or email already registered in Agent collection
    const existingAgent = await Agent.findOne({
      companyId,
      $or: [{ phone: phone.trim() }, { email: email.trim().toLowerCase() }]
    });

    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'An agent with this mobile number or email already exists in your company'
      });
    }

    const agentCode = body.agentCode || await generateAgentCode();

    const isManager = req.user.role === 'manager';
    const isCompanyAdmin = req.user.role === 'company_admin';

    // Validation: Company Admin MUST assign to a branch!
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
          message: 'Branch assignment is mandatory! Company Admin must assign Channel Partner / Broker to a branch.'
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

    const agent = await Agent.create({
      companyId,
      branchId,
      branchName,
      // Audit & Handover details
      createdByType: isManager ? 'branch_manager' : 'company_admin',
      createdByUserId: req.user._id || req.user.id,
      createdByUserName: req.user.name || (isManager ? 'Branch Manager' : 'Company Admin'),
      isReviewedByBranch: false,
      handoverStatus: isManager ? 'Draft' : 'Direct Company Created',

      // 1. Basic Information
      fullName: fullName.trim(),
      profilePhoto: body.profilePhoto || '',
      agentType: body.agentType || 'Individual',
      gender: body.gender || 'Male',
      dob: body.dob || '',
      agencyName: body.agencyName || body.firmName || fullName.trim(),
      agentCode,
      designation: body.designation || 'Channel Partner',

      // 2. Contact Information
      phone: phone.trim(),
      alternatePhone: body.alternatePhone || '',
      email: email.trim().toLowerCase(),
      whatsappNumber: body.whatsappNumber || phone.trim(),
      officeAddress: body.officeAddress || '',
      city: body.city || 'Lucknow',
      state: body.state || 'Uttar Pradesh',
      pinCode: body.pinCode || '',

      // 3. Identity & KYC Details
      panNumber: body.panNumber || '',
      aadhaarNumber: body.aadhaarNumber || '',
      gstNumber: body.gstNumber || '',
      panCardDoc: body.panCardDoc || '',
      aadhaarCardDoc: body.aadhaarCardDoc || '',
      addressProofDoc: body.addressProofDoc || '',
      identityProofDoc: body.identityProofDoc || '',
      kycStatus: body.kycStatus || 'Pending Verification',

      // 4. Professional Information
      experienceYears: body.experienceYears || '1-3 Years',
      previousCompany: body.previousCompany || '',
      areaOfOperation: body.areaOfOperation || '',
      preferredPropertyType: Array.isArray(body.preferredPropertyType) ? body.preferredPropertyType : ['Plots / Land', 'Residential'],
      assignedProjects: Array.isArray(body.assignedProjects) ? body.assignedProjects : [],
      description: body.description || '',

      // 5. Bank Details
      bankDetails: {
        accountHolderName: body.bankDetails?.accountHolderName || body.accountHolderName || fullName.trim(),
        bankName: body.bankDetails?.bankName || body.bankName || '',
        accountNumber: body.bankDetails?.accountNumber || body.accountNumber || '',
        ifscCode: body.bankDetails?.ifscCode || body.ifscCode || '',
        branchName: body.bankDetails?.branchName || body.branchName || '',
        chequeDoc: body.bankDetails?.chequeDoc || body.chequeDoc || ''
      },

      // 6. Commission Details
      commissionType: body.commissionType || 'Percentage (%)',
      commissionRate: body.commissionRate || '2.5%',
      commissionTier: body.commissionTier || `${body.commissionRate || '2.5%'} on Agreement`,
      commissionApplicableOn: body.commissionApplicableOn || 'Total Property Value',
      commissionPaymentTerms: body.commissionPaymentTerms || 'On Booking',
      specialCommissionNotes: body.specialCommissionNotes || '',

      // 7. Login & Account Details
      loginEmail: (body.loginEmail || email).trim().toLowerCase(),
      username: body.username || email.split('@')[0],
      password: body.password || 'password123',
      accountStatus: 'Pending Verification', // Needs admin document review & approval
      isApproved: false,

      // 8. Additional Information
      referredBy: body.referredBy || '',
      joiningDate: body.joiningDate || new Date(),
      internalRemarks: body.internalRemarks || '',
      agreementDoc: body.agreementDoc || ''
    });

    res.status(201).json({
      success: true,
      message: `Agent ${agent.fullName} (${agent.agentCode}) registered successfully! Documents are pending admin review and approval.`,
      data: agent
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve or Reject Agent KYC & Account (Controls login activation)
// @route   PUT /api/company-admin/agents/:id/approval
// @access  Private (company_admin)
export const updateAgentApproval = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { action, remarks } = req.body; // action: 'approve' | 'reject' | 'suspend' | 'handover_to_company'

    let agentQuery = { _id: id, companyId };
    if (req.user.role === 'manager' && req.user.branchId) {
      agentQuery.branchId = req.user.branchId;
    }

    const agent = await Agent.findOne(agentQuery);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found or unauthorized' });
    }

    // --- Branch Manager Verification & Handover Action ---
    if (action === 'handover_to_company') {
      if (req.user.role !== 'manager' && req.user.role !== 'company_admin') {
        return res.status(403).json({ success: false, message: 'Only branch manager can review and handover to company' });
      }

      agent.isReviewedByBranch = true;
      agent.branchReviewedAt = new Date();
      agent.branchReviewedBy = req.user._id || req.user.id;
      agent.branchReviewedByName = req.user.name || 'Branch Manager';
      agent.branchReviewRemarks = remarks || 'Branch manager verified KYC and documents. Handed over to Company for final review.';
      agent.handoverStatus = 'Reviewed & Handed Over';
      agent.accountStatus = 'Pending Verification'; // Waiting for company approval
      if (remarks) agent.internalRemarks = remarks;
      await agent.save();

      return res.status(200).json({
        success: true,
        message: `Agent ${agent.fullName} documents successfully verified and handed over to Company Admin for final approval!`,
        data: agent
      });
    }

    // --- Manager cannot perform final Approve or Reject ---
    if (req.user.role === 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Branch manager cannot directly approve or reject agents. Please review documents and click "Verify & Handover to Company".'
      });
    }

    // --- Company Admin Final Decision (approve, reject, suspend) ---
    if (action === 'approve') {
      agent.accountStatus = 'Active';
      agent.kycStatus = 'Verified';
      agent.isApproved = true;
      agent.approvedAt = new Date();
      agent.approvedBy = req.user.id;
      agent.handoverStatus = 'Company Approved';
      if (remarks) agent.internalRemarks = remarks;
      await agent.save();

      // Check or create login User so agent can log in
      const agentLoginEmail = (agent.loginEmail || agent.email).trim().toLowerCase();
      let user = await User.findOne({ email: agentLoginEmail }).select('+password');
      if (!user) {
        user = await User.create({
          name: agent.fullName,
          email: agentLoginEmail,
          phone: agent.phone,
          password: agent.password || 'password123',
          role: 'agent',
          badge: 'Channel Partner / Broker',
          companyId,
          branchId: agent.branchId || null,
          branchName: agent.branchName || '',
          isActive: true,
          avatar: agent.profilePhoto || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
        });
        agent.userId = user._id;
        await agent.save();
      } else {
        user.isActive = true;
        user.companyId = companyId;
        user.branchId = agent.branchId || user.branchId;
        user.branchName = agent.branchName || user.branchName;
        user.role = 'agent';
        if (agent.password) {
          user.password = agent.password; // Triggers userSchema.pre('save') hashing
        }
        await user.save();
      }

      return res.status(200).json({
        success: true,
        message: `Agent "${agent.fullName}" KYC & Documents Approved by Company! Account is now Active and login is enabled.`,
        data: agent
      });
    } else if (action === 'reject') {
      agent.accountStatus = 'Rejected';
      agent.kycStatus = 'Rejected';
      agent.isApproved = false;
      agent.handoverStatus = 'Company Rejected';
      agent.companyRejectionReason = remarks || 'Documents not verified or invalid.';
      agent.companyRejectedAt = new Date();
      if (remarks) agent.internalRemarks = remarks;
      await agent.save();

      // Deactivate User account if exists
      if (agent.email) {
        await User.findOneAndUpdate({ email: agent.email }, { isActive: false });
      }

      return res.status(200).json({
        success: true,
        message: `Agent "${agent.fullName}" KYC has been rejected by Company. New documents must be re-uploaded. Login access blocked.`,
        data: agent
      });
    } else if (action === 'suspend') {
      agent.accountStatus = 'Inactive';
      agent.isApproved = false;
      await agent.save();

      if (agent.email) {
        await User.findOneAndUpdate({ email: agent.email }, { isActive: false });
      }

      return res.status(200).json({
        success: true,
        message: `Agent account marked Inactive. Login access suspended.`,
        data: agent
      });
    }

    res.status(400).json({ success: false, message: 'Invalid action provided' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update agent details
// @route   PUT /api/company-admin/agents/:id
// @access  Private (company_admin)
export const updateAgent = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    let agentQuery = { _id: id, companyId };
    if (req.user.role === 'manager' && req.user.branchId) {
      agentQuery.branchId = req.user.branchId;
    }

    const existingAgent = await Agent.findOne(agentQuery);
    if (!existingAgent) {
      return res.status(404).json({ success: false, message: 'Agent not found or unauthorized' });
    }

    // If agent was rejected by company and manager/user re-uploads documents, reset status for fresh review
    if (existingAgent.accountStatus === 'Rejected' || existingAgent.handoverStatus === 'Company Rejected') {
      req.body.accountStatus = 'Pending Verification';
      req.body.kycStatus = 'Pending Verification';
      req.body.isReviewedByBranch = false;
      req.body.handoverStatus = 'Draft';
      req.body.companyRejectionReason = '';
    }

    // If status is being updated, sync accountStatus and login user active state
    if (req.body.status) {
      // Manager cannot directly set Active status
      if (req.user.role === 'manager' && req.body.status === 'Active') {
        return res.status(403).json({ success: false, message: 'Managers cannot directly set status to Active. Company Admin must approve.' });
      }
      req.body.accountStatus = req.body.status;
      if (req.body.status === 'Active') {
        req.body.isApproved = true;
      } else {
        req.body.isApproved = false;
      }
    }

    const agent = await Agent.findOneAndUpdate(
      agentQuery,
      req.body,
      { new: true, runValidators: true }
    );

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    // Sync User login account state if status changed or password updated
    const agentEmail = agent.loginEmail || agent.email;
    if (agentEmail) {
      let user = await User.findOne({ email: agentEmail.toLowerCase() }).select('+password');
      const isAct = agent.accountStatus === 'Active';
      if (!user && isAct) {
        user = await User.create({
          name: agent.fullName,
          email: agentEmail.toLowerCase(),
          phone: agent.phone,
          password: agent.password || req.body.password || 'password123',
          role: 'agent',
          badge: 'Channel Partner / Broker',
          companyId,
          isActive: true,
          avatar: agent.profilePhoto || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
        });
        agent.userId = user._id;
        await agent.save();
      } else if (user) {
        if (req.body.status || req.body.accountStatus) {
          user.isActive = isAct;
        }
        if (req.body.password && req.body.password.trim()) {
          user.password = req.body.password.trim();
        }
        if (req.body.fullName) {
          user.name = req.body.fullName.trim();
        }
        if (req.body.phone) {
          user.phone = req.body.phone.trim();
        }
        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Channel Partner dossier updated!',
      data: agent
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete agent / channel partner
// @route   DELETE /api/company-admin/agents/:id
// @access  Private (company_admin)
export const deleteAgent = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const agent = await Agent.findOneAndDelete({ _id: id, companyId });
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    // Also deactivate login user
    if (agent.email) {
      await User.findOneAndDelete({ email: agent.email, role: 'agent' });
    }

    res.status(200).json({
      success: true,
      message: 'Channel Partner removed successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single agent dossier with full activity, leads & booking commission tracking
// @route   GET /api/company-admin/agents/:id
// @access  Private (company_admin)
export const getAgentDetail = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    let agentQuery = { _id: id, companyId };
    if (req.user.role === 'manager' && req.user.branchId) {
      agentQuery.branchId = req.user.branchId;
    }

    const agent = await Agent.findOne(agentQuery).lean();
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found or unauthorized' });
    }

    // Find linked user profile if exists
    let user = null;
    if (agent.loginEmail || agent.email) {
      user = await User.findOne({
        companyId,
        role: 'agent',
        $or: [
          { email: (agent.loginEmail || '').toLowerCase() },
          { email: (agent.email || '').toLowerCase() },
          { phone: agent.phone }
        ]
      }).select('-password').lean();
    }

    // 1. Leads registered or assigned by this agent
    const leads = await Lead.find({
      companyId,
      $or: [
        { assignedTo: agent._id },
        { assignedTo: user?._id },
        { source: new RegExp(agent.fullName, 'i') },
        { channelPartnerId: agent._id }
      ]
    }).sort({ createdAt: -1 }).limit(100).lean();

    // 2. Bookings generated or referred by this agent
    const bookings = await Booking.find({
      companyId,
      $or: [
        { salesExecutiveId: agent._id },
        { salesExecutiveId: user?._id },
        { agentId: agent._id },
        { channelPartner: new RegExp(agent.fullName, 'i') }
      ]
    }).sort({ createdAt: -1 }).lean();

    // Commission calculations
    const commissionPercent = parseFloat(String(agent.commissionRate || '2.5').replace('%', '')) || 2.5;
    const totalSalesVolume = bookings.reduce((sum, b) => sum + (Number(b.dealValue || b.totalAmount || b.plotPrice || 0)), 0);
    const totalCommissionEarned = Math.round((totalSalesVolume * commissionPercent) / 100);
    const paidCommission = 0; // Or from a payouts model if exists
    const pendingCommission = totalCommissionEarned - paidCommission;

    res.status(200).json({
      success: true,
      data: {
        agent,
        user,
        stats: {
          totalLeads: leads.length,
          convertedLeads: leads.filter(l => l.status === 'Won' || l.status === 'Booked').length,
          totalBookings: bookings.length,
          totalSalesVolume,
          commissionPercent,
          totalCommissionEarned,
          paidCommission,
          pendingCommission
        },
        leads,
        bookings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
