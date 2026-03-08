import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api, ApiUser, setToken } from '../../lib/api';
import { useToast } from '../../components/Toast';

type AuthStep = 'welcome' | 'role' | 'phone' | 'otp' | 'provider-setup' | 'admin-login';
type AuthRole = 'client' | 'provider';

interface Props { onLogin: (user: ApiUser, token: string) => void; }

const SPECIALTIES = [
  { id: 'خبيرة مكياج', label: 'خبيرة مكياج', icon: '💄' },
  { id: 'مصففة شعر', label: 'مصففة شعر', icon: '✂️' },
  { id: 'عناية بالبشرة', label: 'عناية بالبشرة', icon: '✨' },
  { id: 'متخصصة أظافر', label: 'متخصصة أظافر', icon: '💅' },
];

const CITIES = ['الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة', 'أبها'];

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { type: 'spring' as const, stiffness: 380, damping: 32 },
};

// ── Shared layout wrapper ──────────────────────────────────────────────────
function Screen({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className={`min-h-screen flex flex-col ${dark ? 'bg-[#1C1410]' : 'bg-[#FAF7F4]'}`}
      style={{ maxWidth: 430, margin: '0 auto', position: 'relative' }}
    >
      {children}
    </div>
  );
}

// ── Back button ───────────────────────────────────────────────────────────
function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 rounded-full bg-white border border-[#EDE8E2] flex items-center justify-center shadow-sm active:scale-95 transition-transform"
      style={{ marginBottom: 24 }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1410" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" transform="scale(-1,1) translate(-24,0)" />
      </svg>
    </button>
  );
}

