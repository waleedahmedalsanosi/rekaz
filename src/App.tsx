import React, { useState } from 'react';
import { UserRole } from './shared/types';
import AdminApp from './apps/admin/AdminApp';
import ProviderApp from './apps/provider/ProviderApp';
import ClientApp from './apps/client/ClientApp';
import AuthApp from './apps/auth/AuthApp';
import { ToastProvider } from './shared/Toast';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  return (
    <ToastProvider>
      <div className="relative">
        <AnimatePresence mode="wait">
          {!userRole ? (
            <motion.div
              key="auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <AuthApp onLogin={setUserRole} />
            </motion.div>
          ) : (
            <motion.div
              key={userRole}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Demo role switcher */}
              <button
                onClick={() => setUserRole(null)}
                className="fixed top-4 left-4 z-100 bg-black/10 backdrop-blur-md text-black px-3 py-1.5 rounded-full text-[10px] font-bold hover:bg-black/20 transition-colors"
              >
                تغيير الحساب
              </button>

              {userRole === UserRole.ADMIN && <AdminApp />}
              {userRole === UserRole.PROVIDER && <ProviderApp />}
              {userRole === UserRole.CLIENT && <ClientApp />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastProvider>
  );
}
