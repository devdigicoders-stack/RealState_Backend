import express from 'express';
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  toggleCompanyStatus,
  deleteCompany
} from '../../controllers/superadmin/superAdminCompaniesController.js';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validator.js';

const router = express.Router();

// Validation Rules for Company Creation
const companyCreateRules = [
  { field: 'name', required: true, minLength: 2, message: 'Company name is mandatory' },
  { field: 'ownerName', required: true, minLength: 2, message: 'Owner name is mandatory' },
  { field: 'email', required: true, isEmail: true, message: 'Valid company email is mandatory' },
  { field: 'phone', required: true, isPhone: true, message: 'Valid mobile number (10-14 digits) is mandatory' },
  { field: 'maxUsers', required: true, message: 'Staff user limit must be specified' },
  { field: 'maxProjects', required: true, message: 'Project layout limit must be specified' }
];

const companyUpdateRules = [
  { field: 'phone', required: false, isPhone: true, message: 'Valid mobile number (10-14 digits) is required' }
];

// All routes strictly protected for Super Admin
router.use(protect);
router.use(authorize('superadmin'));

router.get('/', getCompanies);
router.get('/:id', getCompanyById);
router.post('/', validate(companyCreateRules), createCompany);
router.put('/:id', validate(companyUpdateRules), updateCompany);
router.patch('/:id/status', toggleCompanyStatus);
router.delete('/:id', deleteCompany);

export default router;

