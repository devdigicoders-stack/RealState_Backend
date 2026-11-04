import express from 'express';
import { 
  superAdminLogin, 
  getSuperAdminProfile, 
  updateSuperAdminProfile, 
  changeSuperAdminPassword 
} from '../../controllers/superadmin/superAdminAuthController.js';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validator.js';

const router = express.Router();

// Validation Rules
const loginRules = [
  { field: 'email', required: true, isEmail: true, message: 'Valid email is required' },
  { field: 'password', required: true, minLength: 6, message: 'Password must be at least 6 characters' }
];

const updateProfileRules = [
  { field: 'name', required: false, minLength: 2, message: 'Name must be at least 2 characters' },
  { field: 'phone', required: false, isPhone: true, message: 'Phone must be a valid 10-14 digit number' }
];

const changePasswordRules = [
  { field: 'currentPassword', required: true, message: 'Current password is required' },
  { field: 'newPassword', required: true, minLength: 6, message: 'New password must be at least 6 characters' },
  { 
    field: 'confirmPassword', 
    required: true, 
    custom: (val, body) => val !== body.newPassword ? 'New password and confirm password do not match' : null 
  }
];

// Public Route: Super Admin Login
router.post('/login', validate(loginRules), superAdminLogin);

// Protected Routes (Super Admin Only)
router.get('/me', protect, authorize('superadmin'), getSuperAdminProfile);
router.put('/profile', protect, authorize('superadmin'), validate(updateProfileRules), updateSuperAdminProfile);
router.put('/change-password', protect, authorize('superadmin'), validate(changePasswordRules), changeSuperAdminPassword);

export default router;

