import React from 'react';
import {
  QrCode,
  LayoutDashboard,
  Settings,
  LogOut,
  Shield,
  Zap,
  Users,
  MessageSquare,
  UserCheck,
  Smartphone,
  Clock,
} from 'lucide-react';

import Logo from './Logo';

export default function Navbar({ user, currentView, setCurrentView, onLogout }) {
  const isAdmin = user?.role === 'admin';
  const isVendor = user?.role === 'vendor';
  const isCustomer = user?.role === 'customer';

  return (
    <>
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
          {/* Brand Logo with PaySplit 2.0 */}
          <Logo size="sm" showSubtitle={false} />

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {isCustomer && (
              <>
                <button
                  onClick={() => setCurrentView('customer-portal')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'customer-portal'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Customer Portal</span>
                </button>
              </>
            )}

            {isVendor && (
              <>
                <button
                  onClick={() => setCurrentView('generate')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'generate'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Generate QR</span>
                </button>

                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'dashboard'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>History & Stats</span>
                </button>

                <button
                  onClick={() => setCurrentView('chat')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'chat'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Admin Chat</span>
                </button>

                <button
                  onClick={() => setCurrentView('settings')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'settings'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Profile & UPI</span>
                </button>
              </>
            )}

            {isAdmin && (
              <button
                onClick={() => setCurrentView('admin')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Console</span>
              </button>
            )}
          </nav>

          {/* Right Area: Session Badge & Logout */}
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isAdmin
                ? 'Admin Mode'
                : isCustomer
                ? `Customer · +91 ${user?.phone}`
                : `Vendor · ${user?.vendorId || ''}`}
            </span>

            <button
              onClick={onLogout}
              title="Sign out"
              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Bottom Navigation Bar (Vendor Only) ── */}
      {isVendor && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-1.5 px-3 shadow-lg flex justify-around items-center">
          <button
            onClick={() => setCurrentView('generate')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
              currentView === 'generate' ? 'text-blue-600 font-black' : 'text-slate-500 font-semibold'
            }`}
          >
            <Zap className={`w-5 h-5 ${currentView === 'generate' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5">Pay QR</span>
          </button>

          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
              currentView === 'dashboard' ? 'text-blue-600 font-black' : 'text-slate-500 font-semibold'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${currentView === 'dashboard' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5">History</span>
          </button>

          <button
            onClick={() => setCurrentView('chat')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
              currentView === 'chat' ? 'text-blue-600 font-black' : 'text-slate-500 font-semibold'
            }`}
          >
            <MessageSquare className={`w-5 h-5 ${currentView === 'chat' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5">Chat</span>
          </button>

          <button
            onClick={() => setCurrentView('settings')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
              currentView === 'settings' ? 'text-blue-600 font-black' : 'text-slate-500 font-semibold'
            }`}
          >
            <Settings className={`w-5 h-5 ${currentView === 'settings' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5">Profile</span>
          </button>
        </nav>
      )}
    </>
  );
}
