import { Customer } from '../../models/Customer.js';
import { Booking } from '../../models/Booking.js';
import { CallLog } from '../../models/CallLog.js';
import { SiteVisit } from '../../models/SiteVisit.js';

// @desc    Get all customers from dedicated Customer collection
// @route   GET /api/company-admin/customers
// @access  Private (company_admin)
export const getCustomers = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search } = req.query;

    let query = { companyId };
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { phone: regex }, { email: regex }, { city: regex }];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 }).lean();

    // Also get bookings to cross-reference units and financials
    const phones = customers.map(c => c.phone);
    const bookings = await Booking.find({ companyId, customerPhone: { $in: phones } }).lean();
    const calls = await CallLog.find({ companyId, clientPhone: { $in: phones } }).lean();
    const visits = await SiteVisit.find({ companyId, clientPhone: { $in: phones } }).lean();

    const data = customers.map(c => {
      const customerBookings = bookings.filter(b => b.customerPhone === c.phone);
      const customerCalls = calls.filter(cl => cl.clientPhone === c.phone);
      const customerVisits = visits.filter(sv => sv.clientPhone === c.phone);

      const totalVal = customerBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
      const totalPaid = customerBookings.reduce((sum, b) => sum + (Number(b.paidAmount || b.tokenAmount) || 0), 0);
      const balance = Math.max(0, totalVal - totalPaid);

      const latestBooking = customerBookings[0];
      const bookedUnit = latestBooking
        ? `${latestBooking.plotNumber} (${latestBooking.projectName || 'Township'})`
        : 'Prospect / Interested';

      return {
        ...c,
        id: c._id,
        name: c.name,
        phone: c.phone,
        email: c.email || '',
        city: c.city || 'Lucknow',
        bookedUnit,
        unitValue: totalVal > 0 ? `₹${totalVal.toLocaleString('en-IN')}` : '₹0',
        paidSoFar: totalPaid > 0 ? `₹${totalPaid.toLocaleString('en-IN')}` : '₹0',
        balanceDue: balance > 0 ? `₹${balance.toLocaleString('en-IN')}` : '₹0',
        stage: c.stage || (customerBookings.length > 0 ? 'Sale Registered' : 'Active Lead'),
        kycStatus: c.kycStatus || 'Verified',
        agentId: c.agentId || null,
        agentName: c.agentName || (customerBookings[0]?.agentName || ''),
        referredByCustomerId: c.referredByCustomerId || null,
        referredByCustomerName: c.referredByCustomerName || '',
        totalSiteVisits: customerVisits.length,
        totalCalls: customerCalls.length
      };
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new customer in dedicated Customer collection
// @route   POST /api/company-admin/customers
// @access  Private (company_admin)
export const createCustomer = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { name, phone, email, city, address, kycStatus, stage, panNumber, aadharNumber, agentId, agentName, referredByCustomerId, referredByCustomerName } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Customer name and phone number are required' });
    }

    const customer = await Customer.create({
      companyId,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : '',
      city: city || 'Lucknow',
      address: address || '',
      kycStatus: kycStatus || 'Verified',
      stage: stage || 'Token Paid',
      panNumber: panNumber || '',
      aadharNumber: aadharNumber || '',
      agentId: agentId || null,
      agentName: agentName || '',
      referredByCustomerId: referredByCustomerId || null,
      referredByCustomerName: referredByCustomerName || ''
    });

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully in Customer collection!',
      data: customer
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update customer
// @route   PUT /api/company-admin/customers/:id
// @access  Private (company_admin)
export const updateCustomer = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const customer = await Customer.findOneAndUpdate(
      { _id: id, companyId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully!',
      data: customer
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete customer
// @route   DELETE /api/company-admin/customers/:id
// @access  Private (company_admin)
export const deleteCustomer = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const customer = await Customer.findOneAndDelete({ _id: id, companyId });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
