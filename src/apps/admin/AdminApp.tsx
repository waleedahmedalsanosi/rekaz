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
import { SUBSCRIPTION_PLANS } from '../../lib/mockData';
import { api, ApiProvider, ApiDispute, ApiPayoutRequest, ApiAdminStats, ApiBooking } from '../../lib/api';
import { useToast } from '../../components/Toast';
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
  const [providerSearch, setProviderSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider | null>(null);
  const [adminBookings, setAdminBookings] = useState<ApiBooking[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, d, p, prov, rev, bookings] = await Promise.all([
        api.admin.stats(),
        api.admin.disputes(),
        api.admin.payouts(),
        api.admin.providers(),
        api.admin.revenue(),
        api.bookings.list(),
      ]);
      setStats(s);
      setDisputes(d);
      setPayouts(p);
      setProviders(prov);
      setRevenueData(rev.map(r => ({ date: r.date, revenue: r.revenue })));
      setAdminBookings(bookings);
    } catch (e: any) {
      toast(e.message || 'خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }

  const openDisputesCount = disputes.filter(d => d.status === 'OPEN').length;
  const pendingPayoutsCount = payouts.filter(p => p.status === 'PENDING').length;

  const bottomNavItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: TrendingUp, badge: 0 },
    { id: 'bookings_admin', label: 'الحجوزات', icon: Calendar, badge: 0 },
    { id: 'providers', label: 'المتخصصات', icon: Users, badge: 0 },
    { id: 'disputes', label: 'النزاعات', icon: AlertCircle, badge: openDisputesCount },
    { id: 'payouts', label: 'السحوبات', icon: Wallet, badge: pendingPayoutsCount },
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
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center" dir="rtl">
        <div className="w-10 h-10 border-4 border-[#C9956A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pt-2">
        <div className="w-11 h-11 rounded-full bg-[#1C1410] flex items-center justify-center text-white font-black text-lg">
          إ
        </div>
        <div className="text-right">
          <p className="text-xs text-[#8B7355]">لوحة الإدارة</p>
          <h1 className="text-3xl font-black text-[#1C1410]">زينة</h1>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Revenue - full width dark card */}
        <div className="col-span-2 bg-[#1C1410] rounded-3xl p-5 text-white">
          <p className="text-xs text-white/50 mb-1 text-right">إجمالي الأرباح</p>
          <h2 className="text-3xl font-black text-right">{(stats?.totalCommissions || 0).toLocaleString()} <span className="text-xl font-bold">ريال</span></h2>
          {stats?.revenueGrowth != null && (
            <p className="text-xs text-green-400 font-bold text-right mt-1">↗ +{stats.revenueGrowth}% هذا الشهر</p>
          )}
        </div>
        {/* Providers */}
        <div className="bg-white rounded-3xl border border-[#EDE8E2] p-4">
          <p className="text-xs text-[#8B7355] text-right mb-1">المتخصصات</p>
          <h3 className="text-2xl font-black text-right text-[#1C1410]">{stats?.providerCount || 0}</h3>
          {(stats as any)?.newProvidersThisMonth != null && (
            <p className="text-[10px] text-[#C9956A] font-bold text-right">↗ +{(stats as any).newProvidersThisMonth} هذا الشهر</p>
          )}
        </div>
        {/* Bookings */}
        <div className="bg-white rounded-3xl border border-[#EDE8E2] p-4">
          <p className="text-xs text-[#8B7355] text-right mb-1">الحجوزات</p>
          <h3 className="text-2xl font-black text-right text-[#1C1410]">{stats?.bookingCount || 0}</h3>
          <p className="text-[10px] text-[#8B7355] font-bold text-right">هذا الشهر</p>
        </div>
        {/* Clients */}
        <div className="col-span-2 bg-white rounded-3xl border border-[#EDE8E2] p-4 flex items-center justify-between">
          <p className="text-[10px] text-[#C9956A] font-bold">+{(stats as any)?.newClientsThisMonth || '١٢٠'}</p>
          <div className="text-right">
            <p className="text-xs text-[#8B7355]">العملاء</p>
            <h3 className="text-2xl font-black text-[#1C1410]">{(stats as any)?.clientCount || '٣٢١'}</h3>
          </div>
        </div>
      </div>

      {/* Needs action */}
      {(pendingPayoutsCount > 0 || openDisputesCount > 0 || providers.filter(p => !p.isVerified).length > 0) && (
        <div>
          <h2 className="font-black text-lg text-right mb-3 text-[#1C1410]">يحتاج إجراء</h2>
          <div className="space-y-3">
            {/* Payout requests */}
            {payouts.filter(p => p.status === 'PENDING').slice(0, 1).map(payout => (
              <div key={payout.id} className="bg-white rounded-3xl border border-[#EDE8E2] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF7F4] flex items-center justify-center shrink-0">
                    <Wallet size={18} className="text-[#C9956A]" />
                  </div>
                  <div className="flex-1 text-right">
                    <h4 className="font-bold text-sm text-[#1C1410]">طلب سحب · {payout.providerName}</h4>
                    <p className="text-xs text-[#8B7355]">IBAN · {payout.amount.toLocaleString()} ريال</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => { try { await api.admin.processPayout(payout.id, true); setPayouts(prev => prev.map(p => p.id === payout.id ? { ...p, status: 'APPROVED' } : p)); toast('تمت الموافقة على السحب ✓'); } catch (e: any) { toast(e.message, 'error'); } }}
                    className="flex-1 py-2.5 bg-[#C9956A] text-white rounded-2xl text-sm font-black">موافقة</button>
                  <button onClick={async () => { try { await api.admin.processPayout(payout.id, false); setPayouts(prev => prev.map(p => p.id === payout.id ? { ...p, status: 'REJECTED' } : p)); toast('تم رفض السحب', 'info'); } catch (e: any) { toast(e.message, 'error'); } }}
                    className="flex-1 py-2.5 bg-[#FAF7F4] text-[#8B7355] rounded-2xl text-sm font-bold border border-[#EDE8E2]">رفض</button>
                </div>
              </div>
            ))}

            {/* Unverified providers */}
            {providers.filter(p => !p.isVerified).slice(0, 1).map(provider => (
              <div key={provider.id} className="bg-white rounded-3xl border border-[#EDE8E2] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF7F4] flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} className="text-[#8B7355]" />
                  </div>
                  <div className="flex-1 text-right">
                    <h4 className="font-bold text-sm text-[#1C1410]">توثيق متخصصة جديدة</h4>
                    <p className="text-xs text-[#8B7355]">{provider.name} · {provider.specialty}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleVerification(provider.id)}
                    className="flex-1 py-2.5 bg-[#1C1410] text-white rounded-2xl text-sm font-black">توثيق</button>
                  <button className="flex-1 py-2.5 bg-[#FAF7F4] text-[#8B7355] rounded-2xl text-sm font-bold border border-[#EDE8E2]">رفض</button>
                </div>
              </div>
            ))}

            {/* Open disputes */}
            {disputes.filter(d => d.status === 'OPEN').slice(0, 1).map(dispute => (
              <div key={dispute.id} className="bg-white rounded-3xl border border-red-100 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                    <AlertCircle size={18} className="text-red-500" />
                  </div>
                  <div className="flex-1 text-right">
                    <h4 className="font-bold text-sm text-red-700">نزاع · حجز #{dispute.bookingId?.slice(-4)}</h4>
                    <p className="text-xs text-red-400">{dispute.reason || 'تأخر الموعد'}</p>
                  </div>
                </div>
                <button onClick={() => setSubView('disputes')}
                  className="w-full py-2.5 bg-red-500 text-white rounded-2xl text-sm font-black">مراجعة</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ─── Real Bookings View ──────────────────────────────────────────────────
  const renderBookings = () => {
    const statusColors: Record<string, string> = {
      COMPLETED: 'bg-green-50 text-green-700',
      CONFIRMED: 'bg-blue-50 text-blue-700',
      PENDING: 'bg-yellow-50 text-yellow-700',
      CANCELLED: 'bg-red-50 text-red-700',
    };
    return (
      <div className="pb-28">
        <div className="text-right mb-5 pt-2">
          <h1 className="text-3xl font-black text-[#1C1410]">الحجوزات</h1>
          <p className="text-sm text-[#8B7355] mt-0.5">{adminBookings.length} حجز</p>
        </div>
        <div className="space-y-3">
          {adminBookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-3xl border border-[#EDE8E2] p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-black text-sm text-[#1C1410]">{booking.serviceName}</h4>
                  <p className="text-xs text-[#8B7355] mt-1">{booking.clientName} ← {booking.providerName}</p>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${statusColors[booking.status] || 'bg-gray-50 text-gray-700'}`}>
                  {booking.status === 'COMPLETED' ? 'مكتمل' : booking.status === 'CONFIRMED' ? 'مؤكد' : booking.status === 'PENDING' ? 'معلق' : 'ملغي'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#8B7355]">
                <span>{new Date(booking.scheduledDate).toLocaleDateString('ar-SA')} · {booking.scheduledTime}</span>
                <span className="font-black text-[#1C1410]">{booking.servicePrice} ريال</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Providers List ───────────────────────────────────────────────────────
  const renderProviders = () => {
    const filteredProviders = providers.filter(p =>
      p.name.includes(providerSearch) || p.specialty.includes(providerSearch)
    );
    return selectedProvider ? renderProviderDetails() : (
    <div className="pb-28">
      <div className="text-right mb-4 pt-2">
        <h1 className="text-3xl font-black text-[#1C1410]">المتخصصات</h1>
        <p className="text-sm text-[#8B7355] mt-0.5">{filteredProviders.length} من {providers.length} متخصصة</p>
      </div>
      <input
        value={providerSearch}
        onChange={e => setProviderSearch(e.target.value)}
        placeholder="ابحثي باسم أو تخصص..."
        className="w-full bg-white border border-[#EDE8E2] rounded-2xl px-4 py-3.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#C9956A] shadow-sm mb-4"
      />
      <div className="space-y-3">
        {filteredProviders.map((provider) => (
          <button key={provider.id} onClick={() => setSelectedProvider(provider)} className="w-full text-right bg-white rounded-3xl border border-[#EDE8E2] p-4 shadow-sm hover:bg-[#FAF7F4] transition-colors active:scale-[0.98]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C4A882] to-[#A07850] flex items-center justify-center text-white font-black text-lg shrink-0">
                {provider.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 justify-end">
                  {provider.isVerified && (
                    <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <ShieldCheck size={9} /> موثّقة
                    </span>
                  )}
                  <h4 className="font-black text-base text-[#1C1410]">{provider.name}</h4>
                </div>
                <p className="text-xs text-[#8B7355] text-right">{provider.specialty}</p>
                <div className="flex items-center justify-end gap-2 mt-0.5">
                  <span className="text-xs font-black text-[#C9956A]">★ {provider.rating}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); toggleVerification(provider.id); }}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-black transition-all ${
                  provider.isVerified
                    ? 'bg-[#FAF7F4] text-[#8B7355] border border-[#EDE8E2]'
                    : 'bg-[#1C1410] text-white'
                }`}
              >
                {provider.isVerified ? 'إلغاء التوثيق' : 'توثيق'}
              </button>
              <button onClick={(e) => e.stopPropagation()} className="flex-1 py-2.5 bg-[#FAF7F4] text-[#8B7355] rounded-2xl text-sm font-bold border border-[#EDE8E2]">
                رفض
              </button>
            </div>
          </button>
        ))}
      </div>
    </div>
    );
  };

  // ─── Provider Details Page ────────────────────────────────────────────────
  const renderProviderDetails = () => {
    if (!selectedProvider) return null;
    return (
      <div className="space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedProvider(null)} className="p-2 bg-white rounded-xl shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-black">{selectedProvider.name}</h2>
        </div>

        {/* Provider Info Card */}
        <div className="bg-white rounded-3xl border border-[#EDE8E2] p-6 shadow-sm">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C4A882] to-[#A07850] flex items-center justify-center text-white font-black text-2xl shrink-0">
              {selectedProvider.name[0]}
            </div>
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-2 mb-1">
                <h3 className="text-lg font-black text-[#1C1410]">{selectedProvider.name}</h3>
                {selectedProvider.isVerified && <ShieldCheck size={18} className="text-green-600" />}
              </div>
              <p className="text-sm text-[#8B7355] mb-1">{selectedProvider.specialty}</p>
              <p className="text-xs text-[#8B7355]">⭐ {selectedProvider.rating} ({selectedProvider.reviewCount} تقييم)</p>
            </div>
          </div>
          <div className="text-right space-y-2 text-sm">
            <p><span className="font-bold text-[#1C1410]">المدينة:</span> <span className="text-[#8B7355]">{selectedProvider.city}</span></p>
            <p><span className="font-bold text-[#1C1410]">الهاتف:</span> <span className="text-[#8B7355] dir-ltr">{selectedProvider.phone}</span></p>
            <p><span className="font-bold text-[#1C1410]">الحالة:</span> <span className={selectedProvider.isVerified ? 'text-green-600 font-bold' : 'text-yellow-600 font-bold'}>{selectedProvider.isVerified ? 'موثّقة ✓' : 'قيد المراجعة'}</span></p>
          </div>
        </div>

        {/* Bio */}
        {selectedProvider.bio && (
          <div className="bg-white rounded-3xl border border-[#EDE8E2] p-4 shadow-sm">
            <p className="text-xs font-bold text-[#8B7355] mb-2">السيرة الذاتية</p>
            <p className="text-sm text-[#1C1410] leading-relaxed">{selectedProvider.bio}</p>
          </div>
        )}

        {/* Neighborhoods */}
        {selectedProvider.coveredNeighborhoods && selectedProvider.coveredNeighborhoods.length > 0 && (
          <div className="bg-white rounded-3xl border border-[#EDE8E2] p-4 shadow-sm">
            <p className="text-xs font-bold text-[#8B7355] mb-3">المناطق المغطاة</p>
            <div className="flex flex-wrap gap-2 justify-end">
              {selectedProvider.coveredNeighborhoods.map(n => (
                <span key={n} className="bg-[#FAF7F4] text-[#C9956A] text-xs font-bold px-3 py-1.5 rounded-full">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => { toggleVerification(selectedProvider.id); setSelectedProvider(null); }}
            className={`flex-1 py-3.5 rounded-2xl text-sm font-black transition-all ${
              selectedProvider.isVerified
                ? 'bg-[#FAF7F4] text-[#8B7355] border border-[#EDE8E2]'
                : 'bg-[#1C1410] text-white'
            }`}
          >
            {selectedProvider.isVerified ? 'إلغاء التوثيق' : '✓ توثيق'}
          </button>
        </div>
      </div>
    );
  };

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
                  <div className="p-3 bg-[#FAF7F4] rounded-2xl">
                    <p className="text-[9px] font-black text-[#C9956A] mb-1">المبدعة</p>
                    <p className="text-xs font-bold">{dispute.providerName}</p>
                    <p className="text-[10px] text-[#C9956A] font-bold mt-0.5">{dispute.providerPhone}</p>
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
                        className="flex-1 py-3 bg-[#C9956A] text-white rounded-2xl text-xs font-black disabled:opacity-40"
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
          <span className="text-xs font-black bg-[#FAF7F4] text-[#C9956A] px-2 py-1 rounded-xl">
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
                  <p className="text-2xl font-black text-[#C9956A]">{payout.amount.toLocaleString()} ﷼</p>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block mt-1 ${
                    payout.status === 'PENDING' ? 'bg-[#FAF7F4] text-[#C9956A]' :
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
              plan.name === 'برو' ? 'bg-[#1C1410]' :
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
                    <span className="text-2xl font-black text-[#8B7355]">{plan.priceMonthly}</span>
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
          { label: 'اشتراكات نشطة', value: String(stats?.activeSubscriptions || 0), color: 'text-[#8B7355]' },
          { label: 'إجمالي الحجوزات', value: String(stats?.totalBookings || 0), color: 'text-[#C9956A]' },
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
      { id: 'billing', label: 'إدارة الباقات', icon: CreditCard, badge: 0 },
      { id: 'reports', label: 'تقارير المنصة', icon: PieChart, badge: 0 },
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
    <div className="min-h-screen bg-[#FAF7F4] text-[#1C1410] font-sans" dir="rtl">
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
            {!subView && (
              <>
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'providers' && renderProviders()}
                {activeTab === 'bookings_admin' && renderBookings()}
                {activeTab === 'disputes' && renderDisputes()}
                {activeTab === 'payouts' && renderPayouts()}
                {activeTab === 'settings' && renderSettings()}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EDE8E2] px-6 pt-3 pb-8 flex justify-around items-center z-50">
        {bottomNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id); setSubView(null); setSelectedProvider(null); setProviderSearch(''); }}
            className="relative flex flex-col items-center gap-1"
          >
            <item.icon
              size={22}
              strokeWidth={activeTab === item.id && !subView ? 2.5 : 1.8}
              className={activeTab === item.id && !subView ? 'text-[#C9956A]' : 'text-[#8B7355]'}
            />
            {item.id === 'disputes' && openDisputesCount > 0 && (
              <div className="absolute -top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">
                {openDisputesCount}
              </div>
            )}
            {item.id === 'payouts' && pendingPayoutsCount > 0 && (
              <div className="absolute -top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">
                {pendingPayoutsCount}
              </div>
            )}
            <span className={`text-[10px] font-bold ${activeTab === item.id && !subView ? 'text-[#C9956A]' : 'text-[#8B7355]'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