export default function AuthApp({ onLogin }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<AuthStep>('welcome');
  const [role, setRole] = useState<AuthRole | null>(null);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [adminPwd, setAdminPwd] = useState('');
  const [adminError, setAdminError] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState<ApiUser | null>(null);
  const [pendingToken, setPendingToken] = useState<string>('');

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
    setOtpError(false);
    if (val && i < 3) otpRefs[i + 1].current?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus();
  };

  const sendOtp = async () => {
    if (phone.length < 9) return;
    setLoading(true);
    try {
      await api.auth.sendOtp(phone);
      setOtp(['', '', '', '']);
      setOtpError(false);
      setStep('otp');
      setCountdown(30);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (e: any) {
      toast(e.message || 'فشل إرسال الرمز', 'error');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      const { token, user } = await api.auth.verifyOtp(phone, otp.join(''), role || 'client');
      if (role === 'provider' && (!user.providerId || !specialty)) {
        setPendingUser(user);
        setPendingToken(token);
        setToken(token);
        setStep('provider-setup');
        setLoading(false);
        return;
      }
      onLogin(user, token);
    } catch (e: any) {
      setOtpError(true);
      setOtp(['', '', '', '']);
      otpRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const finishProviderSetup = async () => {
    if (!providerName || !specialty || !pendingUser || !pendingToken) return;
    setLoading(true);
    try {
      await api.providers.updateMe({ name: providerName, specialty, city });
      onLogin({ ...pendingUser, name: providerName }, pendingToken);
    } catch (e: any) {
      toast(e.message || 'حدث خطأ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loginAdmin = async () => {
    setLoading(true);
    try {
      const { token, user } = await api.auth.adminLogin(adminPwd);
      onLogin(user, token);
    } catch {
      setAdminError(true);
      setTimeout(() => setAdminError(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">

      {/* ── 00 Welcome ────────────────────────────────────────────────── */}
      {step === 'welcome' && (
        <motion.div key="welcome" {...slide}>
          <Screen dark>
            <div className="flex-1 flex flex-col items-center justify-between px-8 py-16 min-h-screen">
              {/* Logo area */}
              <div />
              <div className="flex flex-col items-center gap-6 text-center">
                {/* App icon */}
                <div
                  className="w-24 h-24 rounded-3xl flex items-center justify-center"
                  style={{ background: '#C9956A' }}
                >
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>

                {/* Title */}
                <div>
                  <h1 className="text-5xl font-black text-white tracking-tight">زينة</h1>
                  <p className="text-[#C9956A] text-xs font-semibold tracking-[0.2em] mt-1">ZIENA</p>
                </div>

                {/* Tagline */}
                <div>
                  <p className="text-2xl font-bold text-white leading-snug">اكتشفي جمالك مع أفضل</p>
                  <p className="text-2xl font-bold text-white leading-snug">متخصصات التجميل</p>
                  <p className="text-sm text-[#8B7355] mt-3 leading-relaxed">
                    احجزي مكياجك وتسريحتك في دقائق<br />مع متخصصات موثوقات في الرياض
                  </p>
                </div>

                {/* Dots */}
                <div className="flex gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-[#C9956A]" />
                  <div className="w-2 h-2 rounded-full bg-[#3A2E25]" />
                  <div className="w-2 h-2 rounded-full bg-[#3A2E25]" />
                </div>
              </div>

              {/* Buttons */}
              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={() => setStep('role')}
                  className="w-full py-4 rounded-2xl font-bold text-base text-white active:scale-[0.98] transition-transform"
                  style={{ background: '#C9956A' }}
                >
                  ابدأي الآن
                </button>
                <button
                  onClick={() => { setRole('client'); setStep('phone'); }}
                  className="w-full py-4 rounded-2xl font-bold text-base border active:scale-[0.98] transition-transform"
                  style={{ borderColor: '#3A2E25', color: '#8B7355', background: 'transparent' }}
                >
                  تسجيل الدخول
                </button>
              </div>
            </div>
          </Screen>
        </motion.div>
      )}

      {/* ── 05 Role Select ────────────────────────────────────────────── */}
      {step === 'role' && (
        <motion.div key="role" {...slide}>
          <Screen>
            <div className="flex-1 flex flex-col px-6 pt-14 pb-10 min-h-screen">
              <BackBtn onClick={() => setStep('welcome')} />

              <h2 className="text-3xl font-black text-[#1C1410] leading-snug mb-2">كيف ستستخدمين<br />زينة؟</h2>
              <p className="text-[#8B7355] text-sm mb-8">اختاري نوع حسابك لإعداد تجربة مخصصة لك</p>

              <div className="flex flex-col gap-4 flex-1">
                {/* Client card */}
                <button
                  onClick={() => setRole(role === 'client' ? null : 'client')}
                  className="w-full p-5 rounded-2xl border-2 text-right flex items-center gap-4 active:scale-[0.98] transition-all"
                  style={{
                    borderColor: role === 'client' ? '#C9956A' : '#EDE8E2',
                    background: role === 'client' ? '#FFF8F3' : 'white',
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#FAF7F4' }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9956A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-[#1C1410] text-lg">عميلة</h3>
                    <p className="text-sm text-[#8B7355] mt-0.5">احجزي خدمات مكياج وتسريحات</p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: role === 'client' ? '#C9956A' : '#EDE8E2', background: role === 'client' ? '#C9956A' : 'transparent' }}
                  >
                    {role === 'client' && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Provider card */}
                <button
                  onClick={() => setRole(role === 'provider' ? null : 'provider')}
                  className="w-full p-5 rounded-2xl border-2 text-right flex items-center gap-4 active:scale-[0.98] transition-all"
                  style={{
                    borderColor: role === 'provider' ? '#C9956A' : '#EDE8E2',
                    background: role === 'provider' ? '#FFF8F3' : 'white',
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#FAF7F4' }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9956A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-[#1C1410] text-lg">متخصصة تجميل</h3>
                    <p className="text-sm text-[#8B7355] mt-0.5">قدّمي خدماتك واحصلي على حجوزات جديدة</p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: role === 'provider' ? '#C9956A' : '#EDE8E2', background: role === 'provider' ? '#C9956A' : 'transparent' }}
                  >
                    {role === 'provider' && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
              </div>

              <button
                onClick={() => role && setStep('phone')}
                disabled={!role}
                className="w-full py-4 rounded-2xl font-bold text-base text-white mt-6 active:scale-[0.98] transition-all disabled:opacity-40"
                style={{ background: '#C9956A' }}
              >
                متابعة
              </button>

              <button
                onClick={() => setStep('admin-login')}
                className="text-center text-xs text-[#8B7355] mt-4 py-2"
              >
                دخول لوحة الإدارة
              </button>
            </div>
          </Screen>
        </motion.div>
      )}

      {/* ── 01 Login (Phone) ──────────────────────────────────────────── */}
      {step === 'phone' && (
        <motion.div key="phone" {...slide}>
          <Screen>
            <div className="flex-1 flex flex-col px-6 pt-14 pb-10 min-h-screen">
              <BackBtn onClick={() => setStep('role')} />

              <h2 className="text-3xl font-black text-[#1C1410] mb-2">تسجيل الدخول</h2>
              <p className="text-[#8B7355] text-sm mb-8">أدخلي رقم جوالك وسنرسل لك رمز التحقق</p>

              {/* Phone input */}
              <div className="mb-2">
                <label className="text-xs font-bold text-[#8B7355] mb-2 block">رقم الجوال</label>
                <div className="flex gap-3">
                  <div
                    className="px-4 py-4 rounded-2xl border font-bold text-[#1C1410] text-sm flex-shrink-0"
                    style={{ borderColor: '#EDE8E2', background: '#EDE8E2' }}
                  >
                    +966
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="5X XXX XXXX"
                    maxLength={10}
                    autoFocus
                    className="flex-1 rounded-2xl border px-4 py-4 text-base font-bold focus:outline-none transition-colors"
                    style={{
                      borderColor: '#EDE8E2',
                      background: 'white',
                      color: '#1C1410',
                    }}
                    onFocus={e => e.target.style.borderColor = '#C9956A'}
                    onBlur={e => e.target.style.borderColor = '#EDE8E2'}
                  />
                </div>
              </div>

              <p className="text-xs text-[#8B7355] mb-8">رقم تجريبي: 0555123456</p>

              <button
                onClick={sendOtp}
                disabled={phone.length < 9 || loading}
                className="w-full py-4 rounded-2xl font-bold text-base text-white mt-auto active:scale-[0.98] transition-all disabled:opacity-40"
                style={{ background: '#C9956A' }}
              >
                {loading ? '...' : 'إرسال رمز التحقق'}
              </button>
            </div>
          </Screen>
        </motion.div>
      )}

      {/* ── 02 OTP Verify ────────────────────────────────────────────── */}
      {step === 'otp' && (
        <motion.div key="otp" {...slide}>
          <Screen>
            <div className="flex-1 flex flex-col px-6 pt-14 pb-10 min-h-screen">
              <BackBtn onClick={() => setStep('phone')} />

              <h2 className="text-3xl font-black text-[#1C1410] mb-2">التحقق من الرقم</h2>
              <p className="text-[#8B7355] text-sm mb-8">
                أدخلي الرمز المرسل إلى{' '}
                <span className="font-black text-[#1C1410]">+966 {phone}</span>
              </p>

              {/* Error banner (Screen 03 pattern) */}
              <AnimatePresence>
                {otpError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-3 rounded-2xl p-4 mb-4"
                    style={{ background: '#FFF0F0', border: '1px solid #E05A5A30' }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E05A5A20' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E05A5A" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-[#E05A5A]">رمز التحقق غير صحيح، حاولي مرة أخرى</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* OTP boxes */}
              <div className="flex gap-3 justify-center mb-4" dir="ltr">
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
                    className="w-16 h-16 text-center text-2xl font-black rounded-2xl border-2 focus:outline-none transition-all"
                    style={{
                      borderColor: otpError ? '#E05A5A' : d ? '#C9956A' : '#EDE8E2',
                      background: 'white',
                      color: '#1C1410',
                    }}
                  />
                ))}
              </div>

              {/* Resend */}
              <p className="text-center text-sm mb-1">
                {countdown > 0 ? (
                  <span className="text-[#8B7355]">إعادة الإرسال بعد <span className="font-black text-[#1C1410]">{countdown}ث</span></span>
                ) : (
                  <button onClick={sendOtp} className="font-bold" style={{ color: '#C9956A' }}>إعادة إرسال الرمز</button>
                )}
              </p>
              <p className="text-center text-xs text-[#8B7355] mb-8">رمز تجريبي: 1234</p>

              <button
                onClick={verifyOtp}
                disabled={otp.join('').length < 4 || loading}
                className="w-full py-4 rounded-2xl font-bold text-base text-white mt-auto active:scale-[0.98] transition-all disabled:opacity-40"
                style={{ background: '#C9956A' }}
              >
                {loading ? '...' : 'تحقق'}
              </button>
            </div>
          </Screen>
        </motion.div>
      )}

      {/* ── 30 Provider Setup ─────────────────────────────────────────── */}
      {step === 'provider-setup' && (
        <motion.div key="setup" {...slide}>
          <Screen>
            <div className="flex-1 flex flex-col px-6 pt-14 pb-10 min-h-screen">
              <h2 className="text-3xl font-black text-[#1C1410] mb-2">استكمال الملف الشخصي</h2>
              <p className="text-[#8B7355] text-sm mb-8">أضيفي بياناتك حتى تتمكني من استقبال الحجوزات</p>

              <div className="flex flex-col gap-5 flex-1">
                <div>
                  <label className="text-xs font-bold text-[#8B7355] mb-2 block">اسمك أو اسم متجرك</label>
                  <input
                    value={providerName}
                    onChange={e => setProviderName(e.target.value)}
                    placeholder="مثال: ليلى للمكياج"
                    autoFocus
                    className="w-full rounded-2xl border px-4 py-4 font-bold focus:outline-none transition-colors"
                    style={{ borderColor: '#EDE8E2', background: 'white', color: '#1C1410' }}
                    onFocus={e => e.target.style.borderColor = '#C9956A'}
                    onBlur={e => e.target.style.borderColor = '#EDE8E2'}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#8B7355] mb-2 block">تخصصك</label>
                  <div className="grid grid-cols-2 gap-3">
                    {SPECIALTIES.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSpecialty(s.id)}
                        className="p-4 rounded-2xl border-2 text-right transition-all active:scale-[0.97]"
                        style={{
                          borderColor: specialty === s.id ? '#C9956A' : '#EDE8E2',
                          background: specialty === s.id ? '#FFF8F3' : 'white',
                        }}
                      >
                        <span className="text-2xl">{s.icon}</span>
                        <p className="text-sm font-bold mt-1 text-[#1C1410]">{s.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#8B7355] mb-2 block">مدينتك</label>
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full rounded-2xl border px-4 py-4 font-bold focus:outline-none appearance-none transition-colors"
                    style={{ borderColor: '#EDE8E2', background: 'white', color: city ? '#1C1410' : '#8B7355' }}
                  >
                    <option value="">اختاري مدينتك</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={finishProviderSetup}
                disabled={!providerName || !specialty || loading}
                className="w-full py-4 rounded-2xl font-bold text-base text-white mt-6 active:scale-[0.98] transition-all disabled:opacity-40"
                style={{ background: '#C9956A' }}
              >
                {loading ? '...' : 'ابدئي الاستقبال'}
              </button>
            </div>
          </Screen>
        </motion.div>
      )}

      {/* ── Admin Login ────────────────────────────────────────────────── */}
      {step === 'admin-login' && (
        <motion.div key="admin" {...slide}>
          <Screen>
            <div className="flex-1 flex flex-col px-6 pt-14 pb-10 min-h-screen">
              <BackBtn onClick={() => setStep('role')} />

              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: '#1C1410' }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>

              <h2 className="text-3xl font-black text-[#1C1410] mb-2">دخول الإدارة</h2>
              <p className="text-[#8B7355] text-sm mb-8">للمسؤولين فقط</p>

              <label className="text-xs font-bold text-[#8B7355] mb-2 block">كلمة المرور</label>
              <motion.input
                animate={adminError ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.35 }}
                type="password"
                value={adminPwd}
                onChange={e => setAdminPwd(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loginAdmin()}
                placeholder="أدخلي كلمة المرور"
                autoFocus
                className="w-full rounded-2xl border-2 px-4 py-4 font-bold focus:outline-none mb-2 transition-colors"
                style={{
                  borderColor: adminError ? '#E05A5A' : '#EDE8E2',
                  background: 'white',
                  color: '#1C1410',
                }}
              />
              {adminError && <p className="text-sm font-bold mb-4" style={{ color: '#E05A5A' }}>كلمة المرور غير صحيحة</p>}
              <p className="text-xs text-[#8B7355] mb-8 text-center">كلمة مرور تجريبية: admin</p>

              <button
                onClick={loginAdmin}
                disabled={!adminPwd || loading}
                className="w-full py-4 rounded-2xl font-bold text-base text-white mt-auto active:scale-[0.98] transition-all disabled:opacity-40"
                style={{ background: '#1C1410' }}
              >
                {loading ? '...' : 'دخول'}
              </button>
            </div>
          </Screen>
        </motion.div>
      )}

    </AnimatePresence>
  );
}
