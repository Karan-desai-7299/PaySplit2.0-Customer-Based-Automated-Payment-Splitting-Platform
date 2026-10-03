import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  QrCode as QrIcon,
  User,
  Phone,
  FileText,
  IndianRupee,
  Zap,
  RotateCcw,
  Printer,
  Wifi,
  WifiOff,
  Clock,
  Sparkles,
  Layers,
  Check,
  ExternalLink,
  Smartphone,
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

/* ─── Fully Completed Screen (Final One Green Tick) ───────────────────────── */
function CompletedScreen({ session, customer, onNewBill }) {
  useEffect(() => {
    confetti({ particleCount: 180, spread: 85, origin: { y: 0.45 } });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl border border-emerald-200 shadow-2xl p-6 sm:p-10 max-w-md w-full text-center animate-in zoom-in-95 duration-500">
        {/* FINAL ONE BIG GREEN TICK */}
        <div className="mx-auto w-28 h-28 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 mb-5 animate-in zoom-in duration-700 ring-8 ring-emerald-100">
          <CheckCircle2 className="w-16 h-16 text-white stroke-[2.5]" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Payment Complete!</h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          All {session.totalSlices} QR payment{session.totalSlices > 1 ? 's' : ''} received and verified successfully.
        </p>

        {/* Total Collected Banner */}
        <div className="mt-5 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
          <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Amount Collected</p>
          <p className="text-4xl sm:text-5xl font-black text-emerald-700 tracking-tight mt-1">
            ₹{session.totalAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-emerald-600 mt-1 font-mono font-bold">{session.sessionId}</p>
        </div>

        {/* Portion Breakdown Verified Checklist */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Verified Portions</p>
          <div className="divide-y divide-slate-200">
            {session.slices.map((slice) => (
              <div key={slice.sliceId} className="py-1.5 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">QR {slice.sliceIndex}: ₹{slice.amount.toLocaleString('en-IN')}</span>
                <span className="flex items-center gap-1 font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Paid ✓
                </span>
              </div>
            ))}
          </div>
        </div>

        {customer?.customerName && (
          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-0.5">
            <p className="font-bold text-slate-500">Customer Details</p>
            <p className="text-slate-900 font-bold">{customer.customerName}</p>
            {customer.customerPhone && (
              <p className="text-slate-500 font-mono text-[11px]">{customer.customerPhone}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2.5 mt-6">
          <button
            onClick={() => window.print()}
            className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Receipt
          </button>
          <button
            onClick={onNewBill}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm shadow-blue-600/20 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            New Bill
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Single QR Card (Pure Automated Scan-to-Pay) ───────────────────────── */
function QrCard({ slice, sessionId, totalSlices }) {
  const [simulating, setSimulating] = useState(false);
  const currentQrImage = slice.qrCodeDataUrl;

  async function handleSimulate() {
    setSimulating(true);
    try {
      await api.simulatePayment(sessionId, slice.sliceId);
    } catch (err) {
      alert('Simulation failed: ' + err.message);
    } finally {
      setTimeout(() => setSimulating(false), 800);
    }
  }

  return (
    <div
      className={`relative rounded-3xl border-2 transition-all duration-500 overflow-hidden flex flex-col justify-between ${
        slice.isPaid
          ? 'border-emerald-400 bg-emerald-50/80 shadow-md ring-2 ring-emerald-400/20'
          : slice.isCurrentActive
          ? 'border-blue-600 bg-white shadow-lg shadow-blue-600/10 ring-2 ring-blue-600/10'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {/* Top Card Header */}
      <div className="p-3.5 pb-0 flex items-center justify-between z-10">
        <span className="text-xs font-black text-slate-600">
          QR {slice.sliceIndex} of {totalSlices}
        </span>
        {slice.isPaid ? (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
            <Check className="w-3 h-3 stroke-[3]" /> PAID
          </span>
        ) : slice.isCurrentActive ? (
          <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wide animate-pulse">
            SCAN TO PAY
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
            READY
          </span>
        )}
      </div>

      <div className="p-5 pt-3 flex flex-col items-center text-center">
        {/* If PAID: Green Checkmark replaces QR code instantly! */}
        {slice.isPaid ? (
          <div className="w-52 h-52 flex flex-col items-center justify-center animate-in zoom-in-90 duration-500 my-1">
            <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/40 ring-6 ring-emerald-200 animate-in zoom-in duration-300">
              <CheckCircle2 className="w-16 h-16 text-white stroke-[2.5]" />
            </div>
            <p className="text-emerald-700 font-black text-lg mt-3 uppercase tracking-wider">
              Paid ✓
            </p>
            {slice.bankRrn && (
              <p className="text-[10px] font-mono font-semibold text-emerald-800/80 mt-0.5 truncate max-w-[200px]">
                Ref: {slice.bankRrn}
              </p>
            )}
          </div>
        ) : (
          /* Active UPI Dynamic QR Code (Scannable in GPay/PhonePe/Paytm/BHIM) */
          <div className="relative my-1 flex flex-col items-center">
            <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
              {currentQrImage ? (
                <img
                  src={currentQrImage}
                  alt={`Pay ₹${slice.amount}`}
                  className="w-56 h-56 sm:w-48 sm:h-48 object-contain rounded-lg"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-slate-50 rounded-lg">
                  <QrIcon className="w-16 h-16 text-slate-300" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-bold mt-2">
              Scan with GPay, PhonePe, Paytm or Any UPI App
            </p>
            {(() => {
              const match = slice.upiString?.match(/pa=([^&]+)/);
              const upiId = match ? decodeURIComponent(match[1]) : '';
              return upiId ? (
                <p className="text-[11px] font-mono text-slate-600 font-bold mt-1 bg-slate-100/80 px-2.5 py-0.5 rounded-md border border-slate-200/60 max-w-[220px] truncate">
                  UPI: {upiId}
                </p>
              ) : null;
            })()}
          </div>
        )}

        {/* Prominent Amount Display for this specific QR */}
        <div className="mt-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            QR Amount
          </p>
          <p
            className={`text-2xl sm:text-3xl font-black tracking-tight ${
              slice.isPaid ? 'text-emerald-700' : 'text-slate-900'
            }`}
          >
            ₹{slice.amount.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Real-Time Status Indicator */}
        <div className="w-full mt-3">
          {slice.isPaid ? (
            <div className="text-xs text-emerald-700 font-bold flex items-center justify-center gap-1.5 py-2 bg-emerald-100/70 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Payment Verified Successfully</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                <span>Waiting for customer payment…</span>
              </div>
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                title="Click when payment received to turn QR into green tick"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>{simulating ? 'Confirming…' : 'Customer Paid? Show Green Tick ✓'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Paying Screen ───────────────────────────────────────────────────────── */
function PayingScreen({ session: initialSession, customer, onDone, onNewBill }) {
  const [session, setSession] = useState(initialSession);
  const [connected, setConnected] = useState(false);
  const [sharePhone, setSharePhone] = useState(customer?.customerPhone || initialSession?.customerPhone || '');
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState('');
  const [shareError, setShareError] = useState('');
  const esRef = useRef(null);

  async function handleShareToCustomer() {
    const clean = sharePhone.replace(/\D/g, '').slice(-10);
    if (!clean || clean.length < 10) {
      setShareError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setSharing(true);
    setShareError('');
    setShareSuccess('');
    try {
      await api.shareBillWithCustomer(session.sessionId, clean, customer?.customerName);
      setShareSuccess(`✓ Bill shared with customer (+91 ${clean})! Live popoff active on customer's screen.`);
      setTimeout(() => setShareSuccess(''), 5000);
    } catch (err) {
      setShareError(err.message || 'Failed to share bill with customer.');
    } finally {
      setSharing(false);
    }
  }

  /* Open SSE connection — instant push from server */
  useEffect(() => {
    const token = getToken();
    const streamBase = API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`;
    const url = `${streamBase}/vendor/stream/${initialSession.sessionId}?token=${token}`;
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

          if (data.type === 'SLICE_PAID') {
            playPaymentChime();

            setSession((prev) => {
              const updatedSlices = prev.slices.map((s) =>
                s.sliceId === data.sliceId
                  ? { ...s, status: 'PAID', isPaid: true, bankRrn: data.bankRrn, paidAt: data.paidAt }
                  : s
              );

              let firstPendingFound = false;
              const enriched = updatedSlices.map((s) => {
                const isPaid = s.status === 'PAID';
                let isCurrentActive = false;
                if (!firstPendingFound && !isPaid) {
                  isCurrentActive = true;
                  firstPendingFound = true;
                }
                return { ...s, isPaid, isUnlocked: true, isCurrentActive, isLocked: false };
              });

              return {
                ...prev,
                slices: enriched,
                amountPaid: data.amountPaid,
                remainingAmount: data.remainingAmount,
                completedSlices: data.completedSlices,
                status: data.sessionStatus,
              };
            });

            if (data.isFullyComplete) {
              setTimeout(() => {
                onDone();
              }, 2200);
            }
          }
        } catch (e) {
          console.error('SSE parse error', e);
        }
      };

      es.onerror = () => {
        setConnected(false);
      };
    } catch (e) {
      console.warn('SSE connection failed, falling back to polling', e);
    }

    // Polling fallback every 2.5s for seamless reliability in serverless/mobile environments
    const pollInterval = setInterval(async () => {
      try {
        const latest = await api.getPaymentSession(initialSession.sessionId);
        if (latest && latest.session) {
          const s = latest.session;
          setSession((prev) => {
            const hasNewPaid = s.slices.some((sl, idx) => sl.status === 'PAID' && !prev.slices[idx]?.isPaid);
            if (hasNewPaid) {
              playPaymentChime();
            }
            let firstPending = false;
            const enriched = s.slices.map((sl) => {
              const isPaid = sl.status === 'PAID';
              let isCurrentActive = false;
              if (!firstPending && !isPaid) {
                isCurrentActive = true;
                firstPending = true;
              }
              return { ...sl, isPaid, isUnlocked: true, isCurrentActive, isLocked: false };
            });
            return {
              ...prev,
              slices: enriched,
              amountPaid: s.amountPaid,
              remainingAmount: s.remainingAmount,
              completedSlices: s.completedSlices,
              status: s.status,
            };
          });

          if (s.status === 'COMPLETED' || s.completedSlices === s.totalSlices) {
            clearInterval(pollInterval);
            setTimeout(() => {
              onDone();
            }, 2200);
          }
        }
      } catch (err) {
        // silent polling error
      }
    }, 2500);

    return () => {
      if (es) es.close();
      esRef.current = null;
      clearInterval(pollInterval);
    };
  }, [initialSession.sessionId, onDone]);

  const pct = Math.min(100, (session.amountPaid / session.totalAmount) * 100);
  const isAllPaid = session.completedSlices === session.totalSlices && session.totalSlices > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Active Bill Payment</h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold">
              {session.sessionId}
            </span>
            <span
              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                connected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {connected ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-500" /> Live
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-500" /> Reconnecting…
                </>
              )}
            </span>
          </div>
          {customer?.customerName && (
            <p className="text-xs text-slate-500 mt-1">
              Customer: <span className="font-bold text-slate-800">{customer.customerName}</span>
              {customer.customerPhone && <span className="text-slate-400"> · {customer.customerPhone}</span>}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="text-right">
            <p className="text-[11px] text-slate-400 font-bold uppercase">Total Bill</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ₹{session.totalAmount.toLocaleString('en-IN')}
            </p>
          </div>
          <button
            onClick={onNewBill}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition cursor-pointer"
            title="Start new bill"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Share Bill to Customer Screen (Vendor -> Customer Live Popoff) ── */}
      <div className="mb-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-4 border border-blue-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                <span>Share Bill to Customer Screen</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white uppercase tracking-wider">
                  Live Popoff
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Enter customer mobile number to trigger an instant live popup on their screen with Google Pay / UPI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-44">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">+91</span>
              <input
                type="tel"
                value={sharePhone}
                onChange={(e) => setSharePhone(e.target.value)}
                placeholder="Customer Mobile"
                inputMode="tel"
                className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
            <button
              onClick={handleShareToCustomer}
              disabled={sharing || sharePhone.length < 10}
              className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-blue-600/20 transition shrink-0 cursor-pointer"
            >
              {sharing ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Share Bill</span>
                </>
              )}
            </button>
          </div>
        </div>

        {shareSuccess && (
          <div className="mt-2.5 p-2 rounded-xl bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{shareSuccess}</span>
          </div>
        )}

        {shareError && (
          <div className="mt-2.5 p-2 rounded-xl bg-red-100/80 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <span>{shareError}</span>
          </div>
        )}
      </div>

      {/* Celebration Banner when all QRs have green ticks */}
      {isAllPaid && (
        <div className="mb-5 p-4 rounded-2xl bg-emerald-500 text-white flex items-center justify-between shadow-lg shadow-emerald-500/20 animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-black text-sm">All {session.totalSlices} QR Payments Received!</h4>
              <p className="text-xs text-emerald-100">Every QR paid ✓ Opening final receipt…</p>
            </div>
          </div>
          <button
            onClick={onDone}
            className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-800 font-bold text-xs shadow-xs hover:bg-emerald-50 cursor-pointer"
          >
            Final Receipt →
          </button>
        </div>
      )}

      {/* Overall Progress Bar */}
      <div className="mb-6 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
          <span className="flex items-center gap-1.5">
            <span>Progress:</span>
            <span className={session.completedSlices > 0 ? 'text-emerald-600' : 'text-slate-500'}>
              {session.completedSlices}/{session.totalSlices} QRs Paid
            </span>
          </span>
          <span className="text-blue-600">
            ₹{session.amountPaid.toLocaleString('en-IN')} / ₹{session.totalAmount.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Grid of Multiple QRs — each QR displays with amount */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {session.slices.map((slice) => (
          <QrCard
            key={slice.sliceId}
            slice={slice}
            sessionId={session.sessionId}
            totalSlices={session.totalSlices}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Enrich Session Helper ───────────────────────────────────────────────── */
function enrichSession(session) {
  let firstPendingFound = false;
  const enriched = session.slices.map((s) => {
    const isPaid = s.status === 'PAID';
    let isCurrentActive = false;
    if (!firstPendingFound && !isPaid) {
      isCurrentActive = true;
      firstPendingFound = true;
    }
    return {
      ...s,
      isPaid,
      isUnlocked: true,
      isCurrentActive,
      isLocked: false,
      qrCodeDataUrl: s.qrCodeDataUrl,
    };
  });
  return { ...session, slices: enriched };
}

/* ─── Main QR Generator (Form) ────────────────────────────────────────────── */
export default function QrGenerator({ user }) {
  const [step, setStep] = useState('form');
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    totalAmount: '',
    paymentNote: '',
    customMaxQrLimit: user?.maxQrAmount ? String(user.maxQrAmount) : '1999',
  });
  const [splitMode, setSplitMode] = useState('auto'); // 'auto' | '2' | '3' | '4' | 'custom'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [customer, setCustomer] = useState(null);

  const numAmount = parseFloat(formData.totalAmount) || 0;
  const numLimit = parseFloat(formData.customMaxQrLimit) || 1999;

  // Compute live breakdown for preview
  const calculatedSplits = [];
  if (numAmount > 0) {
    if (splitMode === '2' || splitMode === '3' || splitMode === '4') {
      const count = parseInt(splitMode, 10);
      const base = Math.floor((numAmount / count) * 100) / 100;
      let allocated = 0;
      for (let i = 0; i < count - 1; i++) {
        calculatedSplits.push(base);
        allocated += base;
      }
      calculatedSplits.push(Math.round((numAmount - allocated) * 100) / 100);
    } else {
      let rem = numAmount;
      const limit = splitMode === 'custom' && numLimit > 0 ? numLimit : 1999;
      while (rem > 0) {
        if (rem > limit) {
          calculatedSplits.push(limit);
          rem = Math.round((rem - limit) * 100) / 100;
        } else {
          calculatedSplits.push(rem);
          rem = 0;
        }
      }
    }
  }

  const onChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  function addQuickAmount(val) {
    const current = parseFloat(formData.totalAmount) || 0;
    setFormData((prev) => ({ ...prev, totalAmount: String(current + val) }));
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid bill amount.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.createPaymentSession({
        totalAmount: numAmount,
        paymentNote: formData.paymentNote,
        customMaxQrLimit: splitMode === 'custom' ? parseFloat(formData.customMaxQrLimit) || 1999 : 1999,
        splitCount: (splitMode === '2' || splitMode === '3' || splitMode === '4') ? parseInt(splitMode, 10) : undefined,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
      });

      const enriched = enrichSession(res.session);
      setSession(enriched);
      setCustomer({ customerName: formData.customerName, customerPhone: formData.customerPhone });
      setStep('paying');
    } catch (err) {
      setError(err.message || 'Failed to generate QR codes');
    } finally {
      setLoading(false);
    }
  }

  function handleNewBill() {
    setStep('form');
    setSession(null);
    setCustomer(null);
    setFormData((prev) => ({
      customerName: '',
      customerPhone: '',
      totalAmount: '',
      paymentNote: '',
      customMaxQrLimit: prev.customMaxQrLimit,
    }));
  }

  if (step === 'done' && session) {
    return <CompletedScreen session={session} customer={customer} onNewBill={handleNewBill} />;
  }

  if (step === 'paying' && session) {
    return (
      <PayingScreen
        session={session}
        customer={customer}
        onDone={() => setStep('done')}
        onNewBill={handleNewBill}
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <Zap className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">New Bill Payment</h1>
        </div>
        <p className="text-slate-500 text-xs sm:text-sm">
          Enter bill amount to generate multiple QRs. Each QR displays its amount and turns green on payment.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Bill Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7">
        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Amount Input with Large Display */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Bill Amount (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IndianRupee className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="number"
                name="totalAmount"
                value={formData.totalAmount}
                onChange={onChange}
                placeholder="0"
                min="1"
                step="any"
                required
                autoFocus
                inputMode="decimal"
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-200 text-3xl font-black text-slate-900 placeholder-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition tracking-tight"
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">Add:</span>
              {[100, 200, 500, 1000, 2000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => addQuickAmount(amt)}
                  className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition border border-blue-200/80 shrink-0 cursor-pointer"
                >
                  +₹{amt}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, totalAmount: '' }))}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition shrink-0 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Multiple QR Split Mode Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Split Into Multiple QRs
              </label>
              <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {calculatedSplits.length} QR{calculatedSplits.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => setSplitMode('auto')}
                className={`py-2 px-1 rounded-xl text-xs font-bold text-center transition cursor-pointer border ${
                  splitMode === 'auto'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Auto (₹1,999)
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('2')}
                className={`py-2 px-1 rounded-xl text-xs font-bold text-center transition cursor-pointer border ${
                  splitMode === '2'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                2 QRs
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('3')}
                className={`py-2 px-1 rounded-xl text-xs font-bold text-center transition cursor-pointer border ${
                  splitMode === '3'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                3 QRs
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('4')}
                className={`py-2 px-1 rounded-xl text-xs font-bold text-center transition cursor-pointer border ${
                  splitMode === '4'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                4 QRs
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('custom')}
                className={`py-2 px-1 rounded-xl text-xs font-bold text-center transition cursor-pointer border ${
                  splitMode === 'custom'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom Limit Input */}
            {splitMode === 'custom' && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 animate-in fade-in duration-200">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Maximum Limit per Single QR (₹)
                </label>
                <input
                  type="number"
                  name="customMaxQrLimit"
                  value={formData.customMaxQrLimit}
                  onChange={onChange}
                  placeholder="e.g. 500"
                  min="10"
                  step="any"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-800"
                />
              </div>
            )}
          </div>

          {/* Live Preview of Multiple QRs with their respective amounts */}
          {calculatedSplits.length > 0 && (
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Generating {calculatedSplits.length} QR Code{calculatedSplits.length > 1 ? 's' : ''}:
                </span>
                <span className="text-xs font-black text-blue-800">
                  Total: ₹{numAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {calculatedSplits.map((amt, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-xl bg-white border border-blue-200 text-xs font-bold text-blue-900 shadow-2xs flex items-center gap-1.5"
                  >
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">
                      {idx + 1}
                    </span>
                    <span>QR {idx + 1}:</span>
                    <span className="text-blue-600 font-black">₹{amt.toLocaleString('en-IN')}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Customer Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer Mobile</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={onChange}
                  inputMode="tel"
                  placeholder="9876543210"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={onChange}
                  placeholder="Customer Name"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>
            </div>
          </div>

          {/* Optional Bill Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Bill / Invoice Note <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                name="paymentNote"
                value={formData.paymentNote}
                onChange={onChange}
                placeholder="e.g. Counter 1, Invoice #102"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || numAmount <= 0}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>
                    Generate {calculatedSplits.length > 1 ? `${calculatedSplits.length} QR Codes` : 'QR Code'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Payments deposit directly to: </span>
            <span className="font-mono font-bold text-slate-800">{user?.upiId || 'your UPI ID'}</span>
          </p>
        </form>
      </div>
    </div>
  );
}
