import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, CreditCard, Settings, TrendingUp, Star, LogOut,
  PieChart, ChevronRight, Plus, ArrowLeft, CheckCircle, AlertCircle,
  ShieldCheck, ShieldOff, Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid, XAxis, YAxis,
} from 'recharts';
import { SUBSCRIPTION_PLANS } from '../../shared/mockData';
import { api, ApiProvider, ApiDispute, ApiPayoutRequest, ApiAdminStats } from '../../lib/api';
import { useToast } from '../../shared/Toast';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminApp() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subView, setSubView] = useState<string | null>(null);

  const [stats, setStats] = useState<ApiAdminStats | null>(null);
  const [disputes, setDisputes] = useState<ApiDispute[]>([]);
  const [payouts, setPayouts] = useState<ApiPayoutRequest[]>([]);
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [revenueData, setRevenueData] = useState<{ date: string; revenue: number }[]>([]);
  const [resolutionInput, setResolutionInput] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<ApiDispute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, d, p, prov, rev] = await Promise.all([
        api.admin.stats(),
        api.admin.disputes(),
        api.admin.payouts(),
        api.admin.providers(),
        api.admin.revenue(),
      ]);
      setStats(s);
      setDisputes(d);
      setPayouts(p);
      setProviders(prov);
      setRevenueData(rev.map(r => ({ date: r.date, revenue: r.revenue })));
    } catch (e: any) {
      toast(e.message || 'خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }

  const openDisputesCount = disputes.filter(d => d.status === 'OPEN').length;
  const pendingPayoutsCount = payouts.filter(p => p.status === 'PENDING').length;

  const bottomNavItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: TrendingUp },
    { id: 'providers', label: 'المبدعات', icon: Users },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  const toggleVerification = async (providerId: string) => {
    try {
      const res = await api.admin.verifyProvider(providerId);
      setProviders(prev => prev.map(p =>
        p.id === providerId ? { ...p, isVerified: res.isVerified } : p
      ));
      toast(res.isVerified ? 'تم توثيق المبدعة' : 'تم إلغاء التوثيق', 'success');
    } catch (e: any) {
      toast(e.message || 'حدث خطأ', 'error');
    }
  };

  const resolveDispute = async (disputeId: string, resolution: string, favorClient: boolean) => {
    try {
      await api.admin.resolveDispute(disputeId, resolution, favorClient);
      setDisputes(prev => prev.map(d =>
        d.id === disputeId ? { ...d, status: 'RESOLVED', resolution } : d
      ));
      setSelectedDispute(null);
      setResolutionInput('');
      toast('تم حل النزاع', 'success');
    } catch (e: any) {
      toast(e.message || 'حدث خطأ', 'error');
    }
  };

  const processPayout = async (payoutId: string, approved: boolean) => {
    try {
      const res = await api.admin.processPayout(payoutId, approved);
      setPayouts(prev => prev.map(p =>
        p.id === payoutId ? { ...p, status: res.status as any } : p
      ));
      toast(approved ? 'تمت الموافقة على السحب' : 'تم رفض السحب', approved ? 'success' : 'info');
    } catch (e: any) {
      toast(e.message || 'حدث خطأ', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center" dir="rtl">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">لوحة الإدارة 👑</h2>
          <p className="text-sm text-gray-500">إحصائيات المنصة الشاملة</p>
        </div>
        <div className="flex gap-2">
          {openDisputesCount > 0 && (
            <div className="flex items-center gap-1 bg-red-50 text-red-600 text-[10px] font-black px-2 py-1 rounded-xl border border-red-100">
              <AlertCircle size={12} />
              <span>{openDisputesCount} نزاع</span>
            </div>
          )}
          {pendingPayoutsCount > 0 && (
            <div className="flex items-center gap-1 bg-orange-50 text-orange-600 text-[10px] font-black px-2 py-1 rounded-xl border border-orange-100">
              <Wallet size={12} />
              <span>{pendingPayoutsCount} سحب</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'إجمالي العمولات (2%)', value: `${(stats?.totalCommissions || 0).toLocaleString()} ﷼`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'اشتراكات نشطة', value: String(stats?.activeSubscriptions || 0), icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'تقييم المنصة', value: `${stats?.platformRating || 0}/5`, icon: Star, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'عدد المبدعات', value: String(stats?.providerCount || 0), icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={i} className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase">{stat.label}</p>
            <h3 className="text-lg font-black">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Top Providers */}
      {stats?.topProviders && stats.topProviders.length > 0 && (
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
          <h3 className="font-bold mb-4">أعلى المبدعات دخلاً</h3>
          <div className="space-y-4">
            {stats.topProviders.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                <div>
                  <p className="font-bold text-sm">{p.name}</p>
                  <p className="text-[10px] text-gray-400">الدخل: {p.totalIncome.toLocaleString()} ﷼</p>
                </div>
                <p className="text-xs font-black text-purple-600">
                  العمولة: {Math.round(p.totalIncome * 0.02).toLocaleString()} ﷼
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {(openDisputesCount > 0 || pendingPayoutsCount > 0) && (
        <div className="space-y-3">
          <h3 className="font-bold">يحتاج متابعة</h3>
          {openDisputesCount > 0 && (
            <button
              onClick={() => setSubView('disputes')}
              className="w-full p-4 bg-red-50 rounded-3xl border border-red-100 flex items-center gap-4 text-right"
            >
              <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shrink-0">
                <AlertCircle size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-red-700">{openDisputesCount} نزاع مفتوح</p>
                <p className="text-[10px] text-red-500">يحتاج حل فوري</p>
              </div>
              <ChevronRight size={16} className="text-red-400" />
            </button>
          )}
          {pendingPayoutsCount > 0 && (
            <button
              onClick={() => setSubView('payouts')}
              className="w-full p-4 bg-orange-50 rounded-3xl border border-orange-100 flex items-center gap-4 text-right"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shrink-0">
                <Wallet size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-orange-700">{pendingPayoutsCount} طلب سحب معلّق</p>
                <p className="text-[10px] text-orange-500">بانتظار الموافقة</p>
              </div>
              <ChevronRight size={16} className="text-orange-400" />
            </button>
          )}
        </div>
      )}
    </div>
  );

  // ─── Providers List ───────────────────────────────────────────────────────
  const renderProviders = () => (
    <div className="space-y-6 pb-24">
      <h2 className="text-2xl font-black">المبدعات</h2>
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm divide-y divide-gray-50">
        {providers.map((provider) => (
          <div key={provider.id} className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0">
              <img src={provider.avatar || `https://picsum.photos/seed/${provider.id}/100/100`} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm">{provider.name}</h4>
                {provider.isVerified ? (
                  <span className="flex items-center gap-0.5 text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                    <ShieldCheck size={9} /> موثّقة
                  </span>
                ) : (
                  <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    غير موثّقة
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400">{provider.specialty}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-orange-500">{provider.rating} ★</span>
                <span className="text-[10px] text-gray-300">•</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                  provider.subscriptionTier === 'pro' ? 'bg-purple-50 text-purple-600' :
                  provider.subscriptionTier === 'basic' ? 'bg-blue-50 text-blue-600' :
                  'bg-gray-50 text-gray-400'
                }`}>
                  {provider.subscriptionTier === 'pro' ? 'برو' : provider.subscriptionTier === 'basic' ? 'أساسية' : 'مجانية'}
                </span>
              </div>
            </div>
            <button
              onClick={() => toggleVerification(provider.id)}
              className={`p-2 rounded-xl transition-colors ${
                provider.isVerified
                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              {provider.isVerified ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
            </button>
            <ChevronRight size={16} className="text-gray-300" />
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Disputes ─────────────────────────────────────────────────────────────
  const renderDisputes = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={() => { setSubView(null); setSelectedDispute(null); }} className="p-2 bg-white rounded-xl shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-black">النزاعات</h2>
        <span className="text-xs font-black bg-red-50 text-red-600 px-2 py-1 rounded-xl">
          {openDisputesCount} مفتوح
        </span>
      </div>

      {disputes.length === 0 ? (
        <div className="p-12 bg-white rounded-4xl border border-gray-100 text-center">
          <CheckCircle size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-bold">لا توجد نزاعات</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map(dispute => (
            <div key={dispute.id} className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden">
              <div className={`px-5 py-3 text-xs font-black ${
                dispute.status === 'OPEN' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
              }`}>
                {dispute.status === 'OPEN' ? '● مفتوح — يحتاج حل' : '✓ محلول'}
              </div>
              <div className="p-5">
                <p className="font-bold text-sm mb-1">الحجز: #{dispute.bookingId.slice(0,8)}</p>
                <p className="text-xs text-gray-500 mb-3">{dispute.reason}</p>
                <p className="text-[10px] text-gray-400 mb-4">{new Date(dispute.createdAt).toLocaleDateString('ar-SA')}</p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-blue-50 rounded-2xl">
                    <p className="text-[9px] font-black text-blue-500 mb-1">العميلة</p>
                    <p className="text-xs font-bold">{dispute.clientName}</p>
                    <p className="text-[10px] text-blue-600 font-bold mt-0.5">{dispute.clientPhone}</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-2xl">
                    <p className="text-[9px] font-black text-orange-500 mb-1">المبدعة</p>
                    <p className="text-xs font-bold">{dispute.providerName}</p>
                    <p className="text-[10px] text-orange-600 font-bold mt-0.5">{dispute.providerPhone}</p>
                  </div>
                </div>

                {dispute.status === 'OPEN' ? (
                  <div className="space-y-3">
                    <textarea
                      value={selectedDispute?.id === dispute.id ? resolutionInput : ''}
                      onChange={e => { setSelectedDispute(dispute); setResolutionInput(e.target.value); }}
                      placeholder="سجّل قرارك وسبب الحل..."
                      rows={2}
                      className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveDispute(dispute.id, `صالح العميلة — ${resolutionInput}`, true)}
                        disabled={!resolutionInput.trim()}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black disabled:opacity-40"
                      >
                        صالح العميلة
                      </button>
                      <button
                        onClick={() => resolveDispute(dispute.id, `صالح المبدعة — ${resolutionInput}`, false)}
                        disabled={!resolutionInput.trim()}
                        className="flex-1 py-3 bg-orange-600 text-white rounded-2xl text-xs font-black disabled:opacity-40"
                      >
                        صالح المبدعة
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 rounded-2xl">
                    <p className="text-[10px] font-black text-green-600 mb-1">القرار النهائي</p>
                    <p className="text-xs text-gray-700">{dispute.resolution}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Payouts ─────────────────────────────────────────────────────────────
  const renderPayouts = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={() => setSubView(null)} className="p-2 bg-white rounded-xl shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-black">طلبات السحب</h2>
        {pendingPayoutsCount > 0 && (
          <span className="text-xs font-black bg-orange-50 text-orange-600 px-2 py-1 rounded-xl">
            {pendingPayoutsCount} معلّق
          </span>
        )}
      </div>

      {payouts.length === 0 ? (
        <div className="p-12 bg-white rounded-4xl border border-gray-100 text-center">
          <Wallet size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-bold">لا توجد طلبات سحب</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map(payout => (
            <div key={payout.id} className="bg-white rounded-4xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold">{payout.providerName}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5" dir="ltr">{payout.iban}</p>
                  <p className="text-[10px] text-gray-400">{new Date(payout.createdAt).toLocaleDateString('ar-SA')}</p>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-black text-orange-600">{payout.amount.toLocaleString()} ﷼</p>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block mt-1 ${
                    payout.status === 'PENDING' ? 'bg-orange-50 text-orange-600' :
                    payout.status === 'COMPLETED' ? 'bg-green-50 text-green-600' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {payout.status === 'PENDING' ? 'معلّق' : payout.status === 'COMPLETED' ? 'مكتمل' : 'مرفوض'}
                  </span>
                </div>
              </div>
              {payout.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => processPayout(payout.id, true)}
                    className="flex-1 py-3 bg-green-600 text-white rounded-2xl text-xs font-black"
                  >
                    ✓ موافقة وتحويل
                  </button>
                  <button
                    onClick={() => processPayout(payout.id, false)}
                    className="flex-1 py-3 bg-red-50 text-red-600 rounded-2xl text-xs font-black"
                  >
                    رفض
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Subscriptions ────────────────────────────────────────────────────────
  const renderSubscriptions = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={() => setSubView(null)} className="p-2 bg-white rounded-xl shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-black">باقات المنصة</h2>
      </div>
      <div className="space-y-4">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <div key={plan.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-2 h-full ${
              plan.name === 'برو' ? 'bg-purple-600' :
              plan.name === 'أساسية' ? 'bg-blue-500' : 'bg-gray-300'
            }`} />
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-black text-lg">{plan.name}</h4>
                <p className="text-[10px] text-gray-400 font-bold">
                  {plan.maxBookings ? `${plan.maxBookings} حجزة/شهر` : 'غير محدود'} •
                  {plan.maxServices ? ` ${plan.maxServices} خدمة` : ' خدمات غير محدودة'}
                </p>
              </div>
              {plan.priceMonthly === 0 ? (
                <span className="text-2xl font-black text-gray-400">مجاناً</span>
              ) : (
                <div className="text-left">
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-black text-purple-600">{plan.priceMonthly}</span>
                    <span className="text-xs text-gray-400 mb-1">﷼/شهر</span>
                  </div>
                  <p className="text-[10px] text-gray-400">{plan.priceYearly} ﷼/سنة</p>
                </div>
              )}
            </div>
            <div className="space-y-1.5 mt-4">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle size={12} className="text-green-500 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Reports ─────────────────────────────────────────────────────────────
  const renderReports = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={() => setSubView(null)} className="p-2 bg-white rounded-xl shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-black">تقارير المنصة</h2>
      </div>
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <h3 className="font-bold mb-6">نمو الإيرادات</h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData.length > 0 ? revenueData : [{ date: '-', revenue: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'إجمالي العمولات', value: `${(stats?.totalCommissions || 0).toLocaleString()} ﷼`, color: 'text-green-600' },
          { label: 'اشتراكات نشطة', value: String(stats?.activeSubscriptions || 0), color: 'text-purple-600' },
          { label: 'إجمالي الحجوزات', value: String(stats?.totalBookings || 0), color: 'text-orange-600' },
          { label: 'نزاعات مفتوحة', value: String(openDisputesCount), color: 'text-blue-600' },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <p className={`text-xs font-bold ${s.color} mb-1`}>{s.label}</p>
            <h3 className="text-xl font-black">{s.value}</h3>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Settings ─────────────────────────────────────────────────────────────
  const renderSettings = () => {
    const settingsItems = [
      { id: 'billing', label: 'إدارة الباقات', icon: CreditCard },
      { id: 'disputes', label: 'النزاعات', icon: AlertCircle, badge: openDisputesCount },
      { id: 'payouts', label: 'طلبات السحب', icon: Wallet, badge: pendingPayoutsCount },
      { id: 'reports', label: 'تقارير المنصة', icon: PieChart },
    ];

    return (
      <div className="space-y-6 pb-24">
        <h2 className="text-2xl font-black">الإعدادات</h2>
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 bg-gradient-to-br from-purple-600 to-purple-700 text-white flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl border-4 border-white/20 overflow-hidden">
              <img src="https://picsum.photos/seed/admin/100/100" alt="" />
            </div>
            <div>
              <h3 className="font-black text-lg">إدارة زينة</h3>
              <p className="text-xs text-white/80">مدير النظام</p>
            </div>
            <button onClick={logout} className="mr-auto p-2 bg-white/20 rounded-xl">
              <LogOut size={18} />
            </button>
          </div>
          <div className="p-4 space-y-2">
            {settingsItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSubView(item.id)}
                className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 rounded-2xl transition-colors"
              >
                <div className="p-2 bg-gray-50 rounded-xl text-gray-500 relative">
                  <item.icon size={18} />
                  {(item.badge ?? 0) > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">
                      {item.badge}
                    </div>
                  )}
                </div>
                <span className="text-sm font-bold flex-1 text-right">{item.label}</span>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans" dir="rtl">
      <main className="px-5 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={subView || activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {subView === 'billing' && renderSubscriptions()}
            {subView === 'reports' && renderReports()}
            {subView === 'disputes' && renderDisputes()}
            {subView === 'payouts' && renderPayouts()}
            {!subView && (
              <>
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'providers' && renderProviders()}
                {activeTab === 'settings' && renderSettings()}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 py-3 pb-8 flex justify-around items-center z-50">
        {bottomNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id); setSubView(null); }}
            className="relative flex flex-col items-center gap-1 group"
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${
              activeTab === item.id && !subView
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 -translate-y-1'
                : 'text-gray-400 group-hover:bg-gray-50'
            }`}>
              <item.icon size={22} strokeWidth={activeTab === item.id && !subView ? 2.5 : 2} />
            </div>
            {item.id === 'settings' && (openDisputesCount + pendingPayoutsCount) > 0 && (
              <div className="absolute -top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">
                {openDisputesCount + pendingPayoutsCount}
              </div>
            )}
            <span className={`text-[10px] font-bold transition-all ${
              activeTab === item.id && !subView ? 'text-purple-600 opacity-100' : 'text-gray-400 opacity-0'
            }`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
