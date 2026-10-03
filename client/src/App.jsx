import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Navbar from './components/Navbar';
import QrGenerator from './components/QrGenerator';
import VendorDashboard from './components/VendorDashboard';
import AdminDashboard from './components/AdminDashboard';
import SettingsPage from './components/SettingsPage';
import ChatBox from './components/ChatBox';
import CustomerPaymentPage from './components/CustomerPaymentPage';
import CustomerDashboard from './components/CustomerDashboard';
import { api, setToken, getToken } from './api';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentView, setCurrentView] = useState('generate');

  // Check if this is a Customer Scan-to-Pay URL: /pay/PAY-XXXXXXXX-XXXX
  const pathname = window.location.pathname;
  const isPayRoute = pathname.startsWith('/pay/');
  const paySessionId = isPayRoute ? pathname.replace('/pay/', '').split('/')[0] : null;

  // Restore 30-day session from localStorage on mount
  useEffect(() => {
    async function restoreSession() {
      if (isPayRoute) {
        setIsInitializing(false);
        return;
      }

      const token = getToken();
      if (!token) {
        setIsInitializing(false);
        return;
      }
      try {
        const profile = await api.getMe();
        setUser(profile);
        if (profile.role === 'customer') {
          setCurrentView('customer-portal');
        } else if (profile.role === 'admin') {
          setCurrentView('admin');
        } else {
          setCurrentView('generate');
        }
      } catch {
        setToken(null); // expired or invalid token
      } finally {
        setIsInitializing(false);
      }
    }
    restoreSession();
  }, [isPayRoute]);

  // If customer scanned the QR code, show the Customer Smart Payment Page directly!
  if (isPayRoute && paySessionId) {
    return <CustomerPaymentPage sessionId={paySessionId} />;
  }

  function handleLoginSuccess(token, userData) {
    setToken(token);
    setUser(userData);
    if (userData.role === 'customer') {
      setCurrentView('customer-portal');
    } else if (userData.role === 'admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('generate');
    }
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    setCurrentView('generate');
  }

  // Loading spinner while restoring session
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-600">Restoring session...</p>
      </div>
    );
  }

  // If not logged in, show modern Landing Page with direct login & request forms
  if (!user) {
    return <LandingPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar
        user={user}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-20 md:pb-12">
        {/* ── Vendor Views ───────────────────────────── */}
        {user.role === 'vendor' && currentView === 'generate' && (
          <QrGenerator user={user} />
        )}

        {user.role === 'vendor' && currentView === 'dashboard' && (
          <VendorDashboard
            user={user}
            onNavigateToGenerate={() => setCurrentView('generate')}
          />
        )}

        {user.role === 'vendor' && currentView === 'chat' && (
          <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-140px)]">
            <ChatBox currentUser={user} />
          </div>
        )}

        {user.role === 'vendor' && currentView === 'settings' && (
          <SettingsPage
            user={user}
            onProfileUpdated={(updated) => setUser((prev) => ({ ...prev, ...updated }))}
          />
        )}

        {/* ── Customer Portal (PaySplit 2.0) ──────────── */}
        {user.role === 'customer' && (
          <CustomerDashboard user={user} />
        )}

        {/* ── Admin View ─────────────────────────────── */}
        {user.role === 'admin' && currentView === 'admin' && (
          <AdminDashboard />
        )}
      </main>
    </div>
  );
}
