import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: string; message: string; type: ToastType; }
interface ToastCtx { toast: (msg: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 inset-x-4 z-[300] pointer-events-none flex flex-col gap-2" dir="rtl">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl pointer-events-auto bg-white ${
                t.type === 'success' ? 'border border-green-100' :
                t.type === 'error' ? 'border border-red-100' : 'border border-blue-100'
              }`}
            >
              {t.type === 'success' && <CheckCircle size={18} className="text-green-500 shrink-0" />}
              {t.type === 'error' && <XCircle size={18} className="text-red-500 shrink-0" />}
              {t.type === 'info' && <Info size={18} className="text-blue-500 shrink-0" />}
              <p className={`text-sm font-bold ${
                t.type === 'success' ? 'text-green-800' :
                t.type === 'error' ? 'text-red-800' : 'text-blue-800'
              }`}>{t.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
