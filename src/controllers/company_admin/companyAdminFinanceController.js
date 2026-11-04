import { Booking } from '../../models/Booking.js';

// @desc    Get company financial ledger and customer payment transactions
// @route   GET /api/company-admin/finance
// @access  Private (company_admin)
export const getFinanceTransactions = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search } = req.query;

    const bookings = await Booking.find({ companyId }).sort({ createdAt: -1 }).lean();

    const transactions = bookings.map((b, idx) => ({
      id: `TXN-${700 + idx + 1}`,
      customer: b.customerName,
      plot: `${b.plotNumber} (${b.projectName || 'Township'})`,
      type: b.status === 'Approved' ? 'Full Booking Clearance' : 'Token Advance',
      amount: `₹${(b.paidAmount || b.tokenAmount || 0).toLocaleString('en-IN')}`,
      mode: 'Bank Transfer / RTGS / Online Gateway',
      date: b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : 'Recent',
      receiptNo: `RCP-2026-${9900 + idx + 1}`,
      status: 'Realized / Cleared'
    }));

    let filtered = transactions;
    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = transactions.filter(t =>
        t.customer.toLowerCase().includes(s) ||
        t.plot.toLowerCase().includes(s) ||
        t.receiptNo.toLowerCase().includes(s)
      );
    }

    const totalCollected = bookings.reduce((sum, b) => sum + (b.paidAmount || b.tokenAmount || 0), 0);
    const totalVolume = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    res.status(200).json({
      success: true,
      stats: {
        totalCollected: `₹${(totalCollected / 10000000).toFixed(2)} Cr`,
        totalSalesVolume: `₹${(totalVolume / 10000000).toFixed(2)} Cr`,
        pendingClearance: '₹0.00'
      },
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

