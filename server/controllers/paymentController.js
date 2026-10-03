import { PaymentSession } from '../models/PaymentSession.js';
import { CustomerTransaction } from '../models/CustomerTransaction.js';
import { AuditLog } from '../models/AuditLog.js';
import { buildUpiString, generateQrDataUrl, splitBillAmount } from '../utils/upi.js';
import { pushPaymentEvent, pushCustomerEvent } from '../sse.js';
import {
  createSliceQrCode,
  getActiveGateway,
  verifyRazorpaySignature,
} from '../services/gatewayService.js';

/** Shared helper: mark a slice as PAID and update session totals */
async function markSlicePaid(session, slice, rrn, paidVia) {
  slice.status = 'PAID';
  slice.bankRrn = rrn;
  slice.paidAt = new Date();
  slice.paidVia = paidVia || 'UPI';

  const paidSlices = session.slices.filter((s) => s.status === 'PAID');
  const totalPaid = paidSlices.reduce((sum, s) => sum + s.amount, 0);

  session.amountPaid = Math.round(totalPaid * 100) / 100;
  session.remainingAmount = Math.max(
    0,
    Math.round((session.totalAmount - session.amountPaid) * 100) / 100
  );
  session.completedSlices = paidSlices.length;
  session.status =
    session.completedSlices === session.totalSlices || session.remainingAmount <= 0
      ? 'COMPLETED'
      : 'PARTIAL';

  await session.save();

  // Keep customer transaction in sync
  await CustomerTransaction.findOneAndUpdate(
    { sessionId: session.sessionId, vendorId: session.vendorId },
    {
      amountPaid: session.amountPaid,
      remainingAmount: session.remainingAmount,
      status: session.status === 'COMPLETED' ? 'COMPLETED' : session.status === 'PARTIAL' ? 'PARTIAL' : 'PENDING',
      ...(session.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
    }
  );

  // ── Instant SSE push ──────────────────────────────────────────────────────
  // Fires IMMEDIATELY after DB save — vendor & customer browsers get green tick right away
  const eventPayload = {
    type: 'SLICE_PAID',
    sessionId: session.sessionId,
    sliceId: slice.sliceId,
    sliceIndex: slice.sliceIndex,
    amount: slice.amount,
    bankRrn: slice.bankRrn,
    paidAt: slice.paidAt,
    sessionStatus: session.status,
    amountPaid: session.amountPaid,
    remainingAmount: session.remainingAmount,
    completedSlices: session.completedSlices,
    totalSlices: session.totalSlices,
    isFullyComplete: session.status === 'COMPLETED',
  };

  pushPaymentEvent(session.sessionId, eventPayload);

  if (session.customerPhone) {
    pushCustomerEvent(session.customerPhone, eventPayload);
  }

  return session;
}

function generateSessionId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${dateStr}-${rand}`;
}

export async function createPaymentSession(req, res) {
  try {
    const {
      totalAmount,
      paymentNote,
      customMaxQrLimit,
      splitCount,
      customerName,
      customerPhone,
      customerEmail,
    } = req.body;

    const vendor = req.user;
    const amount = Number(totalAmount);

    if (!amount || amount <= 0)
      return res.status(400).json({ error: 'Please enter a valid bill amount greater than 0.' });

    if (!vendor.upiId)
      return res.status(400).json({
        error: 'No UPI ID configured. Please update your profile with a valid UPI ID first.',
      });

    const effectiveLimit =
      customMaxQrLimit && Number(customMaxQrLimit) > 0
        ? Number(customMaxQrLimit)
        : vendor.maxQrAmount || Number(process.env.DEFAULT_MAX_QR_AMOUNT) || 1999;

    const sliceAmounts = splitBillAmount(amount, effectiveLimit, splitCount);
    const sessionId = generateSessionId();

    const slices = [];
    for (let i = 0; i < sliceAmounts.length; i++) {
      const sliceIdx = i + 1;
      const sliceAmount = sliceAmounts[i];
      const sliceId = `QR-${String(sliceIdx).padStart(2, '0')}`;
      const transactionRef = `TXN-${sessionId}-${sliceIdx}-${Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase()}`;

      const qrData = await createSliceQrCode({
        amount: sliceAmount,
        sessionId,
        sliceId,
        sliceIndex: sliceIdx,
        totalSlices: sliceAmounts.length,
        vendor,
        transactionRef,
        paymentNote,
      });

      slices.push({
        sliceId,
        sliceIndex: sliceIdx,
        amount: sliceAmount,
        upiString: qrData.upiString,
        qrCodeDataUrl: qrData.qrCodeDataUrl,
        transactionRef,
        gatewayName: qrData.gateway,
        gatewayQrId: qrData.gatewayQrId || '',
        status: 'PENDING',
        scanCount: 0,
      });
    }

    const expiresAt = new Date(
      Date.now() + (Number(process.env.QR_EXPIRY_HOURS) || 24) * 60 * 60 * 1000
    );

    const session = new PaymentSession({
      sessionId,
      vendorId: vendor.vendorId,
      vendorName: vendor.businessName || vendor.username,
      payeeName: vendor.payeeName || vendor.businessName || vendor.username,
      upiId: vendor.upiId,
      totalAmount: amount,
      amountPaid: 0,
      remainingAmount: amount,
      maxQrLimit: effectiveLimit,
      totalSlices: slices.length,
      completedSlices: 0,
      paymentNote: paymentNote || '',
      customerName: customerName ? customerName.trim() : '',
      customerPhone: customerPhone ? customerPhone.trim() : '',
      customerEmail: customerEmail ? customerEmail.trim() : '',
      status: 'PENDING',
      slices,
      expiresAt,
    });

    await session.save();

    // Save customer info linked to this session
    await CustomerTransaction.create({
      vendorId: vendor.vendorId,
      sessionId,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      customerNote: paymentNote || '',
      totalAmount: amount,
      amountPaid: 0,
      remainingAmount: amount,
      status: 'PENDING',
    });

    await AuditLog.create({
      action: 'PAYMENT_SESSION_CREATED',
      performedBy: vendor.username,
      role: 'vendor',
      vendorId: vendor.vendorId,
      details: {
        sessionId,
        totalAmount: amount,
        totalSlices: slices.length,
        maxLimit: effectiveLimit,
        customerName: customerName || 'Anonymous',
        customerPhone: customerPhone || '',
      },
    });

    if (session.customerPhone) {
      pushCustomerEvent(session.customerPhone, {
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
          customerPhone: session.customerPhone,
          createdAt: session.createdAt,
          slices: session.slices,
        },
      });
    }

    return res.status(201).json({ message: 'Payment session created successfully', session });
  } catch (err) {
    console.error('createPaymentSession error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create payment session' });
  }
}

export async function getPaymentSession(req, res) {
  try {
    const { sessionId } = req.params;
    const vendorId = req.user.vendorId;

    // Vendors can only view their own sessions
    const session = await PaymentSession.findOne({ sessionId, vendorId });
    if (!session)
      return res.status(404).json({ error: 'Payment session not found.' });

    // Auto-sync with Razorpay if pending slice has Razorpay link ID
    if (session.status !== 'COMPLETED' && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      const authHeader =
        'Basic ' +
        Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');

      for (const slice of session.slices) {
        if (slice.status !== 'PAID' && slice.gatewayQrId && slice.gatewayQrId.startsWith('plink_')) {
          try {
            const checkRes = await fetch(`https://api.razorpay.com/v1/payment_links/${slice.gatewayQrId}`, {
              headers: { Authorization: authHeader },
            });
            if (checkRes.ok) {
              const linkData = await checkRes.json();
              if (linkData.status === 'paid') {
                const rrn = linkData.payments?.[0]?.payment_id || `RZP-${Date.now()}`;
                await markSlicePaid(session, slice, rrn, 'Razorpay Dynamic UPI');
                console.log(`[AutoSync] Verified paid slice ${slice.sliceId} for session ${sessionId}`);
              }
            }
          } catch (syncErr) {
            console.error('[AutoSync] Error checking link status:', syncErr.message);
          }
        }
      }
    }

    // Attach customer info
    const customer = await CustomerTransaction.findOne({ sessionId, vendorId });

    // Enrich slices with computed active state
    let firstPendingFound = false;
    const enrichedSlices = session.slices.map((slice, index) => {
      const isPaid = slice.status === 'PAID';
      const isUnlocked = true;
      let isCurrentActive = false;
      if (!firstPendingFound && !isPaid) {
        isCurrentActive = true;
        firstPendingFound = true;
      }
      return {
        _id: slice._id,
        sliceId: slice.sliceId,
        sliceIndex: slice.sliceIndex,
        amount: slice.amount,
        status: slice.status,
        transactionRef: slice.transactionRef,
        bankRrn: slice.bankRrn,
        paidAt: slice.paidAt,
        paidVia: slice.paidVia,
        isUnlocked: true,
        isCurrentActive,
        isPaid,
        isLocked: false,
        qrCodeDataUrl: slice.qrCodeDataUrl,
        upiString: slice.upiString,
      };
    });

    return res.json({
      sessionId: session.sessionId,
      vendorId: session.vendorId,
      vendorName: session.vendorName,
      payeeName: session.payeeName,
      upiId: session.upiId,
      totalAmount: session.totalAmount,
      amountPaid: session.amountPaid,
      remainingAmount: session.remainingAmount,
      maxQrLimit: session.maxQrLimit,
      totalSlices: session.totalSlices,
      completedSlices: session.completedSlices,
      paymentNote: session.paymentNote,
      status: session.status,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      slices: enrichedSlices,
      customer: customer
        ? {
            customerName: customer.customerName,
            customerPhone: customer.customerPhone,
            customerEmail: customer.customerEmail,
            customerNote: customer.customerNote,
          }
        : null,
    });
  } catch (err) {
    console.error('getPaymentSession error:', err);
    return res.status(500).json({ error: 'Failed to load payment session' });
  }
}

