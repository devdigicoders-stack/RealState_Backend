import path from 'path';

// @desc    Upload Single File (Image, PDF, Doc)
// @route   POST /api/upload
// @access  Private / Authenticated
export const uploadSingleFile = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a file.'
      });
    }

    const role = (req.user?.role || req.body.role || req.query.role || 'general').toLowerCase();
    
    // Determine category folder from actual saved file path
    let category = (req.body.category || req.query.category || '').toLowerCase();
    if (req.file.destination) {
      const parts = req.file.destination.split(path.sep);
      category = parts[parts.length - 1];
    } else if (!category) {
      if (req.file.mimetype.startsWith('image/')) category = 'images';
      else if (req.file.mimetype === 'application/pdf' || req.file.mimetype.includes('document')) category = 'documents';
      else category = 'files';
    }

    // Relative web URL: /uploads/{role}/{category}/{filename}
    const relativeUrl = `/uploads/${role}/${category}/${req.file.filename}`;
    
    // Protocol + Host absolute URL
    const protocol = req.protocol;
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}${relativeUrl}`;

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully!',
      data: {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        role,
        category,
        url: fullUrl,
        relativeUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'File upload failed'
    });
  }
};

// @desc    Upload Multiple Files
// @route   POST /api/upload/multiple
// @access  Private / Authenticated
export const uploadMultipleFiles = (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded.'
      });
    }

    const role = (req.user?.role || req.body.role || req.query.role || 'general').toLowerCase();
    const protocol = req.protocol;
    const host = req.get('host');

    const uploadedFiles = req.files.map(f => {
      let category = (req.body.category || req.query.category || '').toLowerCase();
      if (f.destination) {
        const parts = f.destination.split(path.sep);
        category = parts[parts.length - 1];
      } else if (!category) {
        if (f.mimetype.startsWith('image/')) category = 'images';
        else if (f.mimetype === 'application/pdf' || f.mimetype.includes('document')) category = 'documents';
        else category = 'files';
      }
      const relativeUrl = `/uploads/${role}/${category}/${f.filename}`;
      return {
        fileName: f.filename,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        url: `${protocol}://${host}${relativeUrl}`,
        relativeUrl
      };
    });

    res.status(200).json({
      success: true,
      count: uploadedFiles.length,
      data: uploadedFiles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

