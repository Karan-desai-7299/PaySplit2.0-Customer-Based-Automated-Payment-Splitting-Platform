import { User } from '../models/User.js';
import { PaymentSession } from '../models/PaymentSession.js';
import { CustomerTransaction } from '../models/CustomerTransaction.js';
import { AuditLog } from '../models/AuditLog.js';
import { signToken } from '../middleware/auth.js';
import { addCustomerListener, removeCustomerListener, pushCustomerEvent } from '../sse.js';

function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '').slice(-10);
}

/**
 * POST /api/auth/customer-login
 * Direct passwordless login for customers using mobile number
 */
export async function customerLogin(req, res) {
  try {
    const { phone, name } = req.body;
    const cleanPhone = normalizePhone(phone);

    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    let user = await User.findOne({ phone: cleanPhone, role: 'customer' });

    if (!user) {
      // First time customer: create customer profile
      user = new User({
        username: `cust_${cleanPhone}`,
        phone: cleanPhone,
        payeeName: name?.trim() || `Customer ${cleanPhone.slice(-4)}`,
        role: 'customer',
        password: `cust_${cleanPhone}_${Date.now()}`,
        isActive: true,
      });
      await user.save();
    } else {
      if (name?.trim()) {
        user.payeeName = name.trim();
      }
      user.lastLogin = new Date();
      await user.save();
    }

    await AuditLog.create({
      action: 'CUSTOMER_LOGIN',
      performedBy: user.phone,
      role: 'customer',
      details: { phone: cleanPhone, name: user.payeeName },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
    });

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        phone: user.phone,
        name: user.payeeName,
        payeeName: user.payeeName,
      },
    });
  } catch (err) {
    console.error('Customer login error:', err);
    return res.status(500).json({ error: 'Server error during customer login.' });
  }
}

/**
 * GET /api/customer/history
 * Retrieve all payment transactions and receipts for this customer
 */
export async function getCustomerHistory(req, res) {
  try {
    const phone = req.user?.phone || req.query.phone;
    const cleanPhone = normalizePhone(phone);

    if (!cleanPhone) {
      return res.status(400).json({ error: 'Customer mobile number required.' });
    }

    // Find all payment sessions matching customer mobile
    const sessions = await PaymentSession.find({
      customerPhone: { $regex: cleanPhone + '$' },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Summary metrics
    const totalSpent = sessions.reduce((acc, s) => acc + (s.amountPaid || 0), 0);
    const totalBills = sessions.length;
    const completedBills = sessions.filter((s) => s.status === 'COMPLETED').length;
    const pendingBills = sessions.filter((s) => s.status !== 'COMPLETED').length;

    return res.json({
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        vendorId: s.vendorId,
        vendorName: s.vendorName || s.payeeName,
        payeeName: s.payeeName,
        upiId: s.upiId,
        totalAmount: s.totalAmount,
        amountPaid: s.amountPaid,
        remainingAmount: s.remainingAmount,
        totalSlices: s.totalSlices,
        completedSlices: s.completedSlices,
        status: s.status,
        paymentNote: s.paymentNote,
        customerName: s.customerName,
        customerPhone: s.customerPhone,
        createdAt: s.createdAt,
        slices: s.slices.map((slice) => ({
          sliceId: slice.sliceId,
          sliceIndex: slice.sliceIndex,
          amount: slice.amount,
          status: slice.status,
          bankRrn: slice.bankRrn,
          paidAt: slice.paidAt,
          upiString: slice.upiString,
          qrCodeDataUrl: slice.qrCodeDataUrl,
        })),
      })),
      stats: {
        totalSpent,
        totalBills,
        completedBills,
        pendingBills,
      },
    });
  } catch (err) {
    console.error('getCustomerHistory error:', err);
    return res.status(500).json({ error: 'Failed to retrieve payment history.' });
  }
}

/**
 * GET /api/customer/active-bill
 * Check if vendor has shared an active bill currently waiting for payment
 */
