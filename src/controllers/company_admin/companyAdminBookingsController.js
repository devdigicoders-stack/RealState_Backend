import { Booking } from '../../models/Booking.js';
import { Plot } from '../../models/Plot.js';
import { Customer } from '../../models/Customer.js';

// @desc    Get all bookings for current company
// @route   GET /api/company-admin/bookings
// @access  Private (company_admin)
export const getBookings = async (req, res) => {
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
        { bookingId: regex },
        { customerName: regex },
        { customerPhone: regex },
        { projectName: regex },
        { plotNumber: regex },
        { salesExecutiveName: regex }
      ];
    }

    const total = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // Stats
    const totalBookings = await Booking.countDocuments({ companyId });
    const pendingApproval = await Booking.countDocuments({ companyId, status: 'Pending Approval' });
    const approvedBookings = await Booking.find({ companyId, status: 'Approved' }).lean();
    const approvedVolume = approvedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalTokenCollected = bookings.reduce((sum, b) => sum + (b.tokenAmount || 0), 0);

    res.status(200).json({
      success: true,
      stats: {
        totalBookings,
        pendingApproval,
        approvedUnits: approvedBookings.length,
        approvedVolume: `₹${(approvedVolume / 10000000).toFixed(2)} Cr`,
        totalTokenCollected: `₹${totalTokenCollected.toLocaleString('en-IN')}`
      },
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      },
      data: bookings.map(b => ({
        ...b,
        id: b.bookingId || b._id,
        customer: b.customerName,
        phone: b.customerPhone,
        project: b.projectName || 'Township Project',
        plotNo: b.plotNumber,
        totalPlotValue: `₹${(b.totalAmount || 0).toLocaleString('en-IN')}`,
        tokenAmount: `₹${(b.tokenAmount || 0).toLocaleString('en-IN')}`,
        salesExec: b.salesExecutiveName || 'Sales Team',
        bookingDate: b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
        status: b.status
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new booking
// @route   POST /api/company-admin/bookings
// @access  Private (company_admin)
export const createBooking = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { customerName, customer, customerPhone, phone, projectName, project, plotNumber, plotNo, tokenAmount, totalAmount, totalPlotValue, salesExecutiveName, salesExec } = req.body;

    const count = await Booking.countDocuments({ companyId });
    const bookingId = `BK-${100 + count + 1}`;

    const numToken = Number(tokenAmount) || Number(String(tokenAmount).replace(/[^0-9]/g, '')) || 51000;
    const numTotal = Number(totalAmount) || Number(String(totalPlotValue).replace(/[^0-9]/g, '')) || 2500000;

    const booking = await Booking.create({
      companyId,
      bookingId,
      customerName: customerName || customer || 'Customer',
      customerPhone: customerPhone || phone || '',
      projectName: projectName || project || 'Township Project',
      plotNumber: plotNumber || plotNo || 'Plot A-01',
      tokenAmount: numToken,
      totalAmount: numTotal,
      paidAmount: numToken,
      salesExecutiveName: salesExecutiveName || salesExec || 'Direct Sales',
      status: 'Pending Approval'
    });

    // Also auto-sync/upsert in dedicated Customer collection
    if (booking.customerPhone) {
      await Customer.findOneAndUpdate(
        { companyId, phone: booking.customerPhone },
        {
          name: booking.customerName,
          phone: booking.customerPhone,
          companyId,
          stage: 'Token Paid',
          kycStatus: 'Verified'
        },
        { upsert: true, new: true }
      );
    }

    res.status(201).json({
      success: true,
      message: `Booking ${booking.bookingId} created successfully!`,
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update booking
// @route   PUT /api/company-admin/bookings/:id
// @access  Private (company_admin)
export const updateBooking = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const booking = await Booking.findOne({
      $or: [{ _id: req.params.id }, { bookingId: req.params.id }],
      companyId
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const {
      status,
      customerName,
      customerPhone,
      tokenAmount,
      totalAmount,
      paidAmount,
      agentCommissionStatus,
      agentCommissionAmount,
      agentCommissionRate
    } = req.body;

    if (status) {
      booking.status = status;
      // Auto-update linked plot status according to product lifecycle
      if (booking.plotId || booking.plotNumber) {
        let plotQuery = { companyId };
        if (booking.plotId) plotQuery._id = booking.plotId;
        else if (booking.plotNumber) {
          plotQuery.plotNumber = booking.plotNumber;
          if (booking.projectId) plotQuery.projectId = booking.projectId;
        }

        let newPlotStatus = null;
        if (['Approved', 'Token Paid', 'Partially Paid'].includes(status)) {
          newPlotStatus = 'Booked';
        } else if (status === 'Hold') {
          newPlotStatus = 'Hold';
        } else if (status === 'Registered') {
          newPlotStatus = 'Registered';
        } else if (status === 'Sold / Closed') {
          newPlotStatus = 'Sold / Closed';
        } else if (status === 'Rejected') {
          newPlotStatus = 'Available';
        }

        if (newPlotStatus) {
          await Plot.findOneAndUpdate(plotQuery, {
            $set: {
              status: newPlotStatus,
              bookedBy: {
                customerName: booking.customerName,
                customerPhone: booking.customerPhone,
                tokenAmount: booking.tokenAmount,
                bookedDate: new Date()
              }
            }
          });
        }
      }

      // Auto-calculate & activate agent commission when deal is approved/closed
      if (['Approved', 'Token Paid', 'Sold / Closed'].includes(status) && booking.agentId && (!booking.agentCommissionAmount || booking.agentCommissionAmount === 0)) {
        const Agent = (await import('../../models/Agent.js')).Agent;
        const agent = await Agent.findById(booking.agentId);
        if (agent) {
          const rateNum = parseFloat(String(agent.commissionRate || '2.5').replace('%', '')) || 2.5;
          const commAmt = Math.round(((booking.totalAmount || booking.dealValue || 0) * rateNum) / 100);
          booking.agentCommissionRate = `${rateNum}%`;
          booking.agentCommissionAmount = commAmt;
          booking.agentCommissionStatus = 'Approved';
        }
      }
    }

    if (agentCommissionStatus) booking.agentCommissionStatus = agentCommissionStatus;
    if (agentCommissionAmount !== undefined) booking.agentCommissionAmount = Number(agentCommissionAmount);
    if (agentCommissionRate) booking.agentCommissionRate = agentCommissionRate;
    if (paidAmount !== undefined) booking.paidAmount = Number(paidAmount);
    if (customerName) booking.customerName = customerName.trim();
    if (customerPhone) booking.customerPhone = customerPhone.trim();
    if (tokenAmount !== undefined) booking.tokenAmount = Number(tokenAmount);
    if (totalAmount !== undefined) booking.totalAmount = Number(totalAmount);

    await booking.save();

    res.status(200).json({
      success: true,
      message: `Booking #${booking.bookingId} updated successfully!`,
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete booking
// @route   DELETE /api/company-admin/bookings/:id
// @access  Private (company_admin)
export const deleteBooking = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const booking = await Booking.findOneAndDelete({
      $or: [{ _id: req.params.id }, { bookingId: req.params.id }],
      companyId
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({
      success: true,
      message: `Booking #${booking.bookingId} removed successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

