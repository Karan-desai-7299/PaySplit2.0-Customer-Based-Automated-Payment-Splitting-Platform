import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Clock,
  IndianRupee,
  Smartphone,
  ShieldCheck,
  RotateCcw,
  Printer,
  Sparkles,
  Wifi,
  WifiOff,
  Search,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Layers,
  FileText,
  Check,
  AlertCircle,
  X,
  CreditCard,
  QrCode as QrIcon,
  Receipt,
  Store,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api, getToken, API_BASE } from '../api';

/* ─── Pleasant Soundbox Chime on Payment Verification ─────────────────────── */
function playPaymentChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.12); // A5
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {
    // Audio context may be restricted by browser policy
  }
}

export default function CustomerDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [activeBill, setActiveBill] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ totalSpent: 0, totalBills: 0, completedBills: 0 });
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [connected, setConnected] = useState(false);
  const [confirmingSliceId, setConfirmingSliceId] = useState(null);
  const [incomingAlert, setIncomingAlert] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [searchHistory, setSearchHistory] = useState('');
  const [manualSessionId, setManualSessionId] = useState('');
  const esRef = useRef(null);

  // Initial load: Fetch active bill and history
  useEffect(() => {
    fetchActiveBill();
    fetchHistory();
  }, [user.phone]);

  async function fetchActiveBill() {
    setLoadingActive(true);
    try {
      const res = await api.getCustomerActiveBill();
      if (res && res.activeBill) {
        setActiveBill(res.activeBill);
      } else {
        setActiveBill(null);
      }
    } catch (err) {
      console.error('Error fetching active bill:', err);
    } finally {
      setLoadingActive(false);
    }
  }

  async function fetchHistory() {
    setLoadingHistory(true);
    try {
      const res = await api.getCustomerHistory();
      if (res) {
        setHistory(res.sessions || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }

  // Real-time SSE listener for customer mobile number
  useEffect(() => {
    if (!user?.phone) return;
    const cleanPhone = String(user.phone).replace(/\D/g, '').slice(-10);
    const streamBase = API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`;
    const url = `${streamBase}/customer/stream/${cleanPhone}`;

    let es = null;
    try {
      es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'CONNECTED') {
            setConnected(true);
            return;
          }

          if (data.type === 'BILL_SHARED') {
            // New bill shared by vendor! Trigger incoming popoff modal
            playPaymentChime();
            setActiveBill(data.session);
            setIncomingAlert(data.session);
            setActiveTab('active');
          }

          if (data.type === 'SLICE_PAID') {
            playPaymentChime();

            setActiveBill((prev) => {
              if (!prev || prev.sessionId !== data.sessionId) return prev;
              const updatedSlices = prev.slices.map((s) =>
                s.sliceId === data.sliceId
                  ? { ...s, status: 'PAID', isPaid: true, bankRrn: data.bankRrn, paidAt: data.paidAt }
                  : s
              );
              return {
                ...prev,
                slices: updatedSlices,
                amountPaid: data.amountPaid,
                remainingAmount: data.remainingAmount,
                completedSlices: data.completedSlices,
                status: data.sessionStatus,
              };
            });

            // Refresh history in background
            fetchHistory();

            if (data.isFullyComplete) {
              confetti({ particleCount: 160, spread: 85, origin: { y: 0.45 } });
            }
          }

          if (data.type === 'BILL_COMPLETED') {
            confetti({ particleCount: 180, spread: 90, origin: { y: 0.45 } });
            fetchHistory();
          }
        } catch (e) {
          console.error('Customer SSE parse error', e);
        }
      };

      es.onerror = () => {
        setConnected(false);
      };
    } catch (e) {
      console.warn('Customer SSE failed', e);
    }

    // Polling fallback every 3s
    const pollInterval = setInterval(() => {
      fetchActiveBill();
    }, 3500);

    return () => {
      if (es) es.close();
      esRef.current = null;
      clearInterval(pollInterval);
    };
  }, [user?.phone]);

  // When customer clicks "I Have Paid / Confirm Payment"
  async function handleConfirmSlicePayment(sliceId) {
    if (!activeBill) return;
    setConfirmingSliceId(sliceId);
    try {
      const res = await api.confirmCustomerPayment({
        sessionId: activeBill.sessionId,
        sliceId,
      });

      playPaymentChime();

      setActiveBill((prev) => {
        if (!prev) return null;
        const updatedSlices = prev.slices.map((s) =>
          s.sliceId === sliceId
            ? { ...s, status: 'PAID', isPaid: true, bankRrn: res.bankRrn, paidAt: new Date() }
            : s
        );
        return {
          ...prev,
          slices: updatedSlices,
          amountPaid: res.amountPaid,
          remainingAmount: res.remainingAmount,
          completedSlices: res.completedSlices,
          status: res.sessionStatus,
        };
      });

      fetchHistory();

      if (res.isFullyComplete) {
        confetti({ particleCount: 180, spread: 85, origin: { y: 0.45 } });
      }
    } catch (err) {
      alert(err.message || 'Payment confirmation failed');
    } finally {
      setConfirmingSliceId(null);
    }
  }

  // Load manual session ID if customer entered one
  async function handleLoadManualSession(e) {
    e.preventDefault();
    if (!manualSessionId.trim()) return;
    try {
      const res = await api.getPaymentSessionPublic(manualSessionId.trim());
      if (res) {
        setActiveBill(res);
        setActiveTab('active');
        setManualSessionId('');
      }
    } catch (err) {
      alert(err.message || 'Could not load bill session');
    }
  }

  const isCompleted = activeBill && activeBill.status === 'COMPLETED';
  const progressPercent = activeBill
    ? Math.min(100, Math.round((activeBill.amountPaid / activeBill.totalAmount) * 100))
    : 0;

  const filteredHistory = history.filter((h) => {
    if (!searchHistory.trim()) return true;
    const q = searchHistory.toLowerCase();
    return (
      (h.vendorName && h.vendorName.toLowerCase().includes(q)) ||
      (h.sessionId && h.sessionId.toLowerCase().includes(q)) ||
      (h.paymentNote && h.paymentNote.toLowerCase().includes(q)) ||
      String(h.totalAmount).includes(q)
    );
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-300">
      {/* ── Top Header & Greeting ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Portal</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono">
              📱 +91 {user?.phone}
            </span>
            <span
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                connected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {connected ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-500" /> Live Sync
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-500" /> Connecting…
                </>
              )}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-bold text-slate-800">{user?.name || 'Customer'}</span>. View live shared bills and your complete payment history.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl shrink-0">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'active'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Active Bill & Pay</span>
            {activeBill && !isCompleted && (
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Payment History</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
              {history.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── Real-Time Incoming Bill Popoff Modal (Vendor -> Customer) ── */}
      {incomingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-blue-500 relative text-center">
            <button
              onClick={() => setIncomingAlert(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-blue-50 border-4 border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-3 shadow-inner animate-bounce">
              <Smartphone className="w-8 h-8" />
            </div>

            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[11px] uppercase tracking-wider inline-block mb-2">
              🔔 New Bill Shared to You!
            </span>

            <h3 className="text-xl font-black text-slate-900">
              {incomingAlert.vendorName || incomingAlert.payeeName || 'Vendor'}
            </h3>
            {incomingAlert.paymentNote && (
              <p className="text-xs text-slate-500 mt-0.5">Note: {incomingAlert.paymentNote}</p>
            )}

            <div className="my-4 p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-center">
              <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Bill Amount</p>
              <p className="text-4xl font-black text-blue-700 tracking-tight mt-0.5">
                ₹{Number(incomingAlert.totalAmount || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-blue-600 mt-1 font-mono">
                {incomingAlert.totalSlices} split portion{incomingAlert.totalSlices > 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIncomingAlert(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setIncomingAlert(null);
                  setActiveTab('active');
                }}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition cursor-pointer"
              >
                <span>View & Pay Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 1: ACTIVE BILL & LIVE PAY ── */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {activeBill ? (
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 relative overflow-hidden">
              {/* Header Accent */}
              <div
                className={`h-2.5 absolute top-0 left-0 right-0 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
              />

              {/* Top Merchant Bar */}
              <div className="pb-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-600">
                      Paying Merchant
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      {activeBill.sessionId}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                    {activeBill.payeeName || activeBill.vendorName}
                  </h2>
                  {activeBill.paymentNote && (
                    <p className="text-xs text-slate-500 mt-0.5">Note: {activeBill.paymentNote}</p>
                  )}
                  {activeBill.upiId && (
                    <p className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
                      UPI ID: {activeBill.upiId}
                    </p>
                  )}
                </div>

                <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-2xl border sm:border-0 border-slate-100">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                    Total Bill
                  </span>
                  <span className="text-3xl font-black text-slate-900 tracking-tight">
                    ₹{activeBill.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>Paid:</span>
                    <span className="text-emerald-600 font-black">
                      {activeBill.completedSlices} of {activeBill.totalSlices} Parts
                    </span>
                  </span>
                  <span className="text-blue-700 font-black">
                    ₹{activeBill.amountPaid.toLocaleString('en-IN')} / ₹{activeBill.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Split Parts / Slices Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeBill.slices?.map((slice, index) => {
                  const isSlicePaid = slice.status === 'PAID';
                  const isUnlocked = index === 0 || activeBill.slices[index - 1]?.status === 'PAID';
                  const isCurrent = !isSlicePaid && isUnlocked;

                  // UPI Deep Link for Google Pay / PhonePe
                  const upiIntentString =
                    slice.upiString ||
                    `upi://pay?pa=${activeBill.upiId}&pn=${encodeURIComponent(
                      activeBill.payeeName || 'Merchant'
                    )}&am=${slice.amount}&cu=INR&tn=${encodeURIComponent(
                      `PaySplit ${slice.sliceId}`
                    )}`;

                  return (
                    <div
                      key={slice.sliceId}
                      className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                        isSlicePaid
                          ? 'bg-emerald-50/70 border-emerald-400 shadow-xs'
                          : isCurrent
                          ? 'bg-white border-blue-600 shadow-lg ring-2 ring-blue-600/10'
                          : 'bg-slate-50/70 border-slate-200 opacity-60'
                      }`}
                    >
                      {/* Top Slice Info */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                              {slice.sliceIndex}
                            </span>
                            <span className="text-xs font-black text-slate-800">
                              Part {slice.sliceIndex} of {activeBill.totalSlices}
                            </span>
                          </div>

                          <span
                            className={`text-xl font-black ${
                              isSlicePaid ? 'text-emerald-700' : 'text-slate-900'
                            }`}
                          >
                            ₹{slice.amount.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* If Paid: Show Big Green Tick with Confirmation Details */}
                        {isSlicePaid ? (
                          <div className="py-6 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-400">
                            <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-200 mb-2">
                              <CheckCircle2 className="w-12 h-12 text-white stroke-[2.5]" />
                            </div>
                            <h4 className="text-base font-black text-emerald-800">Payment Complete ✓</h4>
                            <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                              Verified on vendor screen instantly
                            </p>
                            {slice.bankRrn && (
                              <p className="mt-2 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800">
                                Ref: {slice.bankRrn}
                              </p>
                            )}
                          </div>
                        ) : isCurrent ? (
                          /* Active Slice: Show QR + Direct UPI Button */
                          <div className="space-y-4 my-2">
                            {/* QR Code Container */}
                            <div className="flex flex-col items-center justify-center bg-slate-50 p-3 rounded-2xl border border-slate-200">
                              {slice.qrCodeDataUrl ? (
                                <img
                                  src={slice.qrCodeDataUrl}
                                  alt={`Scan to pay ₹${slice.amount}`}
                                  className="w-44 h-44 object-contain rounded-xl bg-white p-2 border border-slate-200 shadow-2xs"
                                />
                              ) : (
                                <div className="w-40 h-40 flex items-center justify-center bg-white rounded-xl">
                                  <QrIcon className="w-12 h-12 text-slate-300" />
                                </div>
                              )}
                              <p className="text-[11px] font-bold text-slate-500 mt-2">
                                Scan with any UPI app on phone
                              </p>
                            </div>

                            {/* Direct Action Buttons */}
                            <div className="space-y-2">
                              {/* 1. Direct UPI / Google Pay Intent Button */}
                              <a
                                href={upiIntentString}
                                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 transition cursor-pointer"
                              >
                                <Smartphone className="w-4 h-4" />
                                <span>Pay ₹{slice.amount} via Google Pay / UPI App</span>
                              </a>

                              {/* 2. One-tap Confirm Button (Instant Green Tick) */}
                              <button
                                onClick={() => handleConfirmSlicePayment(slice.sliceId)}
                                disabled={confirmingSliceId === slice.sliceId}
                                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                              >
                                {confirmingSliceId === slice.sliceId ? (
                                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                                    <span>I Have Paid ₹{slice.amount} ✓ (Show Green Tick)</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Locked Slice */
                          <div className="py-8 text-center text-xs text-slate-400 font-semibold flex flex-col items-center justify-center gap-1.5">
                            <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                              🔒
                            </span>
                            <span>Complete Part {index} first</span>
                          </div>
                        )}
                      </div>

                      {/* Footer Badge */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-slate-400 font-bold">{slice.sliceId}</span>
                        {isSlicePaid ? (
                          <span className="text-emerald-700 font-black">PAID ✓</span>
                        ) : isCurrent ? (
                          <span className="text-blue-600 font-bold animate-pulse">● Ready to Pay</span>
                        ) : (
                          <span className="text-slate-400 font-semibold">Locked</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* All Payments Completed Celebration View */}
              {isCompleted && (
                <div className="mt-6 p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-200 text-center animate-in zoom-in-95 duration-400">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-200">
                    <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                  </div>
                  <h3 className="font-black text-xl text-slate-900 tracking-tight">
                    All Payments Successfully Completed!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    The vendor has received your full payment of ₹
                    {activeBill.totalAmount.toLocaleString('en-IN')}. All green ticks are confirmed on both screens.
                  </p>
                  <div className="flex justify-center gap-3 mt-4">
                    <button
                      onClick={() => window.print()}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-xs hover:bg-slate-50 inline-flex items-center gap-2 transition shadow-xs cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Receipt</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveBill(null);
                        fetchHistory();
                      }}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 inline-flex items-center gap-2 transition shadow-xs cursor-pointer"
                    >
                      <span>Close Active Bill</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Security Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Encrypted direct NPCI UPI transfer · Zero intermediary hold</span>
              </div>
            </div>
          ) : (
            /* Empty State: Waiting for Vendor to Share */
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center shadow-xs">
              <div className="w-20 h-20 rounded-full bg-blue-50 border-4 border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Smartphone className="w-10 h-10" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Listening for Live Shared Bills...
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                When a vendor enters your mobile number (<span className="font-bold text-slate-800">+91 {user?.phone}</span>) and shares a bill, it will automatically appear here with UPI payment buttons and live green ticks.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Connected to Live Vendor Sync</span>
              </div>

              {/* Manual Session Search */}
              <div className="mt-8 pt-6 border-t border-slate-100 max-w-sm mx-auto">
                <p className="text-xs font-bold text-slate-500 mb-2">Have a bill session ID?</p>
                <form onSubmit={handleLoadManualSession} className="flex gap-2">
                  <input
                    type="text"
                    value={manualSessionId}
                    onChange={(e) => setManualSessionId(e.target.value)}
                    placeholder="e.g. PAY-20260924-XXXX"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
                  >
                    Open
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MY PAYMENT HISTORY ── */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Amount Paid
              </span>
              <p className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                ₹{Number(stats.totalSpent || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-emerald-600 font-bold mt-1">Verified UPI Payments</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Bills
              </span>
              <p className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                {stats.totalBills || history.length}
              </p>
              <p className="text-[11px] text-slate-500 font-bold mt-1">Associated with +91 {user?.phone}</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Completed Bills
              </span>
              <p className="text-3xl font-black text-emerald-600 tracking-tight mt-1">
                {stats.completedBills || history.filter((h) => h.status === 'COMPLETED').length}
              </p>
              <p className="text-[11px] text-emerald-600 font-bold mt-1">All Parts Paid ✓</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              placeholder="Search history by vendor name, session ID, or note…"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          {/* History List */}
          {loadingHistory ? (
            <div className="py-12 text-center">
              <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block mb-2" />
              <p className="text-xs font-bold text-slate-500">Loading payment history…</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xs">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-700 text-sm">No transaction records found</h3>
              <p className="text-xs text-slate-400 mt-1">
                Bills shared by vendors will appear in this history log automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item) => {
                const isPaidAll = item.status === 'COMPLETED';
                const createdDate = new Date(item.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={item.sessionId}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 hover:border-slate-300 transition shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isPaidAll ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {isPaidAll ? (
                          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-sm text-slate-900">
                            {item.vendorName || item.payeeName}
                          </h4>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                            {item.sessionId}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-0.5">{createdDate}</p>
                        {item.paymentNote && (
                          <p className="text-xs text-slate-600 font-medium mt-0.5">
                            Note: {item.paymentNote}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-base sm:text-lg font-black text-slate-900 block">
                          ₹{item.totalAmount.toLocaleString('en-IN')}
                        </span>
                        <span
                          className={`text-[11px] font-bold ${
                            isPaidAll ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {isPaidAll
                            ? 'Paid in Full ✓'
                            : `Paid ₹${item.amountPaid} / ₹${item.totalAmount}`}
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedReceipt(item)}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── RECEIPT MODAL ── */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-4 border-b border-slate-100">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider inline-block mb-1">
                Official Payment Receipt
              </span>
              <h3 className="text-xl font-black text-slate-900">
                {selectedReceipt.vendorName || selectedReceipt.payeeName}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedReceipt.sessionId}</p>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Date & Time</span>
                <span className="font-bold text-slate-800">
                  {new Date(selectedReceipt.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Customer Mobile</span>
                <span className="font-bold text-slate-800">+91 {user.phone}</span>
              </div>
              {selectedReceipt.paymentNote && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Bill Note</span>
                  <span className="font-bold text-slate-800">{selectedReceipt.paymentNote}</span>
                </div>
              )}

              {/* Slices Breakdown */}
              <div className="pt-2">
                <p className="font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">
                  Payment Slices Breakdown
                </p>
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl">
                  {selectedReceipt.slices?.map((s) => (
                    <div key={s.sliceId} className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        Part {s.sliceIndex}: ₹{s.amount.toLocaleString('en-IN')}
                      </span>
                      <span
                        className={`font-bold flex items-center gap-1 ${
                          s.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {s.status === 'PAID' ? 'Paid ✓' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Banner */}
              <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-emerald-800 uppercase">Total Amount</p>
                  <p className="text-2xl font-black text-emerald-700">
                    ₹{selectedReceipt.totalAmount.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase">
                    {selectedReceipt.status === 'COMPLETED' ? 'VERIFIED ✓' : 'PARTIAL'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
