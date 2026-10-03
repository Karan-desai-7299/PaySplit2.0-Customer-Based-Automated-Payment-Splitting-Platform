import express from 'express';
import { login, getMe } from '../controllers/authController.js';
import {
  getAdminDashboardStats,
  listVendors,
  createVendor,
  updateVendor,
  toggleVendorStatus,
  resetVendorPassword,
  deleteVendor,
  getAllSessions,
  getAuditLogs,
} from '../controllers/adminController.js';
import {
  getVendorDashboard,
  updateVendorSettings,
  getVendorTransactions,
} from '../controllers/vendorController.js';
import {
  createPaymentSession,
  getPaymentSession,
  verifySlicePayment,
  simulatePaymentWebhook,
  getVendorCustomers,
  getPublicPaymentSession,
  confirmCustomerPayment,
  handleRazorpayWebhook,
  handleCashfreeWebhook,
  getGatewayStatusConfig,
} from '../controllers/paymentController.js';
import {
  submitVendorRequest,
  checkVendorRequestStatus,
  listVendorRequests,
  approveVendorRequest,
  rejectVendorRequest,
} from '../controllers/requestController.js';
import {
  sendMessage,
  getMessages,
  getChatThreads,
  streamChat,
} from '../controllers/chatController.js';
import {
  customerLogin,
  getCustomerHistory,
  getCustomerActiveBill,
  streamCustomer,
  shareBillWithCustomer,
} from '../controllers/customerController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { streamPaymentSession } from '../controllers/sseController.js';

const router = express.Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login', login);
router.post('/auth/customer-login', customerLogin);
router.get('/auth/me', authenticateToken, getMe);

// ─── Customer Portal (PaySplit 2.0) ───────────────────────────────────────────
router.get('/customer/history', authenticateToken, getCustomerHistory);
router.get('/customer/active-bill', authenticateToken, getCustomerActiveBill);
router.get('/customer/stream/:phone', streamCustomer);

// ─── Public: Customer Scan-to-Pay Endpoints (Option 2) ────────────────────────
router.get('/pay/session/:sessionId', getPublicPaymentSession);
router.post('/pay/confirm', confirmCustomerPayment);

// ─── Public: Vendor Registration Requests from Landing Page ────────────────────
router.post('/requests/submit', submitVendorRequest);
router.get('/requests/status', checkVendorRequestStatus);

// ─── Public Webhooks (called by UPI gateways — no auth) ────────────────────────
// Razorpay sends webhooks here when customer scans QR in GPay/PhonePe and pays
router.post('/webhook/razorpay', handleRazorpayWebhook);
// Cashfree sends webhooks here
router.post('/webhook/cashfree', handleCashfreeWebhook);
// Generic fallback webhook
router.post('/webhook/payment', simulatePaymentWebhook);
// Check active gateway configuration
router.get('/gateway/status', getGatewayStatusConfig);

// Diagnostic endpoint to test Razorpay API response
router.get('/test-razorpay', async (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return res.json({ error: 'Razorpay keys missing in environment' });
  }

  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  
  // 1. Try QR codes API (/v1/qr_codes)
  let qrResult = null;
  try {
    const qrRes = await fetch('https://api.razorpay.com/v1/qr_codes', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'upi_qr',
        name: 'Test PaySplit QR',
        usage: 'single_use',
        fixed_amount: true,
        payment_amount: 100, // ₹1
        description: 'Test payment',
      }),
    });
    qrResult = { status: qrRes.status, data: await qrRes.json() };
  } catch (e) {
    qrResult = { error: e.message };
  }

  // 2. Try Payment Links API
  let linkResult = null;
  try {
    const linkRes = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 100,
        currency: 'INR',
        description: 'Test PaySplit Link',
      }),
    });
    linkResult = { status: linkRes.status, data: await linkRes.json() };
  } catch (e) {
    linkResult = { error: e.message };
  }

  return res.json({ qrResult, linkResult });
});

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/admin/stats',          authenticateToken, requireRole('admin'), getAdminDashboardStats);
router.get('/admin/vendors',        authenticateToken, requireRole('admin'), listVendors);
router.post('/admin/vendors',       authenticateToken, requireRole('admin'), createVendor);
router.put('/admin/vendors/:id',    authenticateToken, requireRole('admin'), updateVendor);
router.patch('/admin/vendors/:id/toggle', authenticateToken, requireRole('admin'), toggleVendorStatus);
router.post('/admin/vendors/:id/reset-password', authenticateToken, requireRole('admin'), resetVendorPassword);
router.delete('/admin/vendors/:id', authenticateToken, requireRole('admin'), deleteVendor);
router.get('/admin/sessions',       authenticateToken, requireRole('admin'), getAllSessions);
router.get('/admin/logs',           authenticateToken, requireRole('admin'), getAuditLogs);

// Admin: Vendor requests review & approval
router.get('/admin/requests',              authenticateToken, requireRole('admin'), listVendorRequests);
router.post('/admin/requests/:id/approve', authenticateToken, requireRole('admin'), approveVendorRequest);
router.post('/admin/requests/:id/reject',  authenticateToken, requireRole('admin'), rejectVendorRequest);

// Admin: Chat threads
router.get('/admin/chat/threads', authenticateToken, requireRole('admin'), getChatThreads);

// ─── Real-Time Communication (Chat) ───────────────────────────────────────────
router.post('/chat/send',     authenticateToken, sendMessage);
router.get('/chat/messages',  authenticateToken, getMessages);
router.get('/chat/stream',    authenticateToken, streamChat);

// ─── Vendor ───────────────────────────────────────────────────────────────────
router.get('/vendor/dashboard',     authenticateToken, requireRole('vendor'), getVendorDashboard);
router.put('/vendor/settings',      authenticateToken, requireRole('vendor'), updateVendorSettings);
router.get('/vendor/transactions',  authenticateToken, requireRole('vendor'), getVendorTransactions);
router.get('/vendor/customers',     authenticateToken, requireRole('vendor'), getVendorCustomers);

// Payment sessions (vendor-scoped)
router.post('/vendor/sessions',            authenticateToken, requireRole('vendor'), createPaymentSession);
router.get('/vendor/sessions/:sessionId',  authenticateToken, requireRole('vendor'), getPaymentSession);
// Vendor shares bill directly to customer's mobile screen (triggers live popoff)
router.post('/vendor/sessions/:sessionId/share', authenticateToken, requireRole('vendor'), shareBillWithCustomer);
// Real-time SSE stream — vendor browser listens here for instant payment events
router.get('/vendor/stream/:sessionId',    authenticateToken, requireRole('vendor'), streamPaymentSession);
// Manual verify kept for admin/fallback use
router.post('/vendor/verify',              authenticateToken, requireRole('vendor'), verifySlicePayment);

export default router;
