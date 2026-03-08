import React, { useState, useRef, useEffect } from 'react';
import {
  Home, Calendar, ShoppingBag, Users, Settings, Plus, TrendingUp, Star,
  CheckCircle, Clock, LogOut, ChevronRight, ArrowLeft, PieChart,
  MessageSquare, Camera, MapPin, Save, Wallet, Send, AlertCircle, ShieldCheck, Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer, AreaChart, Area, Tooltip,
  BarChart, Bar, CartesianGrid, XAxis, YAxis,
} from 'recharts';
import { RIYADH_NEIGHBORHOODS } from '../../lib/mockData';
import { BookingStatus, UserRole, PaymentStatus } from '../../lib/types';
import { useToast } from '../../components/Toast';
import { api, dotnetApi, ApiBooking, ApiService, ApiTransaction, ApiConversation, ApiMessage, DotNetWalletDto, DotNetPushSubscriptionDto } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const salesData = [
  { name: '22 Feb', sales: 400 },
  { name: '23 Feb', sales: 300 },
  { name: '24 Feb', sales: 600 },
  { name: '25 Feb', sales: 800 },
  { name: '26 Feb', sales: 500 },
  { name: '27 Feb', sales: 900 },
  { name: '28 Feb', sales: 700 },
];

const monthlyRevenue = [
  { month: 'سبت', revenue: 2800 },
  { month: 'أكت', revenue: 3200 },
  { month: 'نوف', revenue: 4100 },
  { month: 'ديس', revenue: 3800 },
  { month: 'يان', revenue: 4500 },
  { month: 'فبر', revenue: 4200 },
];

const INIT_HOURS = [
  { day: 'الأحد', enabled: true, start: '09:00', end: '21:00' },
  { day: 'الإثنين', enabled: true, start: '09:00', end: '21:00' },
  { day: 'الثلاثاء', enabled: true, start: '09:00', end: '21:00' },
  { day: 'الأربعاء', enabled: true, start: '09:00', end: '21:00' },
  { day: 'الخميس', enabled: true, start: '09:00', end: '21:00' },
  { day: 'الجمعة', enabled: false, start: '14:00', end: '21:00' },
  { day: 'السبت', enabled: false, start: '00:00', end: '00:00' },
];

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

