import { SiteVisit } from '../../models/SiteVisit.js';

// @desc    Get all site visits with search, status filter, pagination
// @route   GET /api/company-admin/site-visits
// @access  Private (company_admin)
export const getSiteVisits = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search, status, page = 1, limit = 50 } = req.query;

    let query = { companyId };
    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { clientName: regex },
        { clientPhone: regex },
        { projectName: regex },
        { executiveName: regex },
        { vehicle: regex }
      ];
    }

    const total = await SiteVisit.countDocuments(query);
    const visits = await SiteVisit.find(query)
      .sort({ visitDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // Stats
    const totalVisits = await SiteVisit.countDocuments({ companyId });
    const scheduled = await SiteVisit.countDocuments({ companyId, status: 'Scheduled' });
    const completed = await SiteVisit.countDocuments({ companyId, status: 'Completed' });

    res.status(200).json({
      success: true,
      stats: {
        totalVisits,
        scheduled,
        completed
      },
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      },
      data: visits.map(v => ({
        ...v,
        id: v._id,
        client: v.clientName,
        phone: v.clientPhone,
        project: v.projectName,
        scheduledDate: v.timeSlot ? `${v.timeSlot}` : '11:00 AM',
        vehicle: v.vehicle || 'Office Swift Dzire',
        assignedExecutive: v.executiveName || 'Field Executive',
        status: v.status,
        feedback: v.feedback || 'Visit in progress'
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new site visit
// @route   POST /api/company-admin/site-visits
// @access  Private (company_admin)
export const createSiteVisit = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { client, clientName, phone, clientPhone, project, projectName, executiveName, assignedExecutive, vehicle, timeSlot, scheduledDate, status, feedback } = req.body;

    const visit = await SiteVisit.create({
      companyId,
      clientName: clientName || client || 'Client',
      clientPhone: clientPhone || phone || '',
      projectName: projectName || project || 'Township Project',
      executiveName: executiveName || assignedExecutive || 'Sales Executive',
      vehicle: vehicle || 'Office Swift Dzire',
      timeSlot: timeSlot || scheduledDate || '11:00 AM',
      status: status || 'Scheduled',
      feedback: feedback || ''
    });

    res.status(201).json({
      success: true,
      message: 'Site visit scheduled successfully!',
      data: visit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update site visit
// @route   PUT /api/company-admin/site-visits/:id
// @access  Private (company_admin)
export const updateSiteVisit = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const visit = await SiteVisit.findOne({ _id: req.params.id, companyId });

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Site visit record not found' });
    }

    const { client, clientName, phone, clientPhone, project, projectName, executiveName, assignedExecutive, vehicle, timeSlot, scheduledDate, status, feedback } = req.body;
    if (client || clientName) visit.clientName = client || clientName;
    if (phone || clientPhone) visit.clientPhone = phone || clientPhone;
    if (project || projectName) visit.projectName = project || projectName;
    if (executiveName || assignedExecutive) visit.executiveName = executiveName || assignedExecutive;
    if (vehicle) visit.vehicle = vehicle;
    if (timeSlot || scheduledDate) visit.timeSlot = timeSlot || scheduledDate;
    if (status) visit.status = status;
    if (feedback !== undefined) visit.feedback = feedback;

    await visit.save();

    res.status(200).json({
      success: true,
      message: 'Site visit updated successfully!',
      data: visit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete site visit
// @route   DELETE /api/company-admin/site-visits/:id
// @access  Private (company_admin)
export const deleteSiteVisit = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const visit = await SiteVisit.findOneAndDelete({ _id: req.params.id, companyId });

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Site visit record not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Site visit record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

