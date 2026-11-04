import { Plot } from '../../models/Plot.js';
import { Project } from '../../models/Project.js';

// @desc    Get all plots with project filtering and search
// @route   GET /api/company-admin/plots
// @access  Private (company_admin)
export const getPlots = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { projectId, status, search, page = 1, limit = 50 } = req.query;

    let query = { companyId };

    if (projectId && projectId !== 'All') {
      query.projectId = projectId;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { plotNumber: regex },
        { block: regex },
        { facing: regex },
        { 'bookedBy.customerName': regex }
      ];
    }

    const total = await Plot.countDocuments(query);
    const plots = await Plot.find(query)
      .populate('projectId', 'name location city')
      .sort({ block: 1, plotNumber: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // Stats
    const totalPlots = await Plot.countDocuments({ companyId });
    const availablePlots = await Plot.countDocuments({ companyId, status: 'Available' });
    const bookedPlots = await Plot.countDocuments({ companyId, status: 'Booked' });
    const holdPlots = await Plot.countDocuments({ companyId, status: 'Hold' });
    const registeredPlots = await Plot.countDocuments({ companyId, status: 'Registered' });

    res.status(200).json({
      success: true,
      stats: {
        totalPlots,
        availablePlots,
        bookedPlots,
        holdPlots,
        registeredPlots
      },
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      },
      data: plots.map(p => ({
        ...p,
        id: p._id,
        plotNo: p.plotNumber,
        size: `${p.sizeSqft} sqft`,
        dims: p.dimensions,
        rate: `₹${(p.ratePerSqft || 0).toLocaleString('en-IN')}/sqft`,
        total: `₹${(p.totalPrice || 0).toLocaleString('en-IN')}`,
        projectName: p.projectId?.name || 'Township Project'
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new plot
// @route   POST /api/company-admin/plots
// @access  Private (company_admin)
export const createPlot = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { projectId, plotNumber, plotNo, block, sizeSqft, size, dimensions, dims, facing, ratePerSqft, rate, totalPrice, total, status } = req.body;

    const cleanPlotNo = (plotNumber || plotNo || '').trim();
    if (!cleanPlotNo) {
      return res.status(400).json({ success: false, message: 'Plot Number is required' });
    }

    // Default to first active project if not sent
    let activeProjectId = projectId;
    if (!activeProjectId) {
      const firstProject = await Project.findOne({ companyId });
      if (firstProject) activeProjectId = firstProject._id;
    }

    if (!activeProjectId) {
      return res.status(400).json({ success: false, message: 'Please create a project first' });
    }

    const numericSize = Number(sizeSqft) || Number(String(size).replace(/[^0-9]/g, '')) || 1200;
    const numericRate = Number(ratePerSqft) || Number(String(rate).replace(/[^0-9]/g, '')) || 2450;
    const numericTotal = Number(totalPrice) || Number(String(total).replace(/[^0-9]/g, '')) || (numericSize * numericRate);

    const plot = await Plot.create({
      companyId,
      projectId: activeProjectId,
      plotNumber: cleanPlotNo,
      block: block || 'A',
      sizeSqft: numericSize,
      dimensions: dimensions || dims || '30x40',
      facing: facing || 'East',
      ratePerSqft: numericRate,
      totalPrice: numericTotal,
      status: status || 'Available'
    });

    res.status(201).json({
      success: true,
      message: `Plot ${plot.plotNumber} added to matrix!`,
      data: plot
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update plot
// @route   PUT /api/company-admin/plots/:id
// @access  Private (company_admin)
export const updatePlot = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const plot = await Plot.findOne({ _id: req.params.id, companyId });

    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found' });
    }

    const { plotNumber, plotNo, block, sizeSqft, size, dimensions, dims, facing, ratePerSqft, rate, totalPrice, total, status, bookedBy } = req.body;

    if (plotNumber || plotNo) plot.plotNumber = (plotNumber || plotNo).trim();
    if (block) plot.block = block.trim();
    if (sizeSqft || size) plot.sizeSqft = Number(sizeSqft) || Number(String(size).replace(/[^0-9]/g, ''));
    if (dimensions || dims) plot.dimensions = dimensions || dims;
    if (facing) plot.facing = facing;
    if (ratePerSqft || rate) plot.ratePerSqft = Number(ratePerSqft) || Number(String(rate).replace(/[^0-9]/g, ''));
    if (totalPrice || total) plot.totalPrice = Number(totalPrice) || Number(String(total).replace(/[^0-9]/g, ''));
    if (status) plot.status = status;
    if (bookedBy) plot.bookedBy = bookedBy;

    await plot.save();

    res.status(200).json({
      success: true,
      message: `Plot ${plot.plotNumber} updated!`,
      data: plot
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete plot
// @route   DELETE /api/company-admin/plots/:id
// @access  Private (company_admin)
export const deletePlot = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const plot = await Plot.findOneAndDelete({ _id: req.params.id, companyId });

    if (!plot) {
      return res.status(404).json({ success: false, message: 'Plot not found' });
    }

    res.status(200).json({
      success: true,
      message: `Plot ${plot.plotNumber} deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

