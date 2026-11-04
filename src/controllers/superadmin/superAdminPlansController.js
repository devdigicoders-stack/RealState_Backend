import { Plan } from '../../models/Plan.js';
import { Company } from '../../models/Company.js';

// @desc    Get All Subscription Plans with Subscribed Companies Count
// @route   GET /api/superadmin/plans
// @access  Private (SuperAdmin)
export const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ price: 1 }).lean();

    // Dynamically calculate subscribed companies per plan
    const plansWithCounts = await Promise.all(
      plans.map(async (p) => {
        const count = await Company.countDocuments({ plan: p.name });
        return {
          ...p,
          subscribedCompanies: count
        };
      })
    );

    res.status(200).json({
      success: true,
      count: plansWithCounts.length,
      data: plansWithCounts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Companies Enrolled in Specific Plan (Modal Detail Audit)
// @route   GET /api/superadmin/plans/:id/companies
// @access  Private (SuperAdmin)
export const getPlanCompanies = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const enrolledCompanies = await Company.find({ plan: plan.name })
      .select('name ownerName email phone status expiryDate renewalCount lastRenewedAt usersLimit projectsLimit')
      .lean();

    res.status(200).json({
      success: true,
      planName: plan.name,
      count: enrolledCompanies.length,
      data: enrolledCompanies
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create New Subscription Tier
// @route   POST /api/superadmin/plans
// @access  Private (SuperAdmin)
export const createPlan = async (req, res) => {
  try {
    const { name, price, duration, userLimit, projectLimit, features, isPopular, status } = req.body;

    const existing = await Plan.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A plan with this name already exists' });
    }

    const plan = await Plan.create({
      name: name.trim(),
      price: Number(price),
      duration: duration || 'Monthly',
      userLimit: Number(userLimit),
      projectLimit: Number(projectLimit),
      features: Array.isArray(features) ? features : (features ? [features] : []),
      isPopular: !!isPopular,
      status: status || 'Active'
    });

    res.status(201).json({
      success: true,
      message: `Plan "${plan.name}" created and published!`,
      data: plan
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Existing Subscription Plan
// @route   PUT /api/superadmin/plans/:id
// @access  Private (SuperAdmin)
export const updatePlan = async (req, res) => {
  try {
    const { name, price, duration, userLimit, projectLimit, features, isPopular, status } = req.body;

    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    if (name) plan.name = name.trim();
    if (price !== undefined) plan.price = Number(price);
    if (duration) plan.duration = duration;
    if (userLimit !== undefined) plan.userLimit = Number(userLimit);
    if (projectLimit !== undefined) plan.projectLimit = Number(projectLimit);
    if (features) plan.features = Array.isArray(features) ? features : [features];
    if (isPopular !== undefined) plan.isPopular = isPopular;
    if (status) plan.status = status;

    await plan.save();

    res.status(200).json({
      success: true,
      message: `Plan "${plan.name}" updated successfully!`,
      data: plan
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Subscription Plan (Safe Check)
// @route   DELETE /api/superadmin/plans/:id
// @access  Private (SuperAdmin)
export const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    // Safety check: Prevent deleting plan if active companies are assigned
    const assignedCompaniesCount = await Company.countDocuments({ plan: plan.name });
    if (assignedCompaniesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan: ${assignedCompaniesCount} companies are currently subscribed to this plan. Reassign them first.`
      });
    }

    await Plan.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Plan "${plan.name}" removed successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

