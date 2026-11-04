import express from 'express';
import { getCompanyAdminProfile, updateCompanyAdminProfile } from '../../controllers/company_admin/companyAdminAuthController.js';
import { getCompanyDashboardStats, quickAddLead, approveBooking } from '../../controllers/company_admin/companyAdminDashboardController.js';
import { getBranches, getBranchDetail, createBranch, updateBranch, deleteBranch } from '../../controllers/company_admin/companyAdminBranchesController.js';
import { getLeads, createLead, updateLead, deleteLead } from '../../controllers/company_admin/companyAdminLeadsController.js';
import { getProjects, createProject, updateProject, deleteProject } from '../../controllers/company_admin/companyAdminProjectsController.js';
import { getPlots, createPlot, updatePlot, deletePlot } from '../../controllers/company_admin/companyAdminPlotsController.js';
import { getCallLogs, createCallLog } from '../../controllers/company_admin/companyAdminCallingController.js';
import { getBookings, createBooking, updateBooking, deleteBooking } from '../../controllers/company_admin/companyAdminBookingsController.js';
import { getSiteVisits, createSiteVisit, updateSiteVisit, deleteSiteVisit } from '../../controllers/company_admin/companyAdminSiteVisitsController.js';
import { getTeamMembers, getTeamMemberDetail, createTeamMember, updateTeamMember, deleteTeamMember, updateTeamMemberApproval } from '../../controllers/company_admin/companyAdminTeamController.js';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../../controllers/company_admin/companyAdminCustomersController.js';
import { getAgents, getAgentDetail, createAgent, updateAgent, deleteAgent, updateAgentApproval } from '../../controllers/company_admin/companyAdminAgentsController.js';
import { getFinanceTransactions } from '../../controllers/company_admin/companyAdminFinanceController.js';
import { getCompanyReports } from '../../controllers/company_admin/companyAdminReportsController.js';
import { protect, authorize } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Routes allowed for Company Admin, Manager, Sales User and Agent
// 1. Projects Dropdown & Plots Inventory Matrix (Read-only for sales_user and agent)
router.get('/projects', authorize('company_admin', 'manager', 'sales_user', 'agent'), getProjects);
router.post('/projects', authorize('company_admin', 'manager'), createProject);
router.put('/projects/:id', authorize('company_admin', 'manager'), updateProject);
router.delete('/projects/:id', authorize('company_admin', 'manager'), deleteProject);

router.get('/plots', authorize('company_admin', 'manager', 'sales_user', 'agent'), getPlots);
router.post('/plots', authorize('company_admin', 'manager'), createPlot);
router.put('/plots/:id', authorize('company_admin', 'manager'), updatePlot);
router.delete('/plots/:id', authorize('company_admin', 'manager'), deletePlot);

// 2. Restricted Admin & Manager Only Routes
const adminOrManagerOnly = authorize('company_admin', 'manager');

// Profile
router.get('/profile', adminOrManagerOnly, getCompanyAdminProfile);
router.put('/profile', adminOrManagerOnly, updateCompanyAdminProfile);

// Dashboard Overview & Quick Actions
router.get('/dashboard', adminOrManagerOnly, getCompanyDashboardStats);
router.post('/dashboard/quick-lead', adminOrManagerOnly, quickAddLead);
router.put('/dashboard/bookings/:id/approve', adminOrManagerOnly, approveBooking);

// Branches
router.get('/branches', adminOrManagerOnly, getBranches);
router.get('/branches/:id', adminOrManagerOnly, getBranchDetail);
router.post('/branches', adminOrManagerOnly, createBranch);
router.put('/branches/:id', adminOrManagerOnly, updateBranch);
router.delete('/branches/:id', adminOrManagerOnly, deleteBranch);

// Leads
router.get('/leads', adminOrManagerOnly, getLeads);
router.post('/leads', adminOrManagerOnly, createLead);
router.put('/leads/:id', adminOrManagerOnly, updateLead);
router.delete('/leads/:id', adminOrManagerOnly, deleteLead);

// Calling & Telephony Logs
router.get('/calling', adminOrManagerOnly, getCallLogs);
router.post('/calling', adminOrManagerOnly, createCallLog);

// Bookings
router.get('/bookings', adminOrManagerOnly, getBookings);
router.post('/bookings', adminOrManagerOnly, createBooking);
router.put('/bookings/:id', adminOrManagerOnly, updateBooking);
router.delete('/bookings/:id', adminOrManagerOnly, deleteBooking);

// Site Visits
router.get('/site-visits', adminOrManagerOnly, getSiteVisits);
router.post('/site-visits', adminOrManagerOnly, createSiteVisit);
router.put('/site-visits/:id', adminOrManagerOnly, updateSiteVisit);
router.delete('/site-visits/:id', adminOrManagerOnly, deleteSiteVisit);

// Team / Staff
router.get('/team', adminOrManagerOnly, getTeamMembers);
router.get('/team/:id', adminOrManagerOnly, getTeamMemberDetail);
router.post('/team', adminOrManagerOnly, createTeamMember);
router.put('/team/:id', adminOrManagerOnly, updateTeamMember);
router.put('/team/:id/approval', adminOrManagerOnly, updateTeamMemberApproval);
router.delete('/team/:id', adminOrManagerOnly, deleteTeamMember);

// Customers
router.get('/customers', adminOrManagerOnly, getCustomers);
router.post('/customers', adminOrManagerOnly, createCustomer);
router.put('/customers/:id', adminOrManagerOnly, updateCustomer);
router.delete('/customers/:id', adminOrManagerOnly, deleteCustomer);

// Agents / Channel Partners
router.get('/agents', adminOrManagerOnly, getAgents);
router.get('/agents/:id', adminOrManagerOnly, getAgentDetail);
router.post('/agents', adminOrManagerOnly, createAgent);
router.put('/agents/:id', adminOrManagerOnly, updateAgent);
router.put('/agents/:id/approval', adminOrManagerOnly, updateAgentApproval);
router.delete('/agents/:id', adminOrManagerOnly, deleteAgent);

// Finance Ledger
router.get('/finance', adminOrManagerOnly, getFinanceTransactions);

// BI Reports
router.get('/reports', adminOrManagerOnly, getCompanyReports);

export default router;

