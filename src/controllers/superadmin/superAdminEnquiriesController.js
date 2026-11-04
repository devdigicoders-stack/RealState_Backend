import { Enquiry } from '../../models/Enquiry.js';

// =========================================================================
// PUBLIC: Submit Contact / Website Enquiry
// @route   POST /api/public/enquiry
// @access  Public
// =========================================================================
export const submitPublicEnquiry = async (req, res) => {
  try {
    const { fullName, companyName, mobileNumber, emailAddress, businessType, interestedIn, message, source } = req.body;

    if (!fullName || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Full Name and Mobile Number are required'
      });
    }

    const newEnquiry = await Enquiry.create({
      fullName,
      companyName: companyName || '',
      mobileNumber,
      emailAddress: emailAddress || '',
      businessType: businessType || 'Real Estate Developer',
      interestedIn: interestedIn || 'Complete Real Estate Software',
      message: message || '',
      source: source || 'Website Contact Form'
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your enquiry has been received. Our team will contact you shortly.',
      data: newEnquiry
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// SUPERADMIN: List All Enquiries
// @route   GET /api/superadmin/enquiries
// @access  Private (superadmin)
// =========================================================================
export const getSuperAdminEnquiries = async (req, res) => {
  try {
    const { search, status, businessType } = req.query;

    let query = {};

    if (status && status !== 'All') {
      query.status = status;
    }
    if (businessType && businessType !== 'All') {
      query.businessType = businessType;
    }
    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: reg },
        { companyName: reg },
        { mobileNumber: reg },
        { emailAddress: reg },
        { message: reg }
      ];
    }

    const enquiries = await Enquiry.find(query).sort({ createdAt: -1 }).lean();

    const counts = {
      total: await Enquiry.countDocuments(),
      new: await Enquiry.countDocuments({ status: 'New' }),
      contacted: await Enquiry.countDocuments({ status: 'Contacted' }),
      converted: await Enquiry.countDocuments({ status: 'Converted' })
    };

    res.status(200).json({
      success: true,
      count: enquiries.length,
      counts,
      data: enquiries
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// SUPERADMIN: Update Enquiry Status / Notes
// @route   PUT /api/superadmin/enquiries/:id
// @access  Private (superadmin)
// =========================================================================
export const updateSuperAdminEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const enquiry = await Enquiry.findById(id);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry record not found' });
    }

    if (status) enquiry.status = status;
    if (notes !== undefined) enquiry.notes = notes;

    await enquiry.save();

    res.status(200).json({
      success: true,
      message: 'Enquiry status updated successfully',
      data: enquiry
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// SUPERADMIN: Delete Enquiry
// @route   DELETE /api/superadmin/enquiries/:id
// @access  Private (superadmin)
// =========================================================================
export const deleteSuperAdminEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const enquiry = await Enquiry.findByIdAndDelete(id);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry record not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Enquiry deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

