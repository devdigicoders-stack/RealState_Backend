import express from 'express';
import {
  getMessagingGateways,
  updateMessagingGateway,
  getTransactions,
  getSupportTickets,
  updateSupportTicketStatus,
  getPlatformReports,
  getPlatformSettings,
  updatePlatformSettings
} from '../../controllers/superadmin/superAdminSuiteController.js';
import { protect, authorize } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('superadmin'));

// Messaging Gateways
router.get('/messaging-gateways', getMessagingGateways);
router.put('/messaging-gateways/:id', updateMessagingGateway);

// Transactions
router.get('/transactions', getTransactions);

// Support Tickets
router.get('/support', getSupportTickets);
router.put('/support/:id/status', updateSupportTicketStatus);

// Reports
router.get('/reports', getPlatformReports);

// Settings
router.get('/settings', getPlatformSettings);
router.put('/settings', updatePlatformSettings);

export default router;

