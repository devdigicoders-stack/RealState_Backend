import { User } from '../../models/User.js';

// @desc    Super Admin Login with strict role & active check
// @route   POST /api/superadmin/auth/login
// @access  Public
export const superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or user does not exist'
      });
    }

    if (user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized as Platform Super Admin'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Super Admin account is currently deactivated'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
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
        badge: user.badge || 'Platform Super Admin',
        phone: user.phone,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get Current Super Admin Profile
// @route   GET /api/superadmin/auth/me
// @access  Private (SuperAdmin)
export const getSuperAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update Super Admin Profile
// @route   PUT /api/superadmin/auth/profile
// @access  Private (SuperAdmin)
export const updateSuperAdminProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const admin = await User.findById(req.user.id);

    if (name) admin.name = name.trim();
    if (phone) admin.phone = phone.trim();
    if (avatar) admin.avatar = avatar.trim();

    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: admin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Change Super Admin Password
// @route   PUT /api/superadmin/auth/change-password
// @access  Private (SuperAdmin)
export const changeSuperAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await User.findById(req.user.id).select('+password');

    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match'
      });
    }

    admin.password = newPassword;
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Super Admin password updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

