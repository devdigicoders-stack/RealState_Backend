import express from 'express';
import {
  getPlans,
  getPlanCompanies,
  createPlan,
  updatePlan,
  deletePlan
} from '../../controllers/superadmin/superAdminPlansController.js';
import { protect, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validator.js';

const router = express.Router();

const planRules = [
  { field: 'name', required: true, minLength: 2, message: 'Plan name is mandatory' },
  { field: 'price', required: true, message: 'Pricing amount is mandatory' },
  { field: 'userLimit', required: true, message: 'User limit seat cap is mandatory' },
  { field: 'projectLimit', required: true, message: 'Project limit cap is mandatory' }
];

router.use(protect);
router.use(authorize('superadmin'));

router.get('/', getPlans);
router.get('/:id/companies', getPlanCompanies);
router.post('/', validate(planRules), createPlan);
router.put('/:id', updatePlan);
router.delete('/:id', deletePlan);

export default router;

