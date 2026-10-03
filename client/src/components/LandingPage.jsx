import React, { useState } from 'react';
import {
  QrCode,
  Lock,
  User,
  AlertCircle,
  Zap,
  Shield,
  Smartphone,
  CheckCircle2,
  Clock,
  Send,
  Building,
  Phone,
  Mail,
  IndianRupee,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Search,
} from 'lucide-react';
import { api } from '../api';
import Logo from './Logo';
import LegalPoliciesModal from './LegalPolicies';

export default function LandingPage({ onLoginSuccess }) {
  // Tab can be 'customer' | 'login' | 'request'
  const [activeTab, setActiveTab] = useState('login');
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  // Customer Login state
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState('');

  // Request sub-tab: 'form' | 'status'
  const [requestSubTab, setRequestSubTab] = useState('form');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Request form state
  const [reqForm, setReqForm] = useState({
    businessName: '',
    ownerName: '',
    phone: '',
    email: '',
    upiId: '',
    notes: '',
  });
  const [reqLoading, setReqLoading] = useState(false);
  const [reqSuccess, setReqSuccess] = useState('');
  const [reqError, setReqError] = useState('');

  // Status check state
  const [statusPhone, setStatusPhone] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusResult, setStatusResult] = useState(null);
  const [statusError, setStatusError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const data = await api.login(username.trim().toLowerCase(), password);
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRequestSubmit(e) {
    e.preventDefault();
    setReqError('');
    setReqSuccess('');
    setReqLoading(true);
    try {
      const res = await api.submitVendorRequest(reqForm);
      setReqSuccess(res.message || 'Registration request submitted successfully!');
      setStatusPhone(reqForm.phone); // pre-populate phone for status check
    } catch (err) {
      setReqError(err.message || 'Failed to submit registration request.');
    } finally {
      setReqLoading(false);
    }
  }

  async function handleCustomerLogin(e) {
    if (e) e.preventDefault();
    setCustomerError('');
    const clean = customerPhone.replace(/\D/g, '').slice(-10);
    if (!clean || clean.length < 10) {
      setCustomerError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setCustomerLoading(true);
    try {
      const res = await api.customerLogin(clean, customerName);
      onLoginSuccess(res.token, res.user);
    } catch (err) {
      setCustomerError(err.message || 'Failed to login with mobile number.');
    } finally {
      setCustomerLoading(false);
    }
  }

  async function handleCheckStatus(e) {
    if (e) e.preventDefault();
    if (!statusPhone.trim()) {
      setStatusError('Please enter your registered mobile number.');
      return;
    }
    setStatusError('');
    setStatusResult(null);
    setStatusLoading(true);
    try {
      const res = await api.checkRequestStatus(statusPhone.trim());
      setStatusResult(res);
    } catch (err) {
      setStatusError(err.message || 'No application found for this mobile number.');
    } finally {
      setStatusLoading(false);
    }
  }

  function handleUseApprovedId(assignedUsername) {
    setUsername(assignedUsername);
    setActiveTab('login');
    window.scrollTo({ top: 250, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* PaySplit Green Box Logo */}
          <Logo size="md" className="shrink-0" />

          {/* Top Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveTab('customer');
                setCustomerError('');
              }}
              className={`text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'customer'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Customer Login</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('request');
                setRequestSubTab('form');
              }}
              className={`text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition whitespace-nowrap cursor-pointer ${
                activeTab === 'request'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              }`}
            >
              Request Access
            </button>
            <button
              onClick={() => {
                setActiveTab('login');
              }}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm shadow-blue-600/20 flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Hero Section ── */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-16">
          {/* Hero Titles */}
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              PaySplit 2.0 — Real-Time Payment Splitting
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 sm:mt-3 leading-relaxed">
              Instant dynamic QR code generation with live bill sharing to customer screens, direct Google Pay & UPI intent payment, and synchronized zero-delay green ticks.
            </p>
          </div>

          {/* ── Interactive Card (Customer Access, Vendor Sign In & Request Access) ── */}
          <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl shadow-blue-900/5 overflow-hidden">
            {/* Direct Switcher Tabs (3 tabs: Customer, Vendor, Request ID) */}
            <div className="grid grid-cols-3 p-1.5 bg-slate-100/90 border-b border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('customer');
                  setCustomerError('');
                }}
                className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1 text-[11px] sm:text-xs cursor-pointer ${
                  activeTab === 'customer'
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Customer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setLoginError('');
                }}
                className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1 text-[11px] sm:text-xs cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Vendor</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('request');
                  setReqError('');
                }}
                className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1 text-[11px] sm:text-xs cursor-pointer ${
                  activeTab === 'request'
                    ? 'bg-slate-900 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Request ID</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 sm:p-7">
              {/* ── 0: CUSTOMER LOGIN (Mobile Number Direct Access) ── */}
              {activeTab === 'customer' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-black text-slate-900">Customer Access</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Direct login with your 10-digit mobile number
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Zero Password
                    </span>
                  </div>

                  {/* Quick Demo Pre-fills */}
                  <div className="mb-4 bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/80">
                    <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Quick Demo Customers
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerPhone('9876543210');
                          setCustomerName('Rahul Sharma');
                          setCustomerError('');
                        }}
                        className="p-2 rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 text-left transition text-xs font-medium cursor-pointer"
                      >
                        <p className="font-bold text-slate-900">Rahul Sharma</p>
                        <p className="text-[10px] text-slate-500 font-mono">9876543210</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerPhone('9823456789');
                          setCustomerName('Priya Patel');
                          setCustomerError('');
                        }}
                        className="p-2 rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 text-left transition text-xs font-medium cursor-pointer"
                      >
                        <p className="font-bold text-slate-900">Priya Patel</p>
                        <p className="text-[10px] text-slate-500 font-mono">9823456789</p>
                      </button>
                    </div>
                  </div>

                  {customerError && (
                    <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{customerError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCustomerLogin} className="space-y-4">
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
                          className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
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
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={customerLoading || customerPhone.length < 10}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {customerLoading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Smartphone className="w-4 h-4" />
                          <span>Access My Bills & History</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 leading-relaxed">
                    💡 Whenever a merchant enters your phone number, the bill instantly pops up on your screen. You can pay via Google Pay, PhonePe, or any UPI app.
                  </div>
                </div>
              )}

              {/* ── 1: UNIFIED SIGN IN (Vendors & Admins sign in here) ── */}
              {activeTab === 'login' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-black text-slate-900">Sign In</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Vendors and Administrators sign in below
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Secure Portal
                    </span>
                  </div>

                  {loginError && (
                    <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Username / ID
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          placeholder="e.g. username or vendor ID"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-1"
                    >
                      {loginLoading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Sign In to Dashboard</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* 30-day session notice */}
                  <div className="mt-4 p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center gap-2 text-[11px] text-blue-800 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Active session stays continuously logged in for up to 30 days.</span>
                  </div>

                  {/* Prompt for new vendors */}
                  <p className="text-center text-xs text-slate-500 mt-5 pt-4 border-t border-slate-100">
                    New vendor without credentials?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('request');
                        setRequestSubTab('form');
                      }}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Request User ID here
                    </button>
                  </p>
                </div>
              )}

              {/* ── 2: REQUEST ID & FOLLOW UP ── */}
              {activeTab === 'request' && (
                <div>
                  {/* Sub-Tabs: New Application vs Track Status */}
                  <div className="flex border-b border-slate-200 mb-4 pb-1 gap-4 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setRequestSubTab('form')}
                      className={`pb-1.5 border-b-2 transition ${
                        requestSubTab === 'form'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      1. New Application
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRequestSubTab('status');
                        if (statusPhone) handleCheckStatus();
                      }}
                      className={`pb-1.5 border-b-2 transition flex items-center gap-1 ${
                        requestSubTab === 'status'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>2. Check Status & Follow Up</span>
                    </button>
                  </div>

                  {/* Sub-Tab 1: Application Form */}
                  {requestSubTab === 'form' && (
                    <div>
                      {reqSuccess ? (
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                          <div className="flex items-center gap-2 font-bold mb-1.5 text-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>Registration Request Sent!</span>
                          </div>
                          <p className="text-emerald-700 leading-relaxed mb-3">
                            The administrator has received your details. You can track your approval status and
                            get your assigned User ID anytime using your mobile number.
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setRequestSubTab('status');
                                handleCheckStatus();
                              }}
                              className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition flex items-center justify-center gap-1 shadow-xs"
                            >
                              <Search className="w-3.5 h-3.5" />
                              <span>Track Status Now</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setReqSuccess('')}
                              className="py-2 px-3 rounded-xl border border-emerald-300 text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition"
                            >
                              New
                            </button>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleRequestSubmit} className="space-y-3">
                          {reqError && (
                            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                              {reqError}
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Shop / Business Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                              <input
                                type="text"
                                required
                                value={reqForm.businessName}
                                onChange={(e) => setReqForm({ ...reqForm, businessName: e.target.value })}
                                placeholder="e.g. Sharma Grocery Store"
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Owner Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={reqForm.ownerName}
                                onChange={(e) => setReqForm({ ...reqForm, ownerName: e.target.value })}
                                placeholder="e.g. Ramesh"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Mobile Number <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="tel"
                                required
                                value={reqForm.phone}
                                onChange={(e) => setReqForm({ ...reqForm, phone: e.target.value })}
                                placeholder="9876543210"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              UPI ID (VPA) for Customer Deposits <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                              <input
                                type="text"
                                required
                                value={reqForm.upiId}
                                onChange={(e) => setReqForm({ ...reqForm, upiId: e.target.value })}
                                placeholder="yourshop@okaxis or yourshop@upi"
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Notes / Address <span className="text-slate-400 font-normal">(optional)</span>
                            </label>
                            <textarea
                              rows={2}
                              value={reqForm.notes}
                              onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })}
                              placeholder="Shop address, counter requirement..."
                              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={reqLoading}
                            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer mt-1"
                          >
                            {reqLoading ? (
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Submit Request to Admin</span>
                              </>
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Sub-Tab 2: Follow-Up & Track Status */}
                  {requestSubTab === 'status' && (
                    <div className="space-y-3.5">
                      <p className="text-xs text-slate-500">
                        Enter your registered mobile phone number to follow up on your account approval status:
                      </p>

                      <form onSubmit={handleCheckStatus} className="flex gap-2">
                        <input
                          type="tel"
                          required
                          value={statusPhone}
                          onChange={(e) => setStatusPhone(e.target.value)}
                          placeholder="Registered mobile (e.g. 9822334455)"
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                        />
                        <button
                          type="submit"
                          disabled={statusLoading}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1 shrink-0"
                        >
                          {statusLoading ? (
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <Search className="w-3.5 h-3.5" />
                              <span>Check</span>
                            </>
                          )}
                        </button>
                      </form>

                      {statusError && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                          {statusError}
                        </div>
                      )}

                      {statusResult && (
                        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5 animate-in fade-in duration-200">
                          {/* Status Badge */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Application Status:</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                statusResult.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : statusResult.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                              }`}
                            >
                              {statusResult.status === 'APPROVED' ? 'Approved & Ready' : statusResult.status}
                            </span>
                          </div>

                          {/* Business Info */}
                          <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-200">
                            <p>
                              <span className="font-bold text-slate-800">Business:</span>{' '}
                              {statusResult.businessName}
                            </p>
                            <p>
                              <span className="font-bold text-slate-800">Linked UPI:</span>{' '}
                              <span className="font-mono text-blue-700">{statusResult.upiId}</span>
                            </p>
                          </div>

                          {/* Status Details */}
                          {statusResult.status === 'PENDING' && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                              <p className="font-bold mb-0.5">Under Review by Administrator</p>
                              Your request has been received by the admin. Once approved, your assigned User ID
                              will appear here.
                            </div>
                          )}

                          {statusResult.status === 'APPROVED' && (
                            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Your Account is Active!</span>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-emerald-200 font-mono text-xs">
                                <p>
                                  <span className="text-slate-400 font-sans">Assigned User ID:</span>{' '}
                                  <strong className="text-blue-700 text-sm">@{statusResult.assignedUsername}</strong>
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  Vendor ID: {statusResult.assignedVendorId}
                                </p>
                              </div>
                              {statusResult.adminNotes && (
                                <p className="text-[11px] text-emerald-700 italic">
                                  <strong>Admin Note:</strong> "{statusResult.adminNotes}"
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => handleUseApprovedId(statusResult.assignedUsername)}
                                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition shadow-xs"
                              >
                                <span>Sign In with this User ID</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {statusResult.status === 'REJECTED' && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                              <p className="font-bold">Application Not Approved</p>
                              <p className="text-[11px] mt-0.5">
                                {statusResult.adminNotes || 'Contact the administrator for further details.'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Key Advantages / Mobile POS Features ── */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Instant Real-Time Green Tick</h3>
              <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                Dynamic QR turns into a confirmed green checkmark with zero second delay via Server-Sent Events
                as soon as customer completes payment.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Smartphone className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Mobile Counter POS</h3>
              <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                Designed specifically for smartphones with quick amount tap chips, clean white cards, and 30-day
                continuous login.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Live Admin Follow-Up & Chat</h3>
              <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                Track your account approval status anytime using your mobile number, plus 1-on-1 real-time chat
                with the administrator.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer with Razorpay Mandated Compliance Links ── */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 space-y-3">
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setSelectedPolicy('terms')}
              className="hover:text-blue-600 transition cursor-pointer"
            >
              Terms & Conditions
            </button>
            <span>•</span>
            <button
              onClick={() => setSelectedPolicy('privacy')}
              className="hover:text-blue-600 transition cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              onClick={() => setSelectedPolicy('refund')}
              className="hover:text-blue-600 transition cursor-pointer"
            >
              Refund Policy
            </button>
            <span>•</span>
            <button
              onClick={() => setSelectedPolicy('contact')}
              className="hover:text-blue-600 transition cursor-pointer"
            >
              Contact Us
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            © 2026 PaySplit Technologies — Automated Payment Splitting Platform. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Compliance Policy Modal */}
      <LegalPoliciesModal
        policyType={selectedPolicy}
        onClose={() => setSelectedPolicy(null)}
      />
    </div>
  );
}
