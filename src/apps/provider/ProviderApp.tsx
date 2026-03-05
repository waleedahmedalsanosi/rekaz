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
        dotnetApi.wallet.get(user?.providerId ?? ''),
        api.wallet.transactions(),
        api.providers.getMe().catch(() => null),
      ]);
      setBookings(bkgs);
      setServices(svcs);
      setConversations(convs);
      setWallet(w);
      setTransactions(txns);
      if (myProfile?.workingHours) setWorkingHours(myProfile.workingHours);
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
    { id: 'services', label: 'الخدمات', icon: ShoppingBag },
    { id: 'customers', label: 'العملاء', icon: Users },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
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
  const renderDashboard = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">أهلاً {user?.name || 'بك'} 👋</h2>
          <p className="text-sm text-gray-500">إليك ملخص أعمالك اليوم</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-orange-100 border-2 border-white shadow-sm overflow-hidden">
          <img src="https://picsum.photos/seed/user/100/100" alt="Profile" />
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
        {[
          { label: 'صافي الدخل', value: `${wallet.availableBalance.toLocaleString()} ﷼`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'معلّق', value: `${wallet.pendingBalance} ﷼`, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'الحجوزات', value: String(bookings.length), icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'تقييمك', value: '4.9/5', icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        ].map((stat, i) => (
          <div key={i} className="min-w-35 p-4 bg-white rounded-3xl border border-gray-100 shadow-sm shrink-0">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase">{stat.label}</p>
            <h3 className="text-lg font-black">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white p-5 rounded-4xl border border-gray-100 shadow-sm">
        <h3 className="font-bold mb-4">أداء المبيعات</h3>
        <div className="h-45 -mr-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)' }} />
              <Area type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">حجوزات اليوم</h3>
          <button onClick={() => setActiveTab('bookings')} className="text-xs text-orange-600 font-bold">عرض الكل</button>
        </div>
        {bookings.filter(b => b.status === BookingStatus.PENDING).length === 0 ? (
          <div className="p-8 bg-white rounded-3xl border border-gray-100 text-center">
            <p className="text-gray-400 text-sm">لا توجد حجوزات معلقة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.slice(0, 3).map((booking) => (
              <div key={booking.id} className="p-4 bg-white rounded-3xl border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-orange-600 shrink-0">
                  <Calendar size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate">{services.find(s => s.id === booking.serviceId)?.name || 'حجز خدمة'}</h4>
                  <p className="text-[10px] text-gray-400">{customers.find(c => c.id === booking.customerId)?.name || 'عميل'} • {booking.time}</p>
                  {booking.neighborhood && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={9} className="text-gray-400" />
                      <span className="text-[9px] text-gray-400">{booking.neighborhood}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="font-black text-sm">{booking.servicePrice} ﷼</p>
                  {booking.status === BookingStatus.PENDING && (
                    <div className="flex gap-1">
                      <button onClick={() => { setSelectedItem(booking); setShowModal('confirm_accept_booking'); }} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
                        <CheckCircle size={14} />
                      </button>
                      <button onClick={() => { setSelectedItem(booking); setShowModal('confirm_reject_booking'); }} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                        <Plus size={14} className="rotate-45" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── Render: Bookings ────────────────────────────────────────────────────
  const renderBookings = () => (
    <div className="space-y-6 pb-24">
      <h2 className="text-2xl font-black">الحجوزات</h2>
      {bookings.length === 0 ? (
        <div className="p-12 bg-white rounded-4xl border border-gray-100 text-center">
          <Calendar size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-bold">لا توجد حجوزات بعد</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const customer = customers.find(c => c.id === booking.customerId);
            const bothConfirmed = booking.clientConfirmed && booking.providerConfirmed;
            const statusColor = {
              [BookingStatus.CONFIRMED]: 'bg-green-500',
              [BookingStatus.PENDING]: 'bg-orange-400',
              [BookingStatus.COMPLETED]: 'bg-blue-400',
              [BookingStatus.CANCELLED]: 'bg-gray-300',
              [BookingStatus.DISPUTED]: 'bg-red-400',
            }[booking.status];
            const statusLabel = {
              [BookingStatus.CONFIRMED]: 'مؤكد',
              [BookingStatus.PENDING]: 'معلق',
              [BookingStatus.COMPLETED]: 'مكتمل',
              [BookingStatus.CANCELLED]: 'ملغي',
              [BookingStatus.DISPUTED]: 'نزاع',
            }[booking.status];

            return (
              <div key={booking.id} className="p-5 bg-white rounded-4xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-1.5 h-full ${statusColor}`} />
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold">{services.find(s => s.id === booking.serviceId)?.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      العميلة: {customer?.name}
                      {/* رقم الجوال يظهر فقط بعد تأكيد الطرفين */}
                      {bothConfirmed && customer?.phone && (
                        <span className="mr-2 text-orange-600 font-bold">({customer.phone})</span>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-400">{booking.date} • {booking.time}</p>
                    {booking.neighborhood && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-gray-400" />
                        <span className="text-[10px] text-gray-400">{booking.neighborhood}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-black text-orange-600">{booking.servicePrice} ﷼</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${
                      booking.status === BookingStatus.CONFIRMED ? 'bg-green-50 text-green-700' :
                      booking.status === BookingStatus.PENDING ? 'bg-orange-50 text-orange-700' :
                      booking.status === BookingStatus.COMPLETED ? 'bg-blue-50 text-blue-700' :
                      booking.status === BookingStatus.DISPUTED ? 'bg-red-50 text-red-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{statusLabel}</span>
                  </div>
                </div>

                {/* Confirmation status row */}
                {booking.status === BookingStatus.CONFIRMED && (
                  <div className="flex items-center gap-2 mb-2 text-[10px]">
                    <span className={`flex items-center gap-0.5 ${booking.providerConfirmed ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle size={10} /> أنتِ
                    </span>
                    <span className="text-gray-200">|</span>
                    <span className={`flex items-center gap-0.5 ${booking.clientConfirmed ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle size={10} /> العميلة
                    </span>
                  </div>
                )}

                <div className="flex gap-2 mt-3 flex-wrap">
                  {booking.status === BookingStatus.PENDING && (
                    <>
                      <button onClick={() => { setSelectedItem(booking); setShowModal('confirm_accept_booking'); }} className="flex-1 py-3 bg-green-600 text-white rounded-2xl text-xs font-black hover:bg-green-700 transition-colors">قبول</button>
                      <button onClick={() => { setSelectedItem(booking); setShowModal('confirm_reject_booking'); }} className="flex-1 py-3 bg-red-50 text-red-600 rounded-2xl text-xs font-black hover:bg-red-100 transition-colors">رفض</button>
                    </>
                  )}
                  {booking.status === BookingStatus.CONFIRMED && !booking.providerConfirmed && (
                    <button
                      onClick={() => { setSelectedItem(booking); setShowModal('confirm_service_complete'); }}
                      className="flex-1 py-3 bg-orange-600 text-white rounded-2xl text-xs font-black"
                    >
                      ✓ أكّدي اكتمال الخدمة
                    </button>
                  )}
                  {booking.status === BookingStatus.CONFIRMED && booking.providerConfirmed && !booking.clientConfirmed && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 font-bold bg-orange-50 px-3 py-2 rounded-2xl w-full">
                      <CheckCircle size={12} />
                      <span>أكّدتِ — بانتظار تأكيد العميلة</span>
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

  // ─── Render: Services ────────────────────────────────────────────────────
  const renderServices = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">الخدمات</h2>
        <button onClick={() => setShowModal('add_service')} className="bg-black text-white px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2">
          <Plus size={16} /> إضافة
        </button>
      </div>
      {services.length === 0 ? (
        <div className="p-12 bg-white rounded-4xl border border-gray-100 text-center">
          <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-bold">لا توجد خدمات بعد</p>
          <button onClick={() => setShowModal('add_service')} className="mt-4 px-6 py-3 bg-black text-white rounded-2xl text-sm font-bold">أضفي خدمة جديدة</button>
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
                  <p className="font-black text-orange-600 flex-1">{service.price} ﷼</p>
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
        <button onClick={() => setShowModal('add_customer')} className="bg-black text-white px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2">
          <Plus size={16} /> إضافة
        </button>
      </div>
      <div className="bg-white rounded-4xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {customers.map((customer) => (
          <div key={customer.id} className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black shrink-0">
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
        <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto">
          <Bell size={28} className="text-orange-500" />
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
            className="w-full py-3.5 bg-orange-500 text-white font-black rounded-2xl hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Bell size={18} />
            {notifStatus === 'loading' ? 'جارٍ التفعيل...' : '🔔 تفعيل التنبيهات'}
          </button>
        )}
      </div>
    </div>
  );

    // ─── Render: Settings ────────────────────────────────────────────────────
  const renderSettings = () => (
    <div className="space-y-6 pb-24">
      <h2 className="text-2xl font-black">الإعدادات</h2>
      <div className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 bg-linear-to-br from-orange-500 to-orange-600 text-white flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl border-4 border-white/20 overflow-hidden shrink-0">
            <img src="https://picsum.photos/seed/provider/100/100" alt="" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg">{storeInfo.name}</h3>
              <div className="flex items-center gap-1 bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                <ShieldCheck size={9} />
                <span>موثّقة</span>
              </div>
            </div>
            <p className="text-xs text-white/80">{storeInfo.specialty} • {storeInfo.city}</p>
          </div>
          <button onClick={logout} className="p-2 bg-white/20 rounded-xl"><LogOut size={18} /></button>
        </div>
        <div className="p-4 space-y-1">
          {[
            { id: 'store', label: 'معلومات المتجر', icon: ShoppingBag },
            { id: 'hours', label: 'أوقات العمل', icon: Clock },
            { id: 'wallet', label: 'المحفظة والأرباح', icon: Wallet },
            { id: 'messages', label: 'رسائل العملاء', icon: MessageSquare, badge: unreadMessages },
            { id: 'reports', label: 'التقارير والإحصائيات', icon: PieChart },
            { id: 'notifications', label: 'التنبيهات', icon: Bell },
          ].map((item) => (
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

  // ─── Render: Wallet ──────────────────────────────────────────────────────
  const renderWallet = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={() => setSubView(null)} className="p-2 bg-white rounded-xl shadow-sm"><ArrowLeft size={20} /></button>
        <h2 className="text-2xl font-black">المحفظة</h2>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-5 rounded-4xl text-white col-span-2">
          <p className="text-xs text-white/80 font-bold mb-1">الرصيد المتاح للسحب</p>
          <h2 className="text-4xl font-black">{wallet.availableBalance.toLocaleString()} <span className="text-2xl">﷼</span></h2>
          <button
            onClick={() => setShowModal('request_payout')}
            disabled={wallet.availableBalance === 0}
            className="mt-4 px-5 py-2.5 bg-white text-orange-600 rounded-2xl text-sm font-black disabled:opacity-50"
          >
            سحب الأرباح
          </button>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] text-gray-400 font-bold">معلّق</p>
          <h3 className="text-xl font-black mt-1">{wallet.pendingBalance} ﷼</h3>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] text-gray-400 font-bold">إجمالي الأرباح</p>
          <h3 className="text-xl font-black mt-1">{(wallet.availableBalance + wallet.pendingBalance).toLocaleString()} ﷼</h3>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-4xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold mb-4">سجل المعاملات</h3>
        <div className="space-y-3">
          {transactions.map(t => (
            <div key={t.id} className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                t.type === 'CREDIT' ? 'bg-green-50 text-green-600' :
                t.type === 'PAYOUT' ? 'bg-blue-50 text-blue-600' :
                'bg-red-50 text-red-600'
              }`}>
                {t.type === 'CREDIT' ? <TrendingUp size={16} /> : <Wallet size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{t.description}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-gray-400">{t.createdAt}</p>
                  {t.status === 'PENDING' && (
                    <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">معلّق</span>
                  )}
                </div>
              </div>
              <p className={`font-black text-sm shrink-0 ${
                t.type === 'PAYOUT' ? 'text-red-500' : 'text-green-600'
              }`}>
                {t.amount > 0 ? '+' : ''}{t.amount} ﷼
              </p>
            </div>
          ))}
        </div>
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
                    ? 'bg-orange-600 text-white rounded-tr-sm'
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
              className="p-2 bg-orange-600 text-white rounded-xl disabled:opacity-40"
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
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black shrink-0 text-lg">
                  {conv.clientName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm">{conv.clientName}</h4>
                  <p className="text-xs text-gray-400 truncate">{conv.lastMessage}</p>
                </div>
                {(conv.unreadCount ?? 0) > 0 && (
                  <div className="w-5 h-5 bg-orange-600 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0">
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
                className={`w-12 h-6 rounded-full transition-colors relative ${wh.enabled ? 'bg-orange-500' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all ${wh.enabled ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
            {wh.enabled && (
              <div className="flex gap-3 items-center" dir="ltr">
                <input type="time" value={wh.start}
                  onChange={e => setWorkingHours(prev => prev.map((w, j) => j === i ? { ...w, start: e.target.value } : w))}
                  className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-300" />
                <span className="text-gray-400 text-xs font-bold">إلى</span>
                <input type="time" value={wh.end}
                  onChange={e => setWorkingHours(prev => prev.map((w, j) => j === i ? { ...w, end: e.target.value } : w))}
                  className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-300" />
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
        className="w-full bg-black text-white py-5 rounded-3xl font-black flex items-center justify-center gap-2"
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
          className="relative w-24 h-24 rounded-3xl overflow-hidden border-4 border-orange-100 shadow-sm"
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
              className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-4 font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
            />
          </div>
        ))}
        <div>
          <label className="text-xs font-bold text-gray-400 mb-1.5 block px-1">نبذة عنك</label>
          <textarea
            value={storeInfo.bio}
            onChange={e => setStoreInfo(p => ({ ...p, bio: e.target.value }))}
            rows={3}
            className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-4 font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm resize-none"
          />
        </div>

        {/* Neighborhoods Coverage */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <MapPin size={14} className="text-orange-500" />
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
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-orange-200'
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
        className="w-full bg-black text-white py-5 rounded-3xl font-black flex items-center justify-center gap-2"
      >
        <Save size={18} /> حفظ التغييرات
      </button>
    </div>
  );

  // ─── Render: Reports ─────────────────────────────────────────────────────
  const renderReports = () => {
    const completedBookings = bookings.filter(b => b.status === BookingStatus.COMPLETED);
    return (
      <div className="space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => setSubView(null)} className="p-2 bg-white rounded-xl shadow-sm"><ArrowLeft size={20} /></button>
          <h2 className="text-2xl font-black">التقارير</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'إيرادات هذا الشهر', value: '4,200 ﷼', color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'إجمالي الحجوزات', value: String(bookings.length), color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'معدل الإتمام', value: `${Math.round((completedBookings.length / (bookings.length || 1)) * 100)}%`, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'متوسط التقييم', value: '4.9 ★', color: 'text-yellow-600', bg: 'bg-yellow-50' },
          ].map((s, i) => (
            <div key={i} className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <p className={`text-xs font-bold uppercase ${s.color} mb-1`}>{s.label}</p>
              <h3 className="text-xl font-black">{s.value}</h3>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-4xl border border-gray-100 shadow-sm">
          <h3 className="font-bold mb-4">الإيرادات الشهرية</h3>
          <div className="h-45">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)', fontSize: 12 }} formatter={(v: number) => [`${v} ﷼`, 'الإيرادات']} />
                <Bar dataKey="revenue" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // ─── Return ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans" dir="rtl">
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
            {subView === 'wallet' && renderWallet()}
            {subView === 'messages' && renderMessages()}
            {subView === 'notifications' && renderNotifications()}
            {!subView && (
              <>
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'bookings' && renderBookings()}
                {activeTab === 'services' && renderServices()}
                {activeTab === 'customers' && renderCustomers()}
                {activeTab === 'settings' && renderSettings()}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-4 py-3 pb-8 flex justify-around items-center z-50">
        {bottomNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id); setSubView(null); setActiveConversation(null); }}
            className="relative flex flex-col items-center gap-1 group"
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${
              activeTab === item.id && !subView
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 -translate-y-1'
                : 'text-gray-400 group-hover:bg-gray-50'
            }`}>
              <item.icon size={22} strokeWidth={activeTab === item.id && !subView ? 2.5 : 2} />
            </div>
            {item.id === 'bookings' && pendingCount > 0 && (
              <div className="absolute -top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">
                {pendingCount}
              </div>
            )}
            <span className={`text-[10px] font-bold transition-all ${
              activeTab === item.id && !subView ? 'text-orange-600 opacity-100' : 'text-gray-400 opacity-0'
            }`}>{item.label}</span>
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
                  <input name="name" defaultValue={selectedItem?.name} placeholder="اسم الخدمة" required className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <input name="price" type="number" defaultValue={selectedItem?.price} placeholder="السعر (﷼)" required className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <input name="duration" type="number" defaultValue={selectedItem?.duration} placeholder="المدة بالدقائق" required className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-orange-400" />
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
                  <div className="p-4 bg-orange-50 rounded-2xl">
                    <p className="text-xs text-gray-500">الرصيد المتاح</p>
                    <p className="text-2xl font-black text-orange-600">{wallet.availableBalance.toLocaleString()} ﷼</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 mb-1.5 block">رقم الآيبان (IBAN)</label>
                    <input
                      value={ibanInput}
                      onChange={e => setIbanInput(e.target.value)}
                      placeholder="SA03 8000 0000 6080 1016 7519"
                      required
                      className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                      className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                </div>
              )}
              {showModal === 'confirm_service_complete' && (
                <div className="text-center space-y-4 py-2">
                  <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={32} className="text-orange-500" />
                  </div>
                  <p className="font-bold text-gray-700">هل أكملتِ تقديم الخدمة؟</p>
                  <div className="p-4 bg-orange-50 rounded-2xl text-xs text-orange-700 font-bold text-right">
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
                  : 'bg-black'
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
