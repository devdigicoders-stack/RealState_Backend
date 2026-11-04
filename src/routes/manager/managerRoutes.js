import express from 'express';
import { getManagerDashboardStats, assignLeadToExecutive } from '../../controllers/manager/managerDashboardController.js';
import {
  getManagerLeads,
  getManagerCalls,
  getManagerSiteVisits,
  updateManagerSiteVisit,
  getManagerBookings,
  reviewManagerBooking,
  getManagerPerformance
} from '../../controllers/manager/managerOperationsController.js';
import { protect, authorize } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('manager', 'company_admin'));

// Dashboard
router.get('/dashboard', getManagerDashboardStats);
router.post('/assign-lead', assignLeadToExecutive);

// Leads
router.get('/leads', getManagerLeads);

// Calls
router.get('/calls', getManagerCalls);

// Site Visits
router.get('/site-visits', getManagerSiteVisits);
router.put('/site-visits/:id', updateManagerSiteVisit);

// Bookings
router.get('/bookings', getManagerBookings);
router.put('/bookings/:id/review', reviewManagerBooking);

// Performance Leaderboard
router.get('/performance', getManagerPerformance);

export default router;
