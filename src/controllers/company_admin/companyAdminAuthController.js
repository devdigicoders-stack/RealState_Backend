import { User } from '../../models/User.js';
import { Company } from '../../models/Company.js';

// @desc    Get Current Company Admin Profile with Tenant Meta
// @route   GET /api/company-admin/profile
// @access  Private (company_admin)
export const getCompanyAdminProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let company = null;
    if (user.companyId) {
      company = await Company.findById(user.companyId).lean();
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        company
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Company Admin Profile & Tenant Details
// @route   PUT /api/company-admin/profile
// @access  Private (company_admin)
export const updateCompanyAdminProfile = async (req, res) => {
  try {
    const { name, phone, avatar, companyName, ownerName, gstin, pan, reraRegistration, address, website, logo, leadRoutingMode, callingCallerId } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (avatar !== undefined) user.avatar = avatar.trim();

    await user.save();

    let updatedCompany = null;
    if (user.companyId) {
      const company = await Company.findById(user.companyId);
      if (company) {
        if (companyName) company.name = companyName.trim();
        if (ownerName) company.ownerName = ownerName.trim();
        if (gstin !== undefined) company.gstin = gstin.trim();
        if (pan !== undefined) company.pan = pan.trim();
        if (reraRegistration !== undefined) company.reraRegistration = reraRegistration.trim();
        if (address !== undefined) company.address = address.trim();
        if (website !== undefined) company.website = website.trim();
        if (logo !== undefined) company.logo = logo.trim();
        if (leadRoutingMode !== undefined) company.leadRoutingMode = leadRoutingMode.trim();
        if (callingCallerId !== undefined) company.callingCallerId = callingCallerId.trim();

        await company.save();
        updatedCompany = company;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Company Admin profile updated successfully!',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar,
          companyId: user.companyId
        },
        company: updatedCompany
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
