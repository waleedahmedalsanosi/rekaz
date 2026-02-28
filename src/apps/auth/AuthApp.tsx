import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronLeft, Shield } from 'lucide-react';
import { UserRole } from '../../shared/types';

type AuthStep = 'welcome' | 'role' | 'phone' | 'otp' | 'provider-setup' | 'admin-login';
type AuthRole = 'client' | 'provider';

interface Props { onLogin: (role: UserRole) => void; }

const SPECIALTIES = [
  { id: 'makeup', label: 'خبيرة مكياج', emoji: '💄' },
  { id: 'hair', label: 'مصففة شعر', emoji: '💇‍♀️' },
  { id: 'skincare', label: 'عناية بالبشرة', emoji: '✨' },
  { id: 'nails', label: 'متخصصة أظافر', emoji: '💅' },
];

const CITIES = ['الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة', 'أبها'];

const slide = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -32 },
  transition: { type: 'spring' as const, stiffness: 380, damping: 32 },
};

export default function AuthApp({ onLogin }: Props) {
  const [step, setStep] = useState<AuthStep>('welcome');
  const [role, setRole] = useState<AuthRole | null>(null);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [providerName, setProviderName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [adminPwd, setAdminPwd] = useState('');
  const [adminError, setAdminError] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  useEffect(() => {
    if (step === 'otp') otpRefs[0].current?.focus();
  }, [step]);

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 3) otpRefs[i + 1].current?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus();
  };

  const sendOtp = () => {
    if (phone.length < 9) return;
    setOtp(['', '', '', '']);
    setStep('otp');
    setCountdown(30);
    setTimeout(() => otpRefs[0].current?.focus(), 100);
  };

  const verifyOtp = () => {
    if (otp.join('') === '1234') {
      role === 'provider' ? setStep('provider-setup') : onLogin(UserRole.CLIENT);
    }
  };

  const finishProviderSetup = () => {
    if (providerName && specialty) onLogin(UserRole.PROVIDER);
  };

  const loginAdmin = () => {
    if (adminPwd === 'admin') {
      onLogin(UserRole.ADMIN);
    } else {
      setAdminError(true);
      setTimeout(() => setAdminError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col" dir="rtl">
      <AnimatePresence mode="wait">

        {/* ─── Welcome ─── */}
        {step === 'welcome' && (
          <motion.div key="welcome" {...slide}
            className="flex-1 flex flex-col items-center justify-between p-8 py-20 min-h-screen"
          >
            <div />
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                className="w-28 h-28 bg-orange-600 rounded-5xl flex items-center justify-center mx-auto shadow-2xl shadow-orange-200"
              >
                <Sparkles className="text-white" size={52} />
              </motion.div>
              <div>
                <h1 className="text-5xl font-black tracking-tight">ركاز</h1>
                <p className="text-gray-500 mt-3 text-base leading-relaxed">
                  منصة حجز خبيرات التجميل<br />ومصففات الشعر
                </p>
              </div>
            </div>
            <div className="w-full space-y-3">
              <button
                onClick={() => setStep('role')}
                className="w-full bg-black text-white py-5 rounded-3xl font-black text-lg"
              >
                ابدئي الآن
              </button>
              <button
                onClick={() => { setRole('client'); setStep('phone'); }}
                className="w-full py-3 text-sm font-bold text-gray-500"
              >
                لديكِ حساب بالفعل؟ <span className="text-orange-600">دخول</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Role ─── */}
        {step === 'role' && (
          <motion.div key="role" {...slide}
            className="flex-1 flex flex-col p-6 pt-14 min-h-screen"
          >
            <button onClick={() => setStep('welcome')} className="self-start p-2 -mr-2 mb-8 text-gray-600">
              <ChevronLeft size={26} />
            </button>
            <h2 className="text-3xl font-black mb-2">كيف تستخدمين ركاز؟</h2>
            <p className="text-gray-500 mb-8">اختاري ما يناسبكِ</p>

            <div className="space-y-4 flex-1">
              <button
                onClick={() => { setRole('client'); setStep('phone'); }}
                className="w-full p-6 bg-white rounded-4xl border-2 border-gray-100 text-right flex items-center gap-5 hover:border-blue-300 active:scale-[0.98] transition-all"
              >
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl shrink-0">👩</div>
                <div>
                  <h3 className="font-black text-lg">عميلة</h3>
                  <p className="text-sm text-gray-400 mt-0.5">أريد حجز خدمة تجميل</p>
                </div>
              </button>

              <button
                onClick={() => { setRole('provider'); setStep('phone'); }}
                className="w-full p-6 bg-white rounded-4xl border-2 border-gray-100 text-right flex items-center gap-5 hover:border-orange-300 active:scale-[0.98] transition-all"
              >
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-3xl shrink-0">💄</div>
                <div>
                  <h3 className="font-black text-lg">مبدعة</h3>
                  <p className="text-sm text-gray-400 mt-0.5">أقدم خدمات تجميل</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setStep('admin-login')}
              className="text-center text-xs text-gray-400 font-bold mt-8 py-2"
            >
              دخول لوحة الإدارة
            </button>
          </motion.div>
        )}

        {/* ─── Phone ─── */}
        {step === 'phone' && (
          <motion.div key="phone" {...slide}
            className="flex-1 flex flex-col p-6 pt-14 min-h-screen"
          >
            <button onClick={() => setStep(role ? 'role' : 'welcome')} className="self-start p-2 -mr-2 mb-8 text-gray-600">
              <ChevronLeft size={26} />
            </button>
            <h2 className="text-3xl font-black mb-2">رقم جوالك</h2>
            <p className="text-gray-500 mb-8">سنرسل لكِ رمز تحقق على هذا الرقم</p>

            <div className="flex gap-3 mb-6">
              <div className="px-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm font-bold text-gray-600 text-sm shrink-0">
                +966
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="5X XXX XXXX"
                maxLength={10}
                autoFocus
                className="flex-1 bg-white border border-gray-100 rounded-2xl px-4 py-4 text-base font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <button
              onClick={sendOtp}
              disabled={phone.length < 9}
              className="w-full bg-black text-white py-5 rounded-3xl font-black disabled:opacity-30 mt-auto"
            >
              أرسلي رمز التحقق
            </button>
          </motion.div>
        )}

        {/* ─── OTP ─── */}
        {step === 'otp' && (
          <motion.div key="otp" {...slide}
            className="flex-1 flex flex-col p-6 pt-14 min-h-screen"
          >
            <button onClick={() => setStep('phone')} className="self-start p-2 -mr-2 mb-8 text-gray-600">
              <ChevronLeft size={26} />
            </button>
            <h2 className="text-3xl font-black mb-2">رمز التحقق</h2>
            <p className="text-gray-500 mb-8">
              أدخلي الرمز المرسل إلى{' '}
              <span className="font-black text-gray-800">+966 {phone}</span>
            </p>

            <div className="flex gap-3 justify-center mb-6" dir="ltr">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKey(i, e)}
                  className="w-16 h-16 text-center text-2xl font-black bg-white border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 shadow-sm transition-all"
                />
              ))}
            </div>

            <p className="text-center text-xs mb-2">
              {countdown > 0 ? (
                <span className="text-gray-400">إعادة الإرسال بعد <span className="font-black text-gray-600">{countdown}ث</span></span>
              ) : (
                <button onClick={sendOtp} className="text-orange-600 font-bold">إعادة إرسال الرمز</button>
              )}
            </p>
            <p className="text-center text-[10px] text-gray-300 mb-8">رمز تجريبي: 1234</p>

            <button
              onClick={verifyOtp}
              disabled={otp.join('').length < 4}
              className="w-full bg-black text-white py-5 rounded-3xl font-black disabled:opacity-30 mt-auto"
            >
              تحقق
            </button>
          </motion.div>
        )}

        {/* ─── Provider Setup ─── */}
        {step === 'provider-setup' && (
          <motion.div key="setup" {...slide}
            className="flex-1 flex flex-col p-6 pt-14 pb-10 min-h-screen"
          >
            <h2 className="text-3xl font-black mb-2">أكملي ملفك ✨</h2>
            <p className="text-gray-500 mb-8">حتى تتمكني من استقبال الحجوزات</p>

            <div className="space-y-5 flex-1">
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block px-1">اسم متجرك أو اسمك</label>
                <input
                  value={providerName}
                  onChange={e => setProviderName(e.target.value)}
                  placeholder="مثال: ليلى للمكياج"
                  autoFocus
                  className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-4 font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block px-1">تخصصك</label>
                <div className="grid grid-cols-2 gap-3">
                  {SPECIALTIES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSpecialty(s.id)}
                      className={`p-4 rounded-2xl border-2 text-right transition-all active:scale-[0.97] ${
                        specialty === s.id
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-gray-100 bg-white'
                      }`}
                    >
                      <span className="text-2xl">{s.emoji}</span>
                      <p className="text-sm font-bold mt-1">{s.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block px-1">مدينتك</label>
                <select
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-4 font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none"
                >
                  <option value="">اختاري مدينتك</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={finishProviderSetup}
              disabled={!providerName || !specialty}
              className="w-full bg-black text-white py-5 rounded-3xl font-black disabled:opacity-30 mt-6"
            >
              ابدئي الاستقبال 🚀
            </button>
          </motion.div>
        )}

        {/* ─── Admin Login ─── */}
        {step === 'admin-login' && (
          <motion.div key="admin" {...slide}
            className="flex-1 flex flex-col p-6 pt-14 min-h-screen"
          >
            <button onClick={() => setStep('role')} className="self-start p-2 -mr-2 mb-8 text-gray-600">
              <ChevronLeft size={26} />
            </button>

            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
              <Shield size={32} className="text-purple-600" />
            </div>
            <h2 className="text-3xl font-black mb-2">دخول الإدارة</h2>
            <p className="text-gray-500 mb-8">للمسؤولين فقط</p>

            <motion.input
              animate={adminError ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              type="password"
              value={adminPwd}
              onChange={e => setAdminPwd(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loginAdmin()}
              placeholder="كلمة المرور"
              autoFocus
              className={`w-full bg-white border-2 rounded-2xl px-4 py-4 font-bold shadow-sm focus:outline-none mb-2 transition-colors ${
                adminError ? 'border-red-300 focus:ring-red-200' : 'border-gray-100 focus:ring-2 focus:ring-purple-400'
              }`}
            />
            {adminError && <p className="text-red-500 text-xs font-bold px-1 mb-4">كلمة المرور غير صحيحة</p>}
            <p className="text-[10px] text-gray-300 mb-8 mt-2 text-center">كلمة مرور تجريبية: admin</p>

            <button
              onClick={loginAdmin}
              disabled={!adminPwd}
              className="w-full bg-purple-600 text-white py-5 rounded-3xl font-black disabled:opacity-30 mt-auto"
            >
              دخول
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