export async function verifySlicePayment(req, res) {
  try {
    const { sessionId, sliceId, bankRrn, paidVia = 'UPI Direct' } = req.body;
    const vendorId = req.user.vendorId;

    if (!sessionId || !sliceId)
      return res.status(400).json({ error: 'Session ID and Slice ID are required.' });

    const session = await PaymentSession.findOne({ sessionId, vendorId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const slice = session.slices.find(
      (s) => s.sliceId === sliceId || s.transactionRef === sliceId
    );
    if (!slice) return res.status(404).json({ error: 'Slice not found' });

    if (slice.status === 'PAID')
      return res.status(400).json({ error: 'Already paid.', alreadyPaid: true, paidAt: slice.paidAt });

    const rrn = bankRrn?.trim().length >= 6
      ? bankRrn.trim()
      : `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    await markSlicePaid(session, slice, rrn, paidVia);

    await AuditLog.create({
      action: 'PAYMENT_SLICE_VERIFIED',
      performedBy: req.user.username,
      role: 'vendor',
      vendorId,
      details: { sessionId, sliceId: slice.sliceId, amount: slice.amount, bankRrn: rrn, sessionStatus: session.status },
    });

    return res.json({
      message: `Payment verified!`,
      sessionStatus: session.status,
      amountPaid: session.amountPaid,
      remainingAmount: session.remainingAmount,
      completedSlices: session.completedSlices,
      isFullyComplete: session.status === 'COMPLETED',
      slice: { sliceId: slice.sliceId, amount: slice.amount, status: 'PAID', bankRrn: rrn, paidAt: slice.paidAt },
    });
  } catch (err) {
    console.error('verifySlicePayment error:', err);
    return res.status(500).json({ error: 'Failed to verify payment' });
  }
}

/**
 * simulatePaymentWebhook — called by real UPI gateways (Razorpay, PhonePe, Paytm)
 * via HTTP POST with transaction reference and status.
 * Also used by the frontend "Simulate" button for demo/testing.
 *
 * Real gateway payload format varies:
 *   Razorpay:  { razorpay_payment_id, razorpay_order_id, status }
 *   PhonePe:   { transactionId, merchantTransactionId, responseCode }
 *   Paytm:     { TXNID, ORDERID, STATUS }
 *
 * We normalise using transactionRef field which we embed inside UPI notes.
 */
export async function simulatePaymentWebhook(req, res) {
  try {
    const body = req.body || {};

    // 1. Direct sliceId + sessionId (used by demo simulate button)
    if (body.sessionId && body.sliceId) {
      const session = await PaymentSession.findOne({ sessionId: body.sessionId });
      if (!session) return res.status(404).json({ error: 'Session not found' });
      const slice = session.slices.find((s) => s.sliceId === body.sliceId);
      if (!slice) return res.status(404).json({ error: 'Slice not found' });
      if (slice.status === 'PAID') {
        return res.json({ received: true, alreadyPaid: true, sliceId: slice.sliceId, sessionId: session.sessionId });
      }
      const bankRrn = body.bankRrn || `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      await markSlicePaid(session, slice, bankRrn, 'UPI Direct Webhook');
      return res.json({
        received: true,
        sessionId: session.sessionId,
        sliceId: slice.sliceId,
        sessionStatus: session.status,
        amountPaid: session.amountPaid,
        isFullyComplete: session.status === 'COMPLETED',
      });
    }

    // 2. Gateway format: transactionRef embedded in UPI note
    const transactionRef =
      body.transactionRef ||
      body.razorpay_order_id ||
      body.merchantTransactionId ||
      body.ORDERID ||
      body.order_id;

    if (transactionRef) {
      const session = await PaymentSession.findOne({ 'slices.transactionRef': transactionRef });
      if (session) {
        const slice = session.slices.find((s) => s.transactionRef === transactionRef);
        if (slice && slice.status !== 'PAID') {
          const bankRrn =
            body.bankRrn ||
            body.razorpay_payment_id ||
            body.transactionId ||
            `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;
          await markSlicePaid(session, slice, bankRrn, 'UPI Gateway Webhook');
          return res.json({
            received: true,
            sessionId: session.sessionId,
            sliceId: slice.sliceId,
            sessionStatus: session.status,
            amountPaid: session.amountPaid,
            isFullyComplete: session.status === 'COMPLETED',
          });
        }
      }
    }

    // 3. Android Notification Forwarder Format (Google Pay / PhonePe / Paytm / Bank SMS)
    // Extracts amount and UTR from notification text or body
    const rawText = `${body.title || ''} ${body.text || ''} ${body.message || ''} ${body.notification || ''} ${JSON.stringify(body)}`;

    // Extract amount: e.g. "Received ₹500.00", "Credited Rs. 1000", "INR 1.00", or explicit body.amount
    let amount = Number(body.amount) || 0;
    if (!amount) {
      const amtMatch =
        rawText.match(/(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)/i) ||
        rawText.match(/received\s+([\d,]+(?:\.\d+)?)/i);
      if (amtMatch) {
        amount = parseFloat(amtMatch[1].replace(/,/g, ''));
      }
    }

    // Extract UTR / RRN (10 to 12 digits):
    const utrMatch =
      rawText.match(/(?:UPI\s*Ref|Ref|RRN|UTR|Txn)[\s:no#.]*(\d{10,12})/i) ||
      rawText.match(/\b(\d{12})\b/);
    const bankRrn = utrMatch
      ? utrMatch[1]
      : body.bankRrn || `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    // Find the active session waiting for this payment
    let session = null;
    let slice = null;

    if (amount > 0) {
      // Find latest pending session that has a slice matching this amount
      session = await PaymentSession.findOne({
        status: { $in: ['PENDING', 'PARTIAL'] },
        'slices.amount': amount,
        'slices.status': 'PENDING',
      }).sort({ createdAt: -1 });

      if (session) {
        slice = session.slices.find((s) => s.status === 'PENDING' && s.amount === amount);
      }
    }

    // Fallback: match first pending slice of the latest active session
    if (!session) {
      session = await PaymentSession.findOne({
        status: { $in: ['PENDING', 'PARTIAL'] },
      }).sort({ createdAt: -1 });

      if (session) {
        slice = session.slices.find((s) => s.status === 'PENDING');
      }
    }

    if (session && slice) {
      await markSlicePaid(session, slice, bankRrn, 'UPI Notification Webhook');
      console.log(
        `[Notification Webhook] Verified: ₹${slice.amount} (Ref: ${bankRrn}) -> Session ${session.sessionId} Slice ${slice.sliceId}`
      );
      return res.json({
        received: true,
        autoMatched: true,
        sessionId: session.sessionId,
        sliceId: slice.sliceId,
        amount: slice.amount,
        bankRrn,
        sessionStatus: session.status,
        isFullyComplete: session.status === 'COMPLETED',
      });
    }

    return res.json({ received: true, message: 'Webhook received, but no active pending session matched.' });
  } catch (err) {
    console.error('simulatePaymentWebhook error:', err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
}

export async function getVendorCustomers(req, res) {
  try {
    const vendorId = req.user.vendorId;
    const { status, search, limit = 50, page = 1 } = req.query;

    let query = { vendorId };
    if (status) query.status = status;
    if (search) {
      const r = new RegExp(search, 'i');
      query.$or = [{ customerName: r }, { customerPhone: r }, { sessionId: r }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const customers = await CustomerTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await CustomerTransaction.countDocuments(query);

    return res.json({
      customers,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve customer list' });
  }
}

/**
 * Public endpoint: Customer loads the payment session by scanning the QR code
 * No login/token required.
 */
export async function getPublicPaymentSession(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await PaymentSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Payment session not found or expired.' });
    }

    let firstPendingFound = false;
    const slices = session.slices.map((slice) => {
      const isPaid = slice.status === 'PAID';
      let isCurrentActive = false;
      if (!firstPendingFound && !isPaid) {
        isCurrentActive = true;
        firstPendingFound = true;
      }
      return {
        sliceId: slice.sliceId,
        sliceIndex: slice.sliceIndex,
        amount: slice.amount,
        status: slice.status,
        isPaid,
        isCurrentActive,
        upiString: slice.upiString,
        transactionRef: slice.transactionRef,
        bankRrn: slice.bankRrn,
        paidAt: slice.paidAt,
      };
    });

    return res.json({
      sessionId: session.sessionId,
      vendorName: session.vendorName || session.payeeName,
      payeeName: session.payeeName,
      totalAmount: session.totalAmount,
      amountPaid: session.amountPaid,
      remainingAmount: session.remainingAmount,
      totalSlices: session.totalSlices,
      completedSlices: session.completedSlices,
      status: session.status,
      paymentNote: session.paymentNote,
      slices,
    });
  } catch (err) {
    console.error('getPublicPaymentSession error:', err);
    return res.status(500).json({ error: 'Failed to load payment session' });
  }
}

/**
 * Public endpoint: Customer's phone confirms that a portion was paid
 * Triggers instant real-time SSE push to the vendor's screen!
 */
export async function confirmCustomerPayment(req, res) {
  try {
    const { sessionId, sliceId, bankRrn } = req.body;
    if (!sessionId || !sliceId) {
      return res.status(400).json({ error: 'sessionId and sliceId are required.' });
    }

    const session = await PaymentSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found.' });

    const slice = session.slices.find((s) => s.sliceId === sliceId);
    if (!slice) return res.status(404).json({ error: 'Slice not found.' });

    if (slice.status === 'PAID') {
      return res.json({
        message: 'Already paid',
        alreadyPaid: true,
        sessionStatus: session.status,
        isFullyComplete: session.status === 'COMPLETED',
      });
    }

    const rrn =
      bankRrn && String(bankRrn).trim().length >= 6
        ? String(bankRrn).trim()
        : `UPI-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    await markSlicePaid(session, slice, rrn, 'Customer Smart Pay');
    console.log(`[Smart Pay] Slice ${sliceId} of ${sessionId} confirmed! Session: ${session.status}`);

    return res.json({
      message: 'Payment confirmed successfully!',
      sessionId: session.sessionId,
      sliceId: slice.sliceId,
      amount: slice.amount,
      bankRrn: rrn,
      sessionStatus: session.status,
      amountPaid: session.amountPaid,
      remainingAmount: session.remainingAmount,
      completedSlices: session.completedSlices,
      isFullyComplete: session.status === 'COMPLETED',
    });
  } catch (err) {
    console.error('confirmCustomerPayment error:', err);
    return res.status(500).json({ error: 'Failed to confirm payment' });
  }
}

/**
 * Razorpay Dedicated Webhook Handler
 * Called automatically by Razorpay when customer scans QR in GPay/PhonePe and pays
 */
export async function handleRazorpayWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify signature if secret configured
    if (secret && signature) {
      const isValid = verifyRazorpaySignature(req.rawBody || JSON.stringify(req.body), signature, secret);
      if (!isValid) {
        console.warn('[Razorpay Webhook] Invalid signature rejected');
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    // Razorpay sends 'payment_link.paid', 'qr_code.credited', or 'payment.captured'
    const payload = req.body.payload || {};
    const payment = payload.payment?.entity || {};
    const qrEntity = payload.qr_code?.entity || {};
    const plinkEntity = payload.payment_link?.entity || {};

    const notes = payment.notes || qrEntity.notes || plinkEntity.notes || {};
    const sessionId = notes.sessionId;
    const sliceId = notes.sliceId;
    const qrId = qrEntity.id || payment.qr_code_id || plinkEntity.id;
    const paymentId = payment.id || `RZP-${Date.now()}`;

    let session = null;
    let slice = null;

    if (sessionId && sliceId) {
      session = await PaymentSession.findOne({ sessionId });
      if (session) {
        slice = session.slices.find((s) => s.sliceId === sliceId);
      }
    }

    // Match by gatewayQrId if notes weren't present
    if (!slice && qrId) {
      session = await PaymentSession.findOne({ 'slices.gatewayQrId': qrId });
      if (session) {
        slice = session.slices.find((s) => s.gatewayQrId === qrId);
      }
    }

    if (session && slice) {
      if (slice.status === 'PAID') {
        return res.json({ status: 'already_paid' });
      }

      await markSlicePaid(session, slice, paymentId, 'Razorpay UPI QR');
      console.log(`[Razorpay Webhook] Verified: ₹${slice.amount} (Ref: ${paymentId}) -> ${session.sessionId}`);
      return res.json({ status: 'success', sessionId: session.sessionId, sliceId: slice.sliceId });
    }

    // Fallback: Check standard simulatePaymentWebhook logic
    return simulatePaymentWebhook(req, res);
  } catch (err) {
    console.error('[Razorpay Webhook Error]:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Cashfree Dedicated Webhook Handler
 * Called automatically by Cashfree when customer scans QR and pays
 */
export async function handleCashfreeWebhook(req, res) {
  try {
    const body = req.body || {};
    console.log(`[Cashfree Webhook] Received payload:`, body.type || body.event);

    const data = body.data || {};
    const order = data.order || {};
    const payment = data.payment || {};

    const orderTags = order.order_tags || {};
    const sessionId = orderTags.sessionId;
    const sliceId = orderTags.sliceId;
    const orderId = order.order_id;
    const paymentId = payment.cf_payment_id || `CF-${Date.now()}`;

    let session = null;
    let slice = null;

    if (sessionId && sliceId) {
      session = await PaymentSession.findOne({ sessionId });
      if (session) {
        slice = session.slices.find((s) => s.sliceId === sliceId);
      }
    }

    if (!slice && orderId) {
      session = await PaymentSession.findOne({ 'slices.gatewayQrId': orderId });
      if (session) {
        slice = session.slices.find((s) => s.gatewayQrId === orderId);
      }
    }

    if (session && slice) {
      if (slice.status === 'PAID') {
        return res.json({ status: 'already_paid' });
      }

      await markSlicePaid(session, slice, paymentId, 'Cashfree Dynamic QR');
      console.log(`[Cashfree Webhook] Verified: ₹${slice.amount} (Ref: ${paymentId}) -> ${session.sessionId}`);
      return res.json({ status: 'success', sessionId: session.sessionId, sliceId: slice.sliceId });
    }

    return simulatePaymentWebhook(req, res);
  } catch (err) {
    console.error('[Cashfree Webhook Error]:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Public/Admin endpoint to check active gateway configuration
 */
export async function getGatewayStatusConfig(req, res) {
  const active = getActiveGateway();
  res.json({
    activeGateway: active,
    supportedGateways: ['RAZORPAY', 'CASHFREE', 'DIRECT_UPI'],
    instructions: {
      razorpay: 'Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET in server/.env',
      cashfree: 'Set CASHFREE_APP_ID, CASHFREE_SECRET_KEY, and CASHFREE_ENV in server/.env',
      webhookUrl: `${process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000'}/api/webhook/razorpay`,
    },
  });
}


