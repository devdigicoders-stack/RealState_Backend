import express from 'express';
import { submitPublicEnquiry } from '../controllers/superadmin/superAdminEnquiriesController.js';

const router = express.Router();

// POST /api/public/enquiry
router.post('/enquiry', submitPublicEnquiry);

export default router;
