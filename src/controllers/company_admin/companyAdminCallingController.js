import { CallLog } from '../../models/CallLog.js';

// @desc    Get all call logs with search, filter, pagination
// @route   GET /api/company-admin/calling
// @access  Private (company_admin)
export const getCallLogs = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { search, type, status, page = 1, limit = 50 } = req.query;

    let query = { companyId };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { clientName: regex },
        { clientPhone: regex },
        { callerName: regex },
        { notes: regex }
      ];
    }

    if (type && type !== 'All') {
      query.direction = type;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    const total = await CallLog.countDocuments(query);
    const logs = await CallLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // Stats
    const totalCalls = await CallLog.countDocuments({ companyId });
    const connectedCalls = await CallLog.countDocuments({ companyId, status: 'Connected' });
    const connectionRate = totalCalls > 0 ? `${Math.round((connectedCalls / totalCalls) * 100)}%` : '0%';

    res.status(200).json({
      success: true,
      stats: {
        totalCalls,
        connectedCalls,
        connectionRate
      },
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      },
      data: logs.map(l => ({
        ...l,
        id: l._id,
        agent: l.callerName || 'Sales Executive',
        customer: l.clientName,
        phone: l.clientPhone,
        type: l.direction || 'Outbound',
        status: l.status === 'Connected' ? 'Connected / Answered' : `${l.status} / No Answer`,
        duration: l.durationSeconds > 0 ? `${Math.floor(l.durationSeconds / 60)}m ${l.durationSeconds % 60}s` : '0m 0s',
        time: l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recent',
        outcome: l.notes || 'Inquiry discussed'
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Log a new call
// @route   POST /api/company-admin/calling
// @access  Private (company_admin)
export const createCallLog = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { clientName, clientPhone, callerName, direction, durationSeconds, status, notes, recordingUrl } = req.body;

    if (!clientName || !clientPhone) {
      return res.status(400).json({ success: false, message: 'Client name and phone are required' });
    }

    const call = await CallLog.create({
      companyId,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      callerName: callerName || req.user.name || 'Sales Executive',
      direction: direction || 'Outbound',
      durationSeconds: Number(durationSeconds) || 60,
      status: status || 'Connected',
      notes: notes || '',
      recordingUrl: recordingUrl || ''
    });

    res.status(201).json({
      success: true,
      message: 'Call log registered successfully!',
      data: call
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

