import React, { useState, useEffect } from 'react';
import {
  Shield,
  Store,
  Lock,
  User,
  AlertCircle,
  X,
  Sparkles,
  Smartphone,
  Phone,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api';

export default function LoginModal({ isOpen, onClose, onLoginSuccess, initialTab = 'customer' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'customer' | 'vendor'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setError('');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Handle Vendor / Admin Password Login
  async function handleVendorSubmit(e) {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data.token, data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle Customer Mobile Login
  async function handleCustomerSubmit(e) {
    if (e) e.preventDefault();
    setError('');

    const clean = customerPhone.replace(/\D/g, '').slice(-10);
    if (!clean || clean.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.customerLogin(clean, customerName);
      onLoginSuccess(res.token, res.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Customer login failed');
    } finally {
      setLoading(false);
    }
  }

  function handleQuickVendorLogin(userType) {
    if (userType === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('janedoe');
      setPassword('vendor123');
    }
    setError('');
  }

  function handleQuickCustomerLogin(phone, name) {
    setCustomerPhone(phone);
    setCustomerName(name);
    setError('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Selector: Customer vs Vendor */}
        <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('customer');
              setError('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'customer'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Customer Login</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('vendor');
              setError('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'vendor'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Vendor / Admin</span>
          </button>
        </div>

        {/* Header Title */}
        <div className="text-center mb-5">
          {activeTab === 'customer' ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-2.5 shadow-inner">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Customer Access</h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter your mobile number to view live bills & payment history
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-2.5 shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Vendor & Admin Login</h3>
              <p className="text-xs text-slate-500 mt-1">
                Access your Administrator Portal or Vendor Workspace
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── CUSTOMER MOBILE FORM ── */}
        {activeTab === 'customer' ? (
          <div>
            {/* Quick Demo Pre-fills */}
            <div className="mb-4 bg-blue-50/60 p-3 rounded-2xl border border-blue-100">
              <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Quick Customer Pre-fill
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickCustomerLogin('9876543210', 'Rahul Sharma')}
                  className="px-3 py-2 rounded-xl bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">Rahul Sharma</p>
                    <p className="text-[10px] text-slate-500 font-mono">9876543210</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCustomerLogin('9823456789', 'Priya Patel')}
                  className="px-3 py-2 rounded-xl bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">Priya Patel</p>
                    <p className="text-[10px] text-slate-500 font-mono">9823456789</p>
                  </div>
                </button>
              </div>
            </div>

            <form onSubmit={handleCustomerSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    inputMode="tel"
                    placeholder="9876543210"
                    autoFocus
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || customerPhone.length < 10}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Access My Bills & History</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* ── VENDOR / ADMIN USERNAME & PASSWORD FORM ── */
          <div>
            {/* Quick Demo Pre-fill Pills */}
            <div className="mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Vendor / Admin Logins
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickVendorLogin('admin')}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">Admin</p>
                    <p className="text-[10px] text-slate-500">admin / admin123</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickVendorLogin('vendor')}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 text-left transition flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer"
                >
                  <Store className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">Vendor</p>
                    <p className="text-[10px] text-slate-500">janedoe / vendor123</p>
                  </div>
                </button>
              </div>
            </div>

            <form onSubmit={handleVendorSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username / Vendor ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="e.g. admin or janedoe"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 active:scale-[0.99] transition shadow-md shadow-slate-900/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Sign In to Dashboard'
                )}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400 mt-5">
          PaySplit 2.0 · Real-Time UPI Payment Splitting & Live Customer Sync
        </p>
      </div>
    </div>
  );
}
