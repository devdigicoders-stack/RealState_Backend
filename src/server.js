import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';

// Super Admin Core API Routes
import superAdminAuthRoutes from './routes/superadmin/superAdminAuthRoutes.js';
import superAdminCompaniesRoutes from './routes/superadmin/superAdminCompaniesRoutes.js';
import superAdminPlansRoutes from './routes/superadmin/superAdminPlansRoutes.js';
import superAdminOpsRoutes from './routes/superadmin/superAdminOpsRoutes.js';
import superAdminSuiteRoutes from './routes/superadmin/superAdminSuiteRoutes.js';

// Company Admin Core API Routes
import companyAdminAuthRoutes from './routes/company_admin/companyAdminAuthRoutes.js';

// Manager Core API Routes
import managerRoutes from './routes/manager/managerRoutes.js';

// Sales User Core API Routes
import salesUserRoutes from './routes/sales_user/salesUserRoutes.js';

// Agent / Broker Core API Routes
import agentRoutes from './routes/agent/agentRoutes.js';

// Universal Auth Routes (All Roles)
import authRoutes from './routes/authRoutes.js';

// Central File Upload Routes
import uploadRoutes from './routes/uploadRoutes.js';

// Public Website Routes (Enquiry & Contact)
import publicRoutes from './routes/publicRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve Uploaded Files Statically with Public Web Access
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));
// Fallback so if a document was requested under /documents or /images, it resolves cleanly
app.use('/uploads/company_admin/documents', express.static(path.join(uploadsPath, 'company_admin/images')));
app.use('/uploads/company_admin/images', express.static(path.join(uploadsPath, 'company_admin/documents')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    system: 'Real Estate Multi-Tenant CRM Super Admin Backend API'
  });
});

// Mount Public Website APIs
app.use('/api/public', publicRoutes);

// Mount Universal Auth
app.use('/api/auth', authRoutes);

// Mount File Upload API
app.use('/api/upload', uploadRoutes);

// Mount Super Admin APIs
app.use('/api/superadmin/auth', superAdminAuthRoutes);
app.use('/api/superadmin/companies', superAdminCompaniesRoutes);
app.use('/api/superadmin/plans', superAdminPlansRoutes);
app.use('/api/superadmin', superAdminOpsRoutes);
app.use('/api/superadmin', superAdminSuiteRoutes);

// Mount Company Admin APIs
app.use('/api/company-admin', companyAdminAuthRoutes);

// Mount Manager APIs
app.use('/api/manager', managerRoutes);

// Mount Sales User APIs
app.use('/api/sales-user', salesUserRoutes);

// Mount Agent / Channel Partner APIs
app.use('/api/agent', agentRoutes);

// Generic Tenant Endpoints will be mounted as company modules are built
// app.use('/api/auth', authRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 [Real Estate SaaS Backend Running on Port ${PORT}]`);
});