export default function ProviderApp() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subView, setSubView] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [provBookingsTab, setProvBookingsTab] = useState<'new' | 'upcoming' | 'completed'>('new');

  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<ApiService[]>([]);
  const [workingHours, setWorkingHours] = useState(INIT_HOURS);
  const [wallet, setWallet] = useState<DotNetWalletDto>({ merchantId: '', availableBalance: 0, pendingBalance: 0 });
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [activeConversation, setActiveConversation] = useState<ApiConversation | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [ibanInput, setIbanInput] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [notifStatus, setNotifStatus] = useState<'idle' | 'loading' | 'enabled' | 'blocked'>('idle');
  const [providerRating, setProviderRating] = useState(0);

  const [storeInfo, setStoreInfo] = useState({
    name: user?.name || '',
    specialty: '',
    bio: '',
    city: '',
    phone: user?.phone || '',
    coveredNeighborhoods: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setDataLoading(true);
    try {
      const [bkgs, svcs, convs, w, txns, myProfile] = await Promise.all([
        api.bookings.list(),
        api.services.list(),
        api.conversations.list(),
        user?.providerId 
          ? dotnetApi.wallet.get(user.providerId) 
          : Promise.resolve({ merchantId: '', availableBalance: 0, pendingBalance: 0 }),
        api.wallet.transactions(),
        api.providers.getMe().catch(() => null),
      ]);
      setBookings(bkgs);
      setServices(svcs);
      setConversations(convs);
      setWallet(w);
      setTransactions(txns);
      if (myProfile?.workingHours) setWorkingHours(myProfile.workingHours);
      if (myProfile) {
        setProviderRating(myProfile.rating || 0);
        setStoreInfo({
          name: myProfile.name || user?.name || '',
          specialty: myProfile.specialty || '',
          bio: myProfile.bio || '',
          city: myProfile.city || '',
          phone: myProfile.phone || user?.phone || '',
          coveredNeighborhoods: myProfile.coveredNeighborhoods || [],
        });
      }
      // Derive unique customers from bookings
      const custMap = new Map<string, any>();
      bkgs.forEach(b => {
        if (b.customerId && b.customerName && !custMap.has(b.customerId)) {
          custMap.set(b.customerId, { id: b.customerId, name: b.customerName, phone: '' });
        }
      });
      setCustomers(Array.from(custMap.values()));
    } catch (e: any) {
      toast(e.message || 'خطأ في تحميل البيانات', 'error');
    } finally {
      setDataLoading(false);
    }
  }

  const pendingCount = bookings.filter(b => b.status === BookingStatus.PENDING).length;
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  useEffect(() => {
    if (activeConversation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeConversation]);

  // Poll messages every 5 s when a conversation is open
  useEffect(() => {
    if (!activeConversation) return;
    const id = setInterval(async () => {
      try {
        const msgs = await api.conversations.messages(activeConversation.id);
        setMessages(msgs);
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(id);
  }, [activeConversation?.id]);

  // Poll conversation list every 15 s for unread badges
  useEffect(() => {
    const id = setInterval(() => {
      api.conversations.list().then(setConversations).catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, []);

  // Poll bookings every 30 s so new client bookings appear without page reload
  useEffect(() => {
    const id = setInterval(() => {
      api.bookings.list().then(bkgs => {
        setBookings(bkgs);
        const custMap = new Map<string, any>();
        bkgs.forEach(b => {
          if (b.customerId && b.customerName && !custMap.has(b.customerId))
            custMap.set(b.customerId, { id: b.customerId, name: b.customerName, phone: '' });
        });
        setCustomers(Array.from(custMap.values()));
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const bottomNavItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: Home },
    { id: 'bookings', label: 'الحجوزات', icon: Calendar },
    { id: 'wallet', label: 'المحفظة', icon: Wallet },
    { id: 'settings', label: 'حسابي', icon: Settings },
  ];

  const handleClose = () => { setShowModal(null); setSelectedItem(null); };

  const toggleNeighborhood = (n: string) => {
    setStoreInfo(p => ({
      ...p,
      coveredNeighborhoods: p.coveredNeighborhoods.includes(n)
        ? p.coveredNeighborhoods.filter(x => x !== n)
        : [...p.coveredNeighborhoods, n],
    }));
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeConversation) return;
    const content = chatInput.trim();
    setChatInput('');
    try {
      const newMsg = await api.conversations.send(activeConversation.id, content);
      setMessages(prev => [...prev, newMsg]);
      setConversations(prev => prev.map(c =>
        c.id === activeConversation.id
          ? { ...c, lastMessage: content, lastMessageAt: new Date().toISOString() }
          : c
      ));
    } catch (e: any) {
      toast(e.message || 'فشل إرسال الرسالة', 'error');
    }
  };

  const handleOpenConversation = async (conv: ApiConversation) => {
    setActiveConversation(conv);
    // Immediately clear unread badge in local state (server marks as read via GET messages)
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
    try {
      const msgs = await api.conversations.messages(conv.id);
      setMessages(msgs);
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    try {
      if (showModal === 'add_service') {
        const svc = await api.services.create({
          name: data.name as string,
          description: (data.description as string) || '',
          price: Number(data.price),
          duration: Number(data.duration),
          category: (data.category as string) || 'مكياج',
          isAvailable: true,
        });
        setServices(prev => [svc, ...prev]);
        toast('تمت إضافة الخدمة');
      } else if (showModal === 'edit_service') {
        const svc = await api.services.update(selectedItem.id, {
          name: data.name as string,
          price: Number(data.price),
          duration: Number(data.duration),
        });
        setServices(prev => prev.map(s => s.id === svc.id ? svc : s));
        toast('تم تعديل الخدمة');
      } else if (showModal === 'confirm_accept_booking') {
        const b = await api.bookings.updateStatus(selectedItem.id, 'CONFIRMED');
        setBookings(prev => prev.map(x => x.id === b.id ? b : x));
        toast('تم قبول الحجز ✓');
      } else if (showModal === 'confirm_reject_booking') {
        const b = await api.bookings.updateStatus(selectedItem.id, 'CANCELLED');
        setBookings(prev => prev.map(x => x.id === b.id ? b : x));
        toast('تم رفض الحجز', 'info');
      } else if (showModal === 'confirm_delete_service') {
        await api.services.delete(selectedItem.id);
        setServices(prev => prev.filter(s => s.id !== selectedItem.id));
        toast('تم حذف الخدمة', 'error');
      } else if (showModal === 'confirm_service_complete') {
        // .NET atomically marks the booking Completed and credits the wallet.
        const updatedWallet = await dotnetApi.wallet.completeBooking(selectedItem.id);
        setWallet(updatedWallet);
        // Reflect completion in local booking list so the button disappears.
        setBookings(prev => prev.map(x =>
          x.id === selectedItem.id ? { ...x, status: 'COMPLETED' } : x
        ));
        const credited = (selectedItem.totalPrice ?? 0).toLocaleString();
        toast(`تم تأكيد الخدمة! تمت إضافة ${credited} ﷼ لمحفظتك ✓`);
      } else if (showModal === 'add_customer') {
        const name = (data.name as string)?.trim();
        const phone = (data.phone as string)?.trim();
        if (!name || !phone) { toast('يرجى إدخال الاسم ورقم الجوال', 'error'); return; }
        const newCustomer = { id: `manual-${Date.now()}`, name, phone };
        setCustomers(prev => [...prev, newCustomer]);
        toast('تمت إضافة العميلة ✓');
      } else if (showModal === 'request_payout') {
        if (!ibanInput || !payoutAmount) return;
        await api.wallet.requestPayout(Number(payoutAmount), ibanInput);
        const w = await dotnetApi.wallet.get(user?.providerId ?? '');
        setWallet(w);
        toast('تم إرسال طلب السحب بنجاح! سيصل خلال يوم عمل 💳');
        setIbanInput('');
        setPayoutAmount('');
      }
    } catch (e: any) {
      toast(e.message || 'حدث خطأ', 'error');
      return;
    }

    handleClose();
  };

  // ─── Push Notifications ──────────────────────────────────────────────────
  const enableNotifications = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      toast("متصفحك لا يدعم الإشعارات", "error");
      return;
    }
    setNotifStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotifStatus("blocked");
        toast("تم رفض إذن الإشعارات", "error");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await dotnetApi.notifications.getVapidPublicKey();
      if (!publicKey) throw new Error("لم يتم العثور على مفتاح VAPID");
      const pushSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as ArrayBuffer,
      });
      const json = pushSub.toJSON();
      const dto: DotNetPushSubscriptionDto = {
        userRef:  user!.providerId!,
        endpoint: json.endpoint!,
        p256dh:   (json.keys as Record<string,string>).p256dh,
        auth:     (json.keys as Record<string,string>).auth,
      };
      await dotnetApi.notifications.subscribe(dto);
      setNotifStatus("enabled");
      toast("تم تفعيل التنبيهات الفورية 🔔");
    } catch (e: any) {
      setNotifStatus("idle");
      toast(e.message || "حدث خطأ أثناء تفعيل التنبيهات", "error");
    }
  };

  // ─── Render: Dashboard ───────────────────────────────────────────────────
  const renderDashboard = () => {
    const completedCount = bookings.filter(b => b.status === BookingStatus.COMPLETED).length;
    const thisMonthEarnings = transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const upcomingBookings = bookings.filter(b =>
      b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.PENDING
    ).slice(0, 3);
    return (
      <div className="pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSubView('notifications')}
              className="w-10 h-10 rounded-full bg-white border border-[#EDE8E2] flex items-center justify-center hover:bg-[#FAF7F4] transition-colors active:scale-95"
            >
              <Bell size={18} className="text-[#8B7355]" />
            </button>
            <div className="w-10 h-10 rounded-full bg-[#C9956A] flex items-center justify-center text-white font-black text-base">
              {user?.name?.[0] || 'م'}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#8B7355]">لوحة التحكم</p>
            <h1 className="text-2xl font-black text-[#1C1410]">{user?.name || 'مبدعة'}</h1>
          </div>
        </div>

        {/* Earnings card */}
        <div className="bg-[#1C1410] rounded-3xl p-5 mb-5 text-white overflow-hidden relative">
          <div className="absolute -left-8 -top-8 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute -left-4 top-12 w-20 h-20 bg-white/5 rounded-full" />
          <p className="text-xs text-white/50 mb-1 text-right">أرباح هذا الشهر</p>
          <h2 className="text-4xl font-black text-right mb-1 relative z-10">
            {(wallet.availableBalance + wallet.pendingBalance).toLocaleString()} <span className="text-2xl font-bold">ريال</span>
          </h2>
          {thisMonthEarnings > 0 && (
            <p className="text-xs text-green-400 font-bold text-right mb-4">↗ +{thisMonthEarnings.toLocaleString()} ريال إجمالي الأرباح</p>
          )}
          <div className="flex justify-between pt-4 border-t border-white/10">
            {[
              { label: 'الحجوزات', value: String(bookings.length) },
              { label: 'مكتمل', value: String(completedCount) },
              { label: 'التقييم', value: providerRating ? providerRating.toFixed(1) : '—' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-xl font-black">{s.value}</p>
                <p className="text-[11px] text-white/50 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming bookings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setActiveTab('bookings')} className="text-xs text-[#C9956A] font-bold">عرض الكل</button>
            <h2 className="font-black text-lg text-[#1C1410]">الحجوزات القادمة</h2>
          </div>
          {upcomingBookings.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#EDE8E2] p-8 text-center">
              <Calendar size={32} className="mx-auto text-[#EDE8E2] mb-2" />
              <p className="text-[#8B7355] text-sm font-bold">لا توجد حجوزات قادمة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map(booking => {
                const customer = customers.find(c => c.id === booking.customerId);
                const statusCls = booking.status === BookingStatus.CONFIRMED
                  ? 'bg-green-50 text-green-700'
                  : 'bg-[#FAF7F4] text-[#C9956A]';
                const statusText = booking.status === BookingStatus.CONFIRMED ? 'مقبول' : 'معلق';
                return (
                  <div key={booking.id} className="bg-white rounded-3xl border border-[#EDE8E2] p-4 flex items-center gap-3 shadow-sm">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#EDE8E2] to-[#D4C8B8] flex items-center justify-center text-[#8B7355] font-black shrink-0">
                      {(customer?.name || booking.customerName || 'ع')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm text-[#1C1410]">{customer?.name || booking.customerName || 'عميلة'}</h4>
                      <p className="text-xs text-[#8B7355]">{booking.serviceName} · {booking.date} · م {booking.time}</p>
                    </div>
                    <div className="text-left shrink-0 space-y-1">
                      <p className="font-black text-[#1C1410] text-sm">{booking.servicePrice} ريال</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full block text-center ${statusCls}`}>{statusText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Render: Bookings ────────────────────────────────────────────────────
  const renderBookings = () => {
    const newBookings = bookings.filter(b => b.status === BookingStatus.PENDING);
    const upcomingBkgs = bookings.filter(b => b.status === BookingStatus.CONFIRMED);
    const completedBkgs = bookings.filter(b => b.status === BookingStatus.COMPLETED || b.status === BookingStatus.CANCELLED);
    const tabBookings = provBookingsTab === 'new' ? newBookings : provBookingsTab === 'upcoming' ? upcomingBkgs : completedBkgs;

    return (
      <div className="pb-28">
        {/* Title */}
        <div className="text-right mb-5 pt-2">
          <h1 className="text-3xl font-black text-[#1C1410]">إدارة الحجوزات</h1>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-[#EDE8E2] p-1 flex mb-5">
          {(['new', 'upcoming', 'completed'] as const).map((tab, i) => (
            <button
              key={tab}
              onClick={() => setProvBookingsTab(tab)}
              className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all relative ${
                provBookingsTab === tab ? 'bg-[#1C1410] text-white' : 'text-[#8B7355]'
              }`}
            >
              {['جديدة', 'قادمة', 'مكتملة'][i]}
              {tab === 'new' && newBookings.length > 0 && (
                <span className={`absolute -top-1 -left-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${provBookingsTab === 'new' ? 'bg-white text-[#1C1410]' : 'bg-[#C9956A] text-white'}`}>
                  {newBookings.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tabBookings.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar size={40} className="mx-auto text-[#EDE8E2] mb-3" />
            <p className="text-[#8B7355] font-bold">لا توجد حجوزات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tabBookings.map(booking => {
              const customer = customers.find(c => c.id === booking.customerId);
              const clientName = customer?.name || booking.customerName || 'عميلة';
              const bothConfirmed = booking.clientConfirmed && booking.providerConfirmed;
              const isNew = booking.status === BookingStatus.PENDING;
              const isConfirmed = booking.status === BookingStatus.CONFIRMED;
              const formattedDate = booking.date
                ? new Date(booking.date).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })
                : booking.date;

              return (
                <div key={booking.id} className="bg-white rounded-3xl border border-[#EDE8E2] overflow-hidden shadow-sm">
                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#EDE8E2]">
                    {isNew ? (
                      <span className="text-[11px] font-bold text-[#C9956A] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-[#C9956A] rounded-full" />طلب جديد
                      </span>
                    ) : (
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        isConfirmed ? 'bg-green-50 text-green-700' : 'bg-[#FAF7F4] text-[#8B7355]'
                      }`}>{isConfirmed ? 'مقبول' : booking.status === BookingStatus.COMPLETED ? 'مكتمل' : 'ملغي'}</span>
                    )}
                    <span className="text-xs text-[#8B7355]">{formattedDate}</span>
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#EDE8E2] to-[#D4C8B8] flex items-center justify-center text-[#8B7355] font-black shrink-0">
                        {clientName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-base text-[#1C1410]">{clientName}</h4>
                        <p className="text-xs text-[#8B7355]">{booking.serviceName} · {booking.time}</p>
                      </div>
                      <p className="font-black text-[#1C1410] shrink-0">{booking.servicePrice} ريال</p>
                    </div>

                    {/* Actions */}
                    {isNew && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelectedItem(booking); setShowModal('confirm_accept_booking'); }}
                          className="flex-1 py-3 bg-[#C9956A] text-white rounded-2xl text-sm font-black"
                        >قبول الحجز</button>
                        <button
                          onClick={() => { setSelectedItem(booking); setShowModal('confirm_reject_booking'); }}
                          className="flex-1 py-3 bg-white text-[#8B7355] rounded-2xl text-sm font-bold border border-[#EDE8E2]"
                        >رفض</button>
                      </div>
                    )}
                    {isConfirmed && !booking.providerConfirmed && (
                      <button
                        onClick={() => { setSelectedItem(booking); setShowModal('confirm_service_complete'); }}
                        className="w-full py-3 bg-[#1C1410] text-white rounded-2xl text-sm font-black"
                      >✓ تأكيد اكتمال الخدمة</button>
                    )}
                    {isConfirmed && booking.providerConfirmed && !bothConfirmed && (
                      <div className="flex items-center gap-1 text-xs text-[#C9956A] font-bold justify-center">
                        <CheckCircle size={13} />
                        <span>بانتظار تأكيد العميلة</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─── Render: Services ────────────────────────────────────────────────────
  const renderServices = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">الخدمات</h2>
        <button onClick={() => setShowModal('add_service')} className="bg-[#1C1410] text-white px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2">
          <Plus size={16} /> إضافة
        </button>
      </div>
      {services.length === 0 ? (
        <div className="p-12 bg-white rounded-4xl border border-gray-100 text-center">
          <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-bold">لا توجد خدمات بعد</p>
          <button onClick={() => setShowModal('add_service')} className="mt-4 px-6 py-3 bg-[#1C1410] text-white rounded-2xl text-sm font-bold">أضفي خدمة جديدة</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {services.map((service) => (
            <div key={service.id} className="bg-white rounded-4xl border border-gray-100 overflow-hidden flex shadow-sm">
              <div className="w-28 h-28 bg-gray-50 shrink-0">
                <img src={`https://picsum.photos/seed/${service.id}/200/200`} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                <h4 className="font-bold truncate">{service.name}</h4>
                <div className="flex items-center gap-1 mt-1 text-gray-400">
                  <Clock size={12} />
                  <span className="text-[10px]">{service.duration} دقيقة</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <p className="font-black text-[#C9956A] flex-1">{service.price} ﷼</p>
                  <button onClick={() => { setSelectedItem(service); setShowModal('edit_service'); }} className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <Settings size={15} className="text-gray-400" />
                  </button>
                  <button onClick={() => { setSelectedItem(service); setShowModal('confirm_delete_service'); }} className="p-2 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                    <Plus size={15} className="text-red-400 rotate-45" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Render: Customers ───────────────────────────────────────────────────
  const renderCustomers = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">العملاء</h2>
        <button onClick={() => setShowModal('add_customer')} className="bg-[#1C1410] text-white px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2">
          <Plus size={16} /> إضافة
        </button>
      </div>
      <div className="bg-white rounded-4xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {customers.map((customer) => (
          <div key={customer.id} className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF7F4] text-[#C9956A] flex items-center justify-center font-black shrink-0">
              {customer.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm">{customer.name}</h4>
              <p className="text-[10px] text-gray-400">{customer.phone}</p>
            </div>
            <button
              onClick={() => window.open(`https://wa.me/966${customer.phone.replace(/^0/, '')}`, '_blank')}
              className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <MessageSquare size={18} className="text-green-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Render: Notifications ──────────────────────────────────────────────
  const renderNotifications = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={() => setSubView(null)} className="p-2 bg-white rounded-xl shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-black">التنبيهات</h2>
      </div>

      <div className="bg-white rounded-4xl border border-gray-100 shadow-sm p-6 text-center space-y-5">
        <div className="w-16 h-16 bg-[#FAF7F4] rounded-2xl flex items-center justify-center mx-auto">
          <Bell size={28} className="text-[#C9956A]" />
        </div>
        <div>
          <h3 className="font-black text-lg">تنبيهات فورية</h3>
          <p className="text-sm text-gray-500 mt-1">
            احصلي على إشعار فوري عند وصول حجز جديد أو اكتمال دفعة في محفظتك
          </p>
        </div>

        {notifStatus === 'enabled' ? (
          <div className="flex items-center justify-center gap-2 text-green-600 font-black text-sm">
            <CheckCircle size={18} />
            <span>التنبيهات مفعّلة</span>
          </div>
        ) : notifStatus === 'blocked' ? (
          <div className="text-sm text-red-500 bg-red-50 rounded-2xl p-4">
            يبدو أنكِ حظرتِ الإشعارات. غيّري الإعداد من المتصفح ثم أعيدي المحاولة.
          </div>
        ) : (
          <button
            onClick={enableNotifications}
            disabled={notifStatus === 'loading'}
            className="w-full py-3.5 bg-[#C9956A] text-white font-black rounded-2xl hover:bg-[#C9956A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Bell size={18} />
            {notifStatus === 'loading' ? 'جارٍ التفعيل...' : '🔔 تفعيل التنبيهات'}
          </button>
        )}
      </div>
    </div>
  );

  // ─── Render: Settings / Profile ──────────────────────────────────────────
  const renderSettings = () => (
    <div className="pb-28">
      {/* Dark header */}
      <div className="-mx-5 bg-[#1C1410] text-white px-5 pt-6 pb-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <button
            onClick={() => setSubView('store')}
            className="px-4 py-2 rounded-2xl border border-white/20 text-sm font-bold text-white/80"
          >
            تعديل
          </button>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-1">
              <h2 className="text-2xl font-black">{storeInfo.name || user?.name}</h2>
              <div className="w-7 h-7 rounded-full bg-[#C9956A] flex items-center justify-center">
                <CheckCircle size={14} className="text-white" fill="white" />
              </div>
            </div>
            <p className="text-sm text-white/60">{storeInfo.specialty} · عناية بالبشرة</p>
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-sm font-black text-[#C9956A]">★ {providerRating || '4.9'}</span>
              <span className="text-xs text-white/40">({bookings.filter(b => b.status === 'COMPLETED').length} تقييم)</span>
            </div>
          </div>
          <div className="w-14 h-14 rounded-full bg-[#C9956A] flex items-center justify-center text-white text-2xl font-black shrink-0">
            {(storeInfo.name || user?.name || 'م')[0]}
          </div>
        </div>
        {/* Stats row */}
        <div className="flex justify-between pt-4 border-t border-white/10">
          {[
            { label: 'عميلة', value: String(customers.length || '٢٤٠') },
            { label: 'خبرة', value: '٣ سنوات' },
            { label: 'الفئة', value: 'PRO' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-xl font-black">{s.value}</p>
              <p className="text-[11px] text-white/40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Services section */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setShowModal('add_service')} className="flex items-center gap-1.5 px-4 py-2 bg-[#FAF7F4] border border-[#EDE8E2] rounded-2xl text-sm font-bold text-[#8B7355]">
            <Plus size={15} />
            إضافة خدمة
          </button>
          <h2 className="font-black text-lg text-[#1C1410]">خدماتي</h2>
        </div>
        {services.length === 0 ? (
          <div className="py-10 text-center bg-white rounded-3xl border border-[#EDE8E2]">
            <p className="text-[#8B7355] font-bold">لا توجد خدمات بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map(service => (
              <div key={service.id} className="bg-white rounded-3xl border border-[#EDE8E2] px-4 py-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF7F4] flex items-center justify-center shrink-0">
                  <Star size={16} className="text-[#C9956A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm text-[#1C1410]">{service.name}</h4>
                  <p className="text-xs text-[#8B7355]">{service.duration} دقيقة · {service.price} ريال</p>
                </div>
                <button
                  onClick={() => { setSelectedItem(service); setShowModal('edit_service'); }}
                  className="p-2 text-[#8B7355] shrink-0"
                >
                  <Settings size={16} />
                </button>
                <div
                  onClick={async () => {
                    try {
                      const updated = await api.services.update(service.id, { isAvailable: !service.isAvailable });
                      setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
                    } catch { /* ignore */ }
                  }}
                  className={`w-11 h-6 rounded-full flex items-center cursor-pointer transition-colors shrink-0 ${service.isAvailable !== false ? 'bg-[#C9956A] justify-end pr-1' : 'bg-[#EDE8E2] justify-start pl-1'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Availability / Working Hours */}
      <button
        onClick={() => setSubView('hours')}
        className="w-full py-4 bg-white border border-[#EDE8E2] rounded-2xl text-[#1C1410] font-bold flex items-center justify-center gap-2 mb-4 hover:bg-[#FAF7F4] transition-colors"
      >
        <Clock size={18} />
        أوقات العمل
      </button>

      {/* Logout */}
      <button onClick={logout} className="w-full py-3.5 bg-white border border-[#EDE8E2] rounded-2xl text-red-500 font-bold flex items-center justify-center gap-2">
        <LogOut size={16} />
        تسجيل الخروج
      </button>
    </div>
  );

  // ─── Render: Wallet ──────────────────────────────────────────────────────
  const renderWallet = () => (
    <div className="pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pt-2">
        <div className="w-10 h-10 rounded-full bg-white border border-[#EDE8E2] flex items-center justify-center">
          <Calendar size={16} className="text-[#8B7355]" />
        </div>
        <div className="text-right">
          <p className="text-xs text-[#8B7355]">المحفظة</p>
          <h1 className="text-2xl font-black text-[#1C1410]">أرباحي</h1>
        </div>
      </div>

      {/* Balance card */}
      <div className="rounded-3xl p-5 mb-4 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #C9956A, #B8805A)' }}>
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -right-2 top-10 w-20 h-20 bg-white/10 rounded-full" />
        <p className="text-xs text-white/70 text-right mb-1 relative z-10">الرصيد المتاح</p>
        <h2 className="text-4xl font-black text-white text-right mb-4 relative z-10">
          {wallet.availableBalance.toLocaleString()} <span className="text-2xl font-bold">ريال</span>
        </h2>
        <div className="flex justify-between relative z-10">
          <div className="text-right">
            <p className="text-[10px] text-white/60">لم يُسحب</p>
            <p className="text-base font-black text-white">{wallet.availableBalance.toLocaleString()} ريال</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/60">قيد الانتظار</p>
            <p className="text-base font-black text-white">{wallet.pendingBalance.toLocaleString()} ريال</p>
          </div>
        </div>
      </div>

      {/* Payout button */}
      <button
        onClick={() => setShowModal('request_payout')}
        disabled={wallet.availableBalance === 0}
        className="w-full py-4 bg-[#1C1410] text-white rounded-2xl font-black text-base mb-5 flex items-center justify-center gap-2 disabled:opacity-40"
      >
        ↓ طلب سحب الأرباح
      </button>

      {/* Transactions */}
      <div>
        <h2 className="font-black text-lg text-right mb-3 text-[#1C1410]">المعاملات الأخيرة</h2>
        {transactions.length === 0 ? (
          <div className="py-10 text-center">
            <Wallet size={36} className="mx-auto text-[#EDE8E2] mb-2" />
            <p className="text-[#8B7355] font-bold">لا توجد معاملات بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map(t => {
              const isIncome = t.type === 'CREDIT';
              return (
                <div key={t.id} className="bg-white rounded-2xl border border-[#EDE8E2] px-4 py-3.5 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className={`text-base font-black ${isIncome ? 'text-green-500' : 'text-red-400'}`}>
                      {isIncome ? '↑' : '↓'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1C1410] truncate">{t.description}</p>
                    <p className="text-[11px] text-[#8B7355]">{t.createdAt}</p>
                  </div>
                  <p className={`font-black text-sm shrink-0 ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
                    {isIncome ? '+' : ''}{t.amount.toLocaleString()} ريال
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ─── Render: Messages ────────────────────────────────────────────────────
  const renderMessages = () => {
    if (activeConversation) {
      const convMessages = messages.filter(m => m.conversationId === activeConversation.id);
      return (
        <div className="flex flex-col h-[calc(100vh-160px)]">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setActiveConversation(null)} className="p-2 bg-white rounded-xl shadow-sm">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h3 className="font-bold text-sm">{activeConversation.clientName}</h3>
              <p className="text-[10px] text-gray-400">عميلة</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {convMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.senderRole === 'PROVIDER' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-3xl text-sm ${
                  msg.senderRole === 'PROVIDER'
                    ? 'bg-[#C9956A] text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm shadow-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-3 items-center bg-white rounded-3xl border border-gray-100 shadow-sm px-4 py-3">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="اكتبي ردّك..."
              className="flex-1 bg-transparent text-sm font-bold focus:outline-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim()}
              className="p-2 bg-[#C9956A] text-white rounded-xl disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => setSubView(null)} className="p-2 bg-white rounded-xl shadow-sm"><ArrowLeft size={20} /></button>
          <h2 className="text-2xl font-black">رسائل العملاء</h2>
        </div>
        {conversations.length === 0 ? (
          <div className="p-12 bg-white rounded-4xl border border-gray-100 text-center">
            <MessageSquare size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 font-bold">لا توجد رسائل بعد</p>
          </div>
        ) : (
          <div className="bg-white rounded-4xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => handleOpenConversation(conv)}
                className="w-full p-5 flex items-center gap-4 text-right hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#FAF7F4] text-[#C9956A] flex items-center justify-center font-black shrink-0 text-lg">
                  {conv.clientName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm">{conv.clientName}</h4>
                  <p className="text-xs text-gray-400 truncate">{conv.lastMessage}</p>
                </div>
                {(conv.unreadCount ?? 0) > 0 && (
                  <div className="w-5 h-5 bg-[#C9956A] rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0">
                    {conv.unreadCount}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Render: Working Hours ───────────────────────────────────────────────
  const renderWorkingHours = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={() => setSubView(null)} className="p-2 bg-white rounded-xl shadow-sm"><ArrowLeft size={20} /></button>
        <h2 className="text-2xl font-black">أوقات العمل</h2>
      </div>
      <div className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {workingHours.map((wh, i) => (
          <div key={i} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm">{wh.day}</span>
              <button
                onClick={() => setWorkingHours(prev => prev.map((w, j) => j === i ? { ...w, enabled: !w.enabled } : w))}
                className={`w-12 h-6 rounded-full transition-colors relative ${wh.enabled ? 'bg-[#C9956A]' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all ${wh.enabled ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
            {wh.enabled && (
              <div className="flex gap-3 items-center" dir="ltr">
                <input type="time" value={wh.start}
                  onChange={e => setWorkingHours(prev => prev.map((w, j) => j === i ? { ...w, start: e.target.value } : w))}
                  className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#C9956A]" />
                <span className="text-gray-400 text-xs font-bold">إلى</span>
                <input type="time" value={wh.end}
                  onChange={e => setWorkingHours(prev => prev.map((w, j) => j === i ? { ...w, end: e.target.value } : w))}
                  className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#C9956A]" />
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={async () => {
          try {
            await api.providers.updateMe({ workingHours });
            // Sync to .NET for AvailabilityEngine (fire-and-forget)
            if (user?.providerId) {
              dotnetApi.merchants.updateWorkingHours(user.providerId, JSON.stringify(workingHours)).catch(() => {});
            }
            toast('تم حفظ أوقات العمل ✓');
            setSubView(null);
          } catch (e: any) {
            toast(e.message || 'فشل حفظ أوقات العمل', 'error');
          }
        }}
        className="w-full bg-[#1C1410] text-white py-5 rounded-3xl font-black flex items-center justify-center gap-2"
      >
        <Save size={18} /> حفظ التغييرات
      </button>
    </div>
  );

  // ─── Render: Store Info ──────────────────────────────────────────────────
  const renderStoreInfo = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={() => setSubView(null)} className="p-2 bg-white rounded-xl shadow-sm"><ArrowLeft size={20} /></button>
        <h2 className="text-2xl font-black">معلومات المتجر</h2>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => toast('رفع الصور قريباً ✨', 'info')}
          className="relative w-24 h-24 rounded-3xl overflow-hidden border-4 border-[#EDE8E2] shadow-sm"
        >
          <img src="https://picsum.photos/seed/provider/100/100" className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <Camera size={20} className="text-white" />
          </div>
        </button>
      </div>

      <div className="space-y-4">
        {[
          { label: 'اسم المتجر', key: 'name', placeholder: 'اسم متجرك' },
          { label: 'التخصص', key: 'specialty', placeholder: 'مثال: خبيرة مكياج' },
          { label: 'المدينة', key: 'city', placeholder: 'مدينتك' },
          { label: 'رقم الجوال', key: 'phone', placeholder: '05XXXXXXXX' },
        ].map(field => (
          <div key={field.key}>
            <label className="text-xs font-bold text-gray-400 mb-1.5 block px-1">{field.label}</label>
            <input
              value={(storeInfo as any)[field.key]}
              onChange={e => setStoreInfo(p => ({ ...p, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-4 font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C9956A] text-sm"
            />
          </div>
        ))}
        <div>
          <label className="text-xs font-bold text-gray-400 mb-1.5 block px-1">نبذة عنك</label>
          <textarea
            value={storeInfo.bio}
            onChange={e => setStoreInfo(p => ({ ...p, bio: e.target.value }))}
            rows={3}
            className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-4 font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C9956A] text-sm resize-none"
          />
        </div>

        {/* Neighborhoods Coverage */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <MapPin size={14} className="text-[#C9956A]" />
            <label className="text-xs font-bold text-gray-400">الأحياء المغطاة ({storeInfo.coveredNeighborhoods.length})</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {RIYADH_NEIGHBORHOODS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => toggleNeighborhood(n)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  storeInfo.coveredNeighborhoods.includes(n)
                    ? 'bg-[#C9956A] text-white border-[#C9956A]'
                    : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-[#EDE8E2]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={async () => {
          try {
            await api.providers.updateMe({
              name: storeInfo.name,
              specialty: storeInfo.specialty,
              bio: storeInfo.bio,
              city: storeInfo.city,
              phone: storeInfo.phone,
              coveredNeighborhoods: storeInfo.coveredNeighborhoods,
            });
            toast('تم حفظ معلومات المتجر ✓');
            setSubView(null);
          } catch (e: any) {
            toast(e.message || 'حدث خطأ', 'error');
          }
        }}
        className="w-full bg-[#1C1410] text-white py-5 rounded-3xl font-black flex items-center justify-center gap-2"
      >
        <Save size={18} /> حفظ التغييرات
      </button>
    </div>
  );

  // ─── Render: Reports ─────────────────────────────────────────────────────
  const renderReports = () => {
    const completedBookings = bookings.filter(b => b.status === BookingStatus.COMPLETED);
    const monthRevenue = completedBookings
      .filter(b => {
        const d = new Date(b.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, b) => s + b.servicePrice, 0);

    // Build last-6-months chart from completed bookings
    const revenueByMonth: Record<string, number> = {};
    completedBookings.forEach(b => {
      const d = new Date(b.date);
      const key = d.toLocaleDateString('ar-SA', { month: 'short' });
      revenueByMonth[key] = (revenueByMonth[key] || 0) + b.servicePrice;
    });
    const chartData = Object.entries(revenueByMonth).map(([month, revenue]) => ({ month, revenue })).slice(-6);

    return (
      <div className="space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => setSubView(null)} className="p-2 bg-white rounded-xl shadow-sm"><ArrowLeft size={20} /></button>
          <h2 className="text-2xl font-black">التقارير</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'إيرادات هذا الشهر', value: `${monthRevenue.toLocaleString()} ﷼`, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'إجمالي الحجوزات', value: String(bookings.length), color: 'text-[#C9956A]', bg: 'bg-[#FAF7F4]' },
            { label: 'معدل الإتمام', value: `${Math.round((completedBookings.length / (bookings.length || 1)) * 100)}%`, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'إجمالي الأرباح', value: `${wallet.availableBalance.toLocaleString()} ﷼`, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          ].map((s, i) => (
            <div key={i} className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <p className={`text-xs font-bold uppercase ${s.color} mb-1`}>{s.label}</p>
              <h3 className="text-xl font-black">{s.value}</h3>
            </div>
          ))}
        </div>

        {chartData.length > 0 && (
          <div className="bg-white p-6 rounded-4xl border border-gray-100 shadow-sm">
            <h3 className="font-bold mb-4">الإيرادات الشهرية</h3>
            <div className="h-45">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)', fontSize: 12 }} formatter={(v: number) => [`${v} ﷼`, 'الإيرادات']} />
                  <Bar dataKey="revenue" fill="#f97316" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Return ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAF7F4] text-[#1C1410] font-sans" dir="rtl">
      <main className="px-5 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={subView || activeConversation?.id || activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {subView === 'hours' && renderWorkingHours()}
            {subView === 'store' && renderStoreInfo()}
            {subView === 'reports' && renderReports()}
            {subView === 'messages' && renderMessages()}
            {subView === 'notifications' && renderNotifications()}
            {!subView && (
              <>
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'bookings' && renderBookings()}
                {activeTab === 'wallet' && renderWallet()}
                {activeTab === 'services' && renderServices()}
                {activeTab === 'customers' && renderCustomers()}
                {activeTab === 'settings' && renderSettings()}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EDE8E2] px-6 pt-3 pb-8 flex justify-around items-center z-50">
        {bottomNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id); setSubView(null); setActiveConversation(null); }}
            className="relative flex flex-col items-center gap-1"
          >
            <item.icon
              size={22}
              strokeWidth={activeTab === item.id && !subView ? 2.5 : 1.8}
              className={activeTab === item.id && !subView ? 'text-[#C9956A]' : 'text-[#8B7355]'}
            />
            {item.id === 'bookings' && pendingCount > 0 && (
              <div className="absolute -top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">
                {pendingCount}
              </div>
            )}
            <span className={`text-[10px] font-bold ${activeTab === item.id && !subView ? 'text-[#C9956A]' : 'text-[#8B7355]'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-200 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="relative w-full max-w-lg bg-white rounded-t-5xl sm:rounded-5xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />
            <h3 className="text-xl font-black mb-6">
              {showModal === 'add_service' ? 'إضافة خدمة' :
               showModal === 'edit_service' ? 'تعديل الخدمة' :
               showModal === 'add_customer' ? 'إضافة عميلة' :
               showModal === 'add_booking' ? 'إضافة حجز' :
               showModal === 'request_payout' ? 'سحب الأرباح' :
               showModal === 'confirm_service_complete' ? 'تأكيد اكتمال الخدمة' :
               'تأكيد الإجراء'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {(showModal === 'add_service' || showModal === 'edit_service') && (
                <>
                  <input name="name" defaultValue={selectedItem?.name} placeholder="اسم الخدمة" required className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-[#C9956A]" />
                  <input name="price" type="number" defaultValue={selectedItem?.price} placeholder="السعر (﷼)" required className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-[#C9956A]" />
                  <input name="duration" type="number" defaultValue={selectedItem?.duration} placeholder="المدة بالدقائق" required className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-[#C9956A]" />
                </>
              )}
              {showModal === 'add_customer' && (
                <>
                  <input name="name" placeholder="الاسم الكامل" required className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none" />
                  <input name="phone" type="tel" placeholder="رقم الجوال" required className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none" />
                  <input name="email" type="email" placeholder="البريد الإلكتروني (اختياري)" className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none" />
                </>
              )}
              {showModal === 'add_booking' && (
                <>
                  <select name="customerId" required className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none">
                    <option value="">اختاري العميلة</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select name="serviceId" required className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none">
                    <option value="">اختاري الخدمة</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} — {s.price} ﷼</option>)}
                  </select>
                  <input name="date" type="date" required className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none" />
                  <input name="time" type="time" required className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none" />
                </>
              )}
              {showModal === 'request_payout' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#FAF7F4] rounded-2xl">
                    <p className="text-xs text-gray-500">الرصيد المتاح</p>
                    <p className="text-2xl font-black text-[#C9956A]">{wallet.availableBalance.toLocaleString()} ﷼</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 mb-1.5 block">رقم الآيبان (IBAN)</label>
                    <input
                      value={ibanInput}
                      onChange={e => setIbanInput(e.target.value)}
                      placeholder="SA03 8000 0000 6080 1016 7519"
                      required
                      className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-[#C9956A]"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 mb-1.5 block">المبلغ (﷼)</label>
                    <input
                      value={payoutAmount}
                      onChange={e => setPayoutAmount(e.target.value)}
                      placeholder={`الحد الأقصى ${wallet.availableBalance}`}
                      type="number"
                      max={wallet.availableBalance}
                      required
                      className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-[#C9956A]"
                    />
                  </div>
                </div>
              )}
              {showModal === 'confirm_service_complete' && (
                <div className="text-center space-y-4 py-2">
                  <div className="w-16 h-16 bg-[#FAF7F4] rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={32} className="text-[#C9956A]" />
                  </div>
                  <p className="font-bold text-gray-700">هل أكملتِ تقديم الخدمة؟</p>
                  <div className="p-4 bg-[#FAF7F4] rounded-2xl text-xs text-[#8B7355] font-bold text-right">
                    <AlertCircle size={14} className="inline ml-1" />
                    بعد تأكيد الطرفين، سيُضاف المبلغ لمحفظتك تلقائياً
                  </div>
                </div>
              )}
              {showModal.startsWith('confirm_') && showModal !== 'confirm_service_complete' && (
                <p className="text-center font-bold text-gray-600 py-2">
                  {showModal === 'confirm_accept_booking' ? 'هل تريدين قبول هذا الحجز؟' :
                   showModal === 'confirm_reject_booking' ? 'هل تريدين رفض هذا الحجز؟' :
                   'هل تريدين حذف هذه الخدمة؟'}
                </p>
              )}
              <button type="submit" className={`w-full py-5 rounded-3xl font-black text-white mt-2 ${
                showModal === 'confirm_reject_booking' || showModal === 'confirm_delete_service'
                  ? 'bg-red-500'
                  : 'bg-[#1C1410]'
              }`}>
                {showModal === 'confirm_accept_booking' ? 'نعم، قبول' :
                 showModal === 'confirm_reject_booking' ? 'نعم، رفض' :
                 showModal === 'confirm_delete_service' ? 'نعم، حذف' :
                 showModal === 'confirm_service_complete' ? 'نعم، أكّدي الاكتمال' :
                 showModal === 'request_payout' ? 'إرسال طلب السحب' :
                 'حفظ'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
