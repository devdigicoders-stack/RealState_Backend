import { User } from '../models/User.js';

// @desc    Universal Login (SuperAdmin, Company Admin, Manager, Sales User, Agent)
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email/phone and password'
      });
    }

    const cleanIdentifier = email.trim().toLowerCase();
    const cleanPhone = cleanIdentifier.replace(/[^0-9]/g, '');

    // Check if account is an Agent in the Agent collection (by email or phone)
    const Agent = (await import('../models/Agent.js')).Agent;
    const agentQuery = [
      { email: cleanIdentifier },
      { loginEmail: cleanIdentifier },
      { phone: cleanIdentifier }
    ];
    if (cleanPhone && cleanPhone.length >= 10) {
      agentQuery.push({ phone: { $regex: cleanPhone } });
    }

    const agentProfile = await Agent.findOne({ $or: agentQuery });

    if (agentProfile) {
      if (agentProfile.accountStatus === 'Inactive' || agentProfile.status === 'Inactive') {
        return res.status(403).json({
          success: false,
          isInactive: true,
          message: 'Your channel partner (agent) account is inactive. Please contact the company administrator.'
        });
      }

      if (agentProfile.accountStatus === 'Pending Verification' || !agentProfile.isApproved) {
        return res.status(403).json({
          success: false,
          isPending: true,
          message: 'Aapka account verification pending hai. Documents approval hone ke baad login activate hoga. Kripya administrator se contact karein.'
        });
      }

      if (agentProfile.accountStatus === 'Rejected') {
        return res.status(403).json({
          success: false,
          isRejected: true,
          message: 'Aapka KYC documents verify nahi ho paya aur reject ho gaya hai. Kripya administrator se contact karein.'
        });
      }
    }

    // Check if account is a Sales Executive in SalesExecutive collection
    const SalesExecutive = (await import('../models/SalesExecutive.js')).SalesExecutive;
    const salesExecQuery = [
      { loginEmail: cleanIdentifier },
      { personalEmail: cleanIdentifier },
      { mobileNumber: cleanIdentifier }
    ];
    if (cleanPhone && cleanPhone.length >= 10) {
      salesExecQuery.push({ mobileNumber: { $regex: cleanPhone } });
    }

    const salesProfile = await SalesExecutive.findOne({ $or: salesExecQuery });

    if (salesProfile) {
      if (salesProfile.accountStatus === 'Inactive') {
        return res.status(403).json({
          success: false,
          isInactive: true,
          message: 'Aapka sales account inactive hai. Kripya company administrator se contact karein.'
        });
      }

      if (salesProfile.accountStatus === 'Pending Verification' || !salesProfile.isApproved) {
        return res.status(403).json({
          success: false,
          isPending: true,
          message: 'Aapka sales account verification pending hai. Company Admin approval hone ke baad login activate hoga. Kripya apne manager ya administrator se contact karein.'
        });
      }

      if (salesProfile.accountStatus === 'Rejected') {
        return res.status(403).json({
          success: false,
          isRejected: true,
          message: `Aapka account reject ho gaya hai: "${salesProfile.companyRejectionReason || 'Documents verification failed'}". Kripya corrected documents re-upload karwayein.`
        });
      }
    }

    // Find by email or phone in User collection
    const userQuery = [
      { email: cleanIdentifier },
      { phone: cleanIdentifier }
    ];
    if (cleanPhone && cleanPhone.length >= 10) {
      userQuery.push({ phone: { $regex: cleanPhone } });
    }

    let user = await User.findOne({ $or: userQuery }).select('+password');

    // If user record is missing in User collection but approved agent exists in Agent collection, auto-link
    if (!user && agentProfile && agentProfile.isApproved && agentProfile.accountStatus === 'Active') {
      user = await User.create({
        name: agentProfile.fullName,
        email: (agentProfile.loginEmail || agentProfile.email).toLowerCase(),
        phone: agentProfile.phone,
        password: agentProfile.password || password ,
        role: 'agent',
        badge: 'Channel Partner / Broker',
        companyId: agentProfile.companyId,
        branchId: agentProfile.branchId || null,
        branchName: agentProfile.branchName || '',
        isActive: true,
        avatar: agentProfile.profilePhoto || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
      });
      user = await User.findById(user._id).select('+password');
    }

    // If user record missing but approved sales executive exists in SalesExecutive collection, auto-link
    if (!user && salesProfile && salesProfile.isApproved && salesProfile.accountStatus === 'Active') {
      user = await User.create({
        name: salesProfile.fullName,
        email: salesProfile.loginEmail.toLowerCase(),
        phone: salesProfile.mobileNumber,
        password: salesProfile.password || password,
        role: 'sales_user',
        badge: salesProfile.designation || 'Sales Executive',
        companyId: salesProfile.companyId,
        branchId: salesProfile.branchId || null,
        branchName: salesProfile.branchName || '',
        isActive: true,
        avatar: salesProfile.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      });
      user = await User.findById(user._id).select('+password');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or user does not exist'
      });
    }

    // Check general user active status
    if (!user.isActive) {
      if (user.role === 'agent') {
        return res.status(403).json({
          success: false,
          isInactive: true,
          message: 'Your channel partner (agent) account is inactive. Please contact the company administrator.'
        });
      }
      if (user.companyApprovalStatus === 'Pending Verification' || user.handoverStatus === 'Reviewed & Handed Over' || user.handoverStatus === 'Draft') {
        return res.status(403).json({
          success: false,
          isPending: true,
          message: 'Aapka sales account verification pending hai. Company Admin ke approval ke baad login activate hoga. Kripya apne manager ya company se sampark karein.'
        });
      }
      if (user.companyApprovalStatus === 'Rejected' || user.handoverStatus === 'Company Rejected') {
        return res.status(403).json({
          success: false,
          isRejected: true,
          message: `Aapka account Company Admin dwara reject kiya gaya hai: "${user.companyRejectionReason || 'Documents Verification Failed'}". Kripya apne branch manager se documents update karwayein.`
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact your administrator.'
      });
    }

    // Try bcrypt comparison first
    let isMatch = await user.matchPassword(password);

    // If not matching directly, check if agentProfile plain text password matches or fallback
    if (!isMatch && agentProfile && agentProfile.password) {
      if (agentProfile.password === password) {
        // Sync password to User model so future logins use bcrypt directly
        user.password = password;
        await user.save();
        isMatch = true;
      }
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Tenant Company Status & Expiry Validation (For company_admin and staff)
    let companyInfo = null;
    if (user.companyId) {
      const Company = (await import('../models/Company.js')).Company;
      const company = await Company.findById(user.companyId).lean();

      if (company) {
        if (company.status === 'Deactivated' || company.status === 'Suspended') {
          return res.status(403).json({
            success: false,
            message: `Your company account (${company.name}) is currently ${company.status.toLowerCase()}. Please contact Platform Super Admin.`
          });
        }

        // Check License Expiry Date
        if (company.expiryDate && new Date(company.expiryDate) < new Date()) {
          return res.status(403).json({
            success: false,
            message: `Your company subscription license for ${company.name} has expired on ${new Date(company.expiryDate).toLocaleDateString('en-IN')}. Please contact Super Admin to renew.`
          });
        }

        companyInfo = {
          id: company._id,
          name: company.name,
          plan: company.plan,
          planPrice: company.planPrice,
          status: company.status,
          usersLimit: company.usersLimit,
          projectsLimit: company.projectsLimit,
          expiryDate: company.expiryDate,
          callingProvider: company.callingProvider,
          smsProvider: company.smsProvider
        };
      }
    }

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        badge: user.badge || (user.role === 'company_admin' ? 'Company Admin / Owner' : user.role.toUpperCase()),
        phone: user.phone || '',
        avatar: user.avatar || '',
        companyId: user.companyId || null,
        companyName: companyInfo?.name || user.companyName || '',
        branchId: user.branchId || null,
        branchName: user.branchName || '',
        company: companyInfo,
        permissions: user.permissions || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server login error'
    });
  }
};

// @desc    Get Current Logged in User Profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    // Resolve company and branch metadata
    let companyName = user.companyName || '';
    if (user.companyId && !companyName) {
      const Company = (await import('../models/Company.js')).Company;
      const comp = await Company.findById(user.companyId).select('name');
      if (comp) companyName = comp.name;
    }

    let branchName = user.branchName || '';
    if (user.branchId && !branchName) {
      const Branch = (await import('../models/Branch.js')).Branch;
      const br = await Branch.findById(user.branchId).select('name');
      if (br) branchName = br.name;
    }

    res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        companyName,
        branchName
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update Profile (Name, Phone, Avatar) for any logged in role
// @route   PUT /api/auth/update-profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar, branchName } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (avatar) user.avatar = avatar;
    if (branchName) user.branchName = branchName;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile details updated successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        badge: user.badge,
        phone: user.phone,
        avatar: user.avatar,
        companyId: user.companyId,
        branchId: user.branchId,
        branchName: user.branchName
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change Password for any logged in role
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password provided'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully! Please use your new password next time you log in.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

