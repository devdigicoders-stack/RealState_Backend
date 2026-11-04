import express from 'express';
import {
  getDashboardStats,
  getRenewals,
  renewCompanyLicense,
  getCompanyLimits,
  adjustCompanyLimits,
  getModules,
  createModule,
  toggleModuleStatus,
  updateModulePlans,
  getCallingProviders,
  updateCallingProvider
} from '../../controllers/superadmin/superAdminOpsController.js';
import {
  getSuperAdminEnquiries,
  updateSuperAdminEnquiry,
  deleteSuperAdminEnquiry
} from '../../controllers/superadmin/superAdminEnquiriesController.js';
import { protect, authorize } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('superadmin'));

// 1. Dashboard Stats
router.get('/dashboard/stats', getDashboardStats);

// 2. Enquiries Master (Website Contact / Leads)
router.get('/enquiries', getSuperAdminEnquiries);
router.put('/enquiries/:id', updateSuperAdminEnquiry);
router.delete('/enquiries/:id', deleteSuperAdminEnquiry);

// 3. Renewals & Expiry
router.get('/renewals', getRenewals);
router.post('/renewals/:companyId', renewCompanyLicense);

// 3. Quota Limits
router.get('/limits', getCompanyLimits);
router.put('/limits/:companyId', adjustCompanyLimits);

// 4. Modules Master
router.get('/modules', getModules);
router.post('/modules', createModule);
router.put('/modules/:id/toggle', toggleModuleStatus);
router.put('/modules/:id/plans', updateModulePlans);

// 5. Calling Providers
router.get('/calling-providers', getCallingProviders);
router.put('/calling-providers/:id', updateCallingProvider);

export default router;