export async function getCustomerActiveBill(req, res) {
  try {
    const phone = req.user?.phone || req.query.phone;
    const cleanPhone = normalizePhone(phone);

    if (!cleanPhone) {
      return res.json({ activeBill: null });
    }

    // Find latest pending or partial bill created in the last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const session = await PaymentSession.findOne({
      customerPhone: { $regex: cleanPhone + '$' },
      status: { $in: ['PENDING', 'PARTIAL'] },
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!session) {
      return res.json({ activeBill: null });
    }

    return res.json({
      activeBill: {
        sessionId: session.sessionId,
        vendorName: session.vendorName || session.payeeName,
        payeeName: session.payeeName,
        upiId: session.upiId,
        totalAmount: session.totalAmount,
        amountPaid: session.amountPaid,
        remainingAmount: session.remainingAmount,
        totalSlices: session.totalSlices,
        completedSlices: session.completedSlices,
        status: session.status,
        paymentNote: session.paymentNote,
        customerName: session.customerName,
        customerPhone: session.customerPhone,
        createdAt: session.createdAt,
        slices: session.slices.map((slice) => ({
          sliceId: slice.sliceId,
          sliceIndex: slice.sliceIndex,
          amount: slice.amount,
          status: slice.status,
          isPaid: slice.status === 'PAID',
          bankRrn: slice.bankRrn,
          paidAt: slice.paidAt,
          upiString: slice.upiString,
          qrCodeDataUrl: slice.qrCodeDataUrl,
        })),
      },
    });
  } catch (err) {
    console.error('getCustomerActiveBill error:', err);
    return res.status(500).json({ error: 'Failed to check active bill.' });
  }
}

/**
 * GET /api/customer/stream/:phone
 * Persistent SSE stream for customer — receives real-time bill popoff and payment green ticks
 */
export function streamCustomer(req, res) {
  const { phone } = req.params;
  const cleanPhone = normalizePhone(phone);

  if (!cleanPhone) {
    return res.status(400).end();
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', phone: cleanPhone })}\n\n`);

  const pingInterval = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      clearInterval(pingInterval);
    }
  }, 20_000);

  addCustomerListener(cleanPhone, res);

  req.on('close', () => {
    clearInterval(pingInterval);
    removeCustomerListener(cleanPhone, res);
    console.log(`[SSE] Customer disconnected: ${cleanPhone}`);
  });
}

/**
 * POST /api/vendor/sessions/:sessionId/share
 * Vendor shares bill to customer's mobile number, triggering the instant popoff
 */
export async function shareBillWithCustomer(req, res) {
  try {
    const { sessionId } = req.params;
    const { customerPhone, customerName } = req.body;
    const vendorId = req.user.vendorId;

    const cleanPhone = normalizePhone(customerPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit customer mobile number.' });
    }

    const session = await PaymentSession.findOne({ sessionId, vendorId });
    if (!session) {
      return res.status(404).json({ error: 'Payment session not found.' });
    }

    session.customerPhone = cleanPhone;
    if (customerName?.trim()) {
      session.customerName = customerName.trim();
    }
    await session.save();

    // Sync CustomerTransaction record
    await CustomerTransaction.findOneAndUpdate(
      { sessionId, vendorId },
      {
        customerPhone: cleanPhone,
        ...(customerName?.trim() ? { customerName: customerName.trim() } : {}),
      },
      { upsert: true }
    );

    // Push real-time event to customer's screen
    const payload = {
      type: 'BILL_SHARED',
      session: {
        sessionId: session.sessionId,
        vendorName: session.vendorName || session.payeeName,
        payeeName: session.payeeName,
        upiId: session.upiId,
        totalAmount: session.totalAmount,
        amountPaid: session.amountPaid,
        remainingAmount: session.remainingAmount,
        totalSlices: session.totalSlices,
        completedSlices: session.completedSlices,
        status: session.status,
        paymentNote: session.paymentNote,
        customerName: session.customerName,
        customerPhone: cleanPhone,
        createdAt: session.createdAt,
        slices: session.slices.map((s) => ({
          sliceId: s.sliceId,
          sliceIndex: s.sliceIndex,
          amount: s.amount,
          status: s.status,
          upiString: s.upiString,
          qrCodeDataUrl: s.qrCodeDataUrl,
          bankRrn: s.bankRrn,
          paidAt: s.paidAt,
        })),
      },
    };

    pushCustomerEvent(cleanPhone, payload);

    return res.json({
      success: true,
      message: `Bill shared with customer (+91 ${cleanPhone}) successfully!`,
      customerPhone: cleanPhone,
      session,
    });
  } catch (err) {
    console.error('shareBillWithCustomer error:', err);
    return res.status(500).json({ error: 'Failed to share bill with customer.' });
  }
}
