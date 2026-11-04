import { Project } from '../../models/Project.js';
import { Plot } from '../../models/Plot.js';

// @desc    Get all projects for current tenant company
// @route   GET /api/company-admin/projects
// @access  Private (company_admin)
export const getProjects = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search } = req.query;

    let query = { companyId };
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { location: regex },
        { type: regex },
        { reraNo: regex }
      ];
    }

    const projects = await Project.find(query).sort({ createdAt: -1 }).lean();

    // Attach real-time plot calculations from Plot collection
    const enhancedProjects = await Promise.all(
      projects.map(async (prj) => {
        const totalPlotsCount = await Plot.countDocuments({ companyId, projectId: prj._id });
        const availableCount = await Plot.countDocuments({ companyId, projectId: prj._id, status: 'Available' });
        const bookedCount = await Plot.countDocuments({ companyId, projectId: prj._id, status: { $in: ['Booked', 'Registered'] } });
        const holdCount = await Plot.countDocuments({ companyId, projectId: prj._id, status: 'Hold' });

        return {
          ...prj,
          id: prj._id,
          totalPlots: totalPlotsCount || prj.totalPlots || 0,
          availablePlots: availableCount,
          bookedPlots: bookedCount,
          holdPlots: holdCount
        };
      })
    );

    // Dynamic Top Stats
    const totalProjectsCount = await Project.countDocuments({ companyId });
    const totalCompanyPlots = await Plot.countDocuments({ companyId });
    const totalAvailablePlots = await Plot.countDocuments({ companyId, status: 'Available' });

    res.status(200).json({
      success: true,
      stats: {
        totalProjects: totalProjectsCount,
        totalPlots: totalCompanyPlots,
        availablePlots: totalAvailablePlots
      },
      count: enhancedProjects.length,
      data: enhancedProjects
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new project
// @route   POST /api/company-admin/projects
// @access  Private (company_admin)
export const createProject = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { name, type, location, city, reraNo, totalArea, totalPlots, status, description, image } = req.body;

    if (!name || !location) {
      return res.status(400).json({ success: false, message: 'Project name and location are required' });
    }

    const project = await Project.create({
      companyId,
      name: name.trim(),
      type: type || 'Township',
      location: location.trim(),
      city: city || 'Lucknow',
      reraNo: reraNo ? reraNo.trim() : '',
      totalArea: totalArea || '25 Acres',
      totalPlots: Number(totalPlots) || 0,
      status: status || 'Active',
      description: description || '',
      image: image || ''
    });

    res.status(201).json({
      success: true,
      message: `Project "${project.name}" registered successfully!`,
      data: project
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/company-admin/projects/:id
// @access  Private (company_admin)
export const updateProject = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const project = await Project.findOne({ _id: req.params.id, companyId });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const { name, type, location, city, reraNo, totalArea, totalPlots, status, description, image } = req.body;
    if (name) project.name = name.trim();
    if (type) project.type = type;
    if (location) project.location = location.trim();
    if (city) project.city = city.trim();
    if (reraNo !== undefined) project.reraNo = reraNo.trim();
    if (totalArea) project.totalArea = totalArea;
    if (totalPlots !== undefined) project.totalPlots = Number(totalPlots);
    if (status) project.status = status;
    if (description !== undefined) project.description = description;
    if (image !== undefined) project.image = image;

    await project.save();

    res.status(200).json({
      success: true,
      message: `Project "${project.name}" updated successfully!`,
      data: project
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/company-admin/projects/:id
// @access  Private (company_admin)
export const deleteProject = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const project = await Project.findOneAndDelete({ _id: req.params.id, companyId });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Also delete linked plots
    await Plot.deleteMany({ companyId, projectId: req.params.id });

    res.status(200).json({
      success: true,
      message: `Project "${project.name}" and linked inventory deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

