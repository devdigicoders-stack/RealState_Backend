import express from 'express';
import { uploadSingleFile, uploadMultipleFiles } from '../controllers/uploadController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Allow authenticated users to upload files with auto-folder segregation
router.post('/', protect, upload.single('file'), uploadSingleFile);
router.post('/multiple', protect, upload.array('files', 10), uploadMultipleFiles);

// Public upload fallback if user is registering initial onboarding documents
router.post('/public', upload.single('file'), uploadSingleFile);

export default router;

