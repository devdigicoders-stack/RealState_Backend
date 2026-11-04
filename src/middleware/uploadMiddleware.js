import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base Upload Directory: Backend/uploads
const UPLOAD_ROOT = path.join(__dirname, '../../uploads');

// Ensure root folder exists
if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

// Storage Engine with Auto-Directory Provisioning by Role & Category
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 1. Determine role folder (superadmin, company_admin, manager, sales_user, agent, or general)
    const role = (req.user?.role || req.body.role || req.query.role || 'general').toLowerCase();

    // 2. Determine category/type folder (avatars, documents, blueprints, invoices, plots)
    let category = (req.body.category || req.query.category || '').toLowerCase();
    
    // Auto-detect category from file mimetype if not explicitly passed
    if (!category) {
      if (file.mimetype.startsWith('image/')) {
        category = 'images';
      } else if (file.mimetype === 'application/pdf') {
        category = 'documents';
      } else if (file.mimetype.includes('word') || file.mimetype.includes('officedocument') || file.mimetype.includes('excel')) {
        category = 'documents';
      } else {
        category = 'files';
      }
    }

    // Target folder structure: uploads/{role}/{category}
    const targetDir = path.join(UPLOAD_ROOT, role, category);

    // Auto-create recursive folder if not exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    // Safe clean unique file naming: fieldname-timestamp-random.ext
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${cleanBaseName}-${uniqueSuffix}${ext}`);
  }
});

// File Type Filter for Images, PDFs, and Docs
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File format ${ext} is not supported. Allowed formats: ${allowedExtensions.join(', ')}`), false);
  }
};

// Max size 25MB per file
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }
});

