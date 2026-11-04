import express from 'express';
import {
  getSalesDashboard,
  getMyLeads,
  logCallDisposition,
  getMyCalls,
  getMyFollowups,
  getMySiteVisits,
  createSiteVisitSales,
  updateSiteVisitFeedback,
  requestPlotHold,
  getMyBookings,
  createBookingRequest,
  getMyCustomers
} from '../../controllers/sales_user/salesUserController.js';
import { protect, authorize } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('sales_user'));

// Dashboard
router.get('/dashboard', getSalesDashboard);

// Leads
router.get('/leads', getMyLeads);
router.put('/leads/:id/call-disposition', logCallDisposition);

// Calls
router.get('/calls', getMyCalls);

// Follow-ups
router.get('/follow-ups', getMyFollowups);

// Site Visits
router.get('/site-visits', getMySiteVisits);
router.post('/site-visits', createSiteVisitSales);
router.put('/site-visits/:id/feedback', updateSiteVisitFeedback);

// Plots Hold Request
router.put('/plots/:id/hold-request', requestPlotHold);

// Bookings
router.get('/bookings', getMyBookings);
router.post('/bookings', createBookingRequest);

// Customers
router.get('/customers', getMyCustomers);

export default router;

