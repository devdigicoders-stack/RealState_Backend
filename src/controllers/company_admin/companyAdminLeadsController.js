import { Lead } from '../../models/Lead.js';
import { Project } from '../../models/Project.js';
import { User } from '../../models/User.js';
import { Branch } from '../../models/Branch.js';
import { Agent } from '../../models/Agent.js';
import { Customer } from '../../models/Customer.js';

// Helper to auto generate lead ID
const generateLeadId = async (companyId) => {
  const count = await Lead.countDocuments({ companyId });
  return `LD-${String(count + 1).padStart(4, '0')}`;
};

// @desc    Get all leads for current company
// @route   GET /api/company-admin/leads
// @access  Private (company_admin)
export const getLeads = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { stage, priority, search, page = 1, limit = 50 } = req.query;

    let query = { companyId };
    if (stage && stage !== 'All') {
      query.stage = stage;
    }
    if (priority && priority !== 'All') {
      query.priority = priority;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { leadId: regex },
        { name: regex },
        { phone: regex },
        { email: regex },
        { projectName: regex },
        { assignedToName: regex },
        { city: regex },
        { source: regex }
      ];
    }

    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // Calculate conversion & stage stats
    const totalLeads = await Lead.countDocuments({ companyId });
    const wonCount = await Lead.countDocuments({ companyId, stage: 'Won' });
    const hotCount = await Lead.countDocuments({ companyId, priority: 'Hot' });
    const siteVisitCount = await Lead.countDocuments({ companyId, stage: 'Site Visit' });

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      stats: {
        totalLeads,
        wonCount,
        hotCount,
        siteVisitCount
      },
      data: leads.map(l => ({
        ...l,
        id: l._id,
        requirement: `${l.interestedIn || 'Plot'} • ${l.propertySize || '1200 sqft'}`,
        budget: `${l.budgetFrom || '₹20L'} - ${l.budgetTo || '₹35L'}`,
        lastCallStatus: l.initialRemarks || 'Active Follow-up',
        assignedBranch: l.branchName || 'Not Assigned',
        branchName: l.branchName || 'Not Assigned',
        addedBy: l.createdBy || 'Company Admin'
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new lead with 7 comprehensive sections
// @route   POST /api/company-admin/leads
// @access  Private (company_admin)
export const createLead = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const body = req.body;

    const name = body.name || body.customerName;
    const phone = body.phone;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Customer Full Name and Mobile Number are required'
      });
    }

    // Resolve Referrer Customer & Parent Agent if referred
    let resolvedAgentId = body.agentId || null;
    let resolvedAgentName = body.agentName || '';
    let resolvedRefCustomerId = body.referredByCustomerId || null;
    let resolvedRefCustomerName = body.referredByCustomerName || '';
    let resolvedRefCustomerPhone = body.referredByCustomerPhone || '';

    if (body.referredByCustomerId) {
      const refCustomer = await Customer.findOne({ _id: body.referredByCustomerId, companyId }).lean();
      if (refCustomer) {
        resolvedRefCustomerId = refCustomer._id;
        resolvedRefCustomerName = refCustomer.name;
        resolvedRefCustomerPhone = refCustomer.phone;
        // Strict SaaS rule: Inherit original agent if not explicitly overridden
        if (!resolvedAgentId && refCustomer.agentId) {
          resolvedAgentId = refCustomer.agentId;
          resolvedAgentName = refCustomer.agentName || '';
        }
      }
    }

    const leadId = body.leadId || await generateLeadId(companyId);

    const lead = await Lead.create({
      companyId,
      // 1. Basic Information
      leadId,
      name: name.trim(),
      phone: phone.trim(),
      alternatePhone: body.alternatePhone || '',
      email: body.email ? body.email.trim().toLowerCase() : '',
      gender: body.gender || 'Male',
      dob: body.dob || '',

      // 2. Lead Source Details
      source: body.source || 'Website',
      campaignName: body.campaignName || '',
      referenceName: body.referenceName || '',
      agentId: resolvedAgentId,
      agentName: resolvedAgentName,
      referredByCustomerId: resolvedRefCustomerId,
      referredByCustomerName: resolvedRefCustomerName,
      referredByCustomerPhone: resolvedRefCustomerPhone,

      // 3. Property Requirements
      interestedIn: body.interestedIn || 'Plot / Land',
      projectId: body.projectId || null,
      projectName: body.projectName || 'Township Project',
      preferredLocation: body.preferredLocation || '',
      propertySize: body.propertySize || '1200 sqft',
      budgetFrom: body.budgetFrom || '₹20 Lakh',
      budgetTo: body.budgetTo || '₹35 Lakh',
      preferredFacing: body.preferredFacing || 'East Facing',
      purpose: body.purpose || 'Self Use',
      expectedPurchaseTimeline: body.expectedPurchaseTimeline || 'Within 1 Month',

      // 4. Address Details
      country: body.country || 'India',
      state: body.state || 'Uttar Pradesh',
      city: body.city || 'Lucknow',
      pinCode: body.pinCode || '',
      completeAddress: body.completeAddress || '',

      // 5. Lead Assignment
      branchId: body.branchId || null,
      branchName: body.branchName || 'Head Office',
      managerId: body.managerId || null,
      managerName: body.managerName || '',
      assignedTo: body.assignedTo || null,
      assignedToName: body.assignedToName || 'Direct Sales',
      priority: body.priority || 'Warm',
      stage: body.stage || 'New',

      // 6. Follow-up Details
      nextFollowUpDate: body.nextFollowUpDate || '',
      followUpTime: body.followUpTime || '',
      followUpType: body.followUpType || 'Phone Call',
      initialRemarks: body.initialRemarks || '',
      additionalNotes: body.additionalNotes || '',

      // 7. Additional Information
      leadAttachments: Array.isArray(body.leadAttachments) ? body.leadAttachments : [],
      customerIdProofDoc: body.customerIdProofDoc || '',
      internalNotes: body.internalNotes || '',
      createdBy: req.user.name || 'Company Admin'
    });

    res.status(201).json({
      success: true,
      message: `Lead ${lead.leadId} for "${lead.name}" created successfully!`,
      data: lead
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update lead
// @route   PUT /api/company-admin/leads/:id
// @access  Private (company_admin)
export const updateLead = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const lead = await Lead.findOneAndUpdate(
      { _id: id, companyId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({
      success: true,
      message: `Lead #${lead.leadId || lead.name} updated successfully!`,
      data: lead
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete lead
// @route   DELETE /api/company-admin/leads/:id
// @access  Private (company_admin)
export const deleteLead = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const lead = await Lead.findOneAndDelete({ _id: id, companyId });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
