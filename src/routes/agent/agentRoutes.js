import express from 'express';
import {
  getAgentDashboard,
  getAvailableProjects,
  getAvailablePlots,
  getMyAgentLeads,
  createAgentLead,
  getMyAgentSiteVisits,
  requestAgentSiteVisit,
  getMyAgentBookings,
  getMyAgentCommissions,
  getMyAgentCustomers
} from '../../controllers/agent/agentController.js';
import { protect, authorize } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('agent'));

// 1. Dashboard
router.get('/dashboard', getAgentDashboard);

// 2. Inventory (Projects & Plots Matrix)
router.get('/projects', getAvailableProjects);
router.get('/plots', getAvailablePlots);

// 3. Leads
router.get('/leads', getMyAgentLeads);
router.post('/leads', createAgentLead);

// 4. Site Visits
router.get('/site-visits', getMyAgentSiteVisits);
router.post('/site-visits', requestAgentSiteVisit);

// 5. Bookings & Sales
router.get('/bookings', getMyAgentBookings);

// 6. Commissions & Ledger
router.get('/commissions', getMyAgentCommissions);

// 7. Customers
router.get('/customers', getMyAgentCustomers);

export default router;

