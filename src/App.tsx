import React from 'react';
import { UserRole } from './shared/types';
import AdminApp from './apps/admin/AdminApp';
import ProviderApp from './apps/provider/ProviderApp';
import ClientApp from './apps/client/ClientApp';
import AuthApp from './apps/auth/AuthApp';
import { ToastProvider } from './shared/Toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

function AppInner() {
  const { user, isLoading, login, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <AuthApp onLogin={login} />
          </motion.div>
        ) : (
          <motion.div
            key={user.role}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Account switcher */}
            <button
              onClick={logout}
              className="fixed top-4 left-4 z-[100] bg-black/10 backdrop-blur-md text-black px-3 py-1.5 rounded-full text-[10px] font-bold hover:bg-black/20 transition-colors"
            >
              تغيير الحساب
            </button>

            {user.role === UserRole.ADMIN && <AdminApp />}
            {user.role === UserRole.PROVIDER && <ProviderApp />}
            {user.role === UserRole.CLIENT && <ClientApp />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </AuthProvider>
  );
}
