import React, { useState, useRef, useEffect } from 'react';
import {
  Home, Calendar, Settings, Search, Star,
  LogOut, ChevronRight, ArrowLeft, MessageSquare, CreditCard as PaymentIcon,
  CheckCircle, Send, MapPin, ShieldCheck, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RIYADH_NEIGHBORHOODS } from '../../lib/mockData';
import { BookingStatus, PaymentStatus } from '../../lib/types';
import { useToast } from '../../components/Toast';
import { api, dotnetApi, DotNetMerchantDto, DotNetMerchantAvailabilityDto, DotNetAvailabilityResponseDto, ApiProvider, ApiService, ApiBooking, ApiConversation, ApiMessage, ApiReview } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORIES = ['الكل', 'مكياج', 'شعر'];
const COMMISSION_RATE = 0.02;

export default function ClientApp() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showModal, setShowModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider | null>(null);
  const [providerServices, setProviderServices] = useState<ApiService[]>([]);
  const [providerReviews, setProviderReviews] = useState<ApiReview[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');

  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [dotnetMerchants, setDotnetMerchants] = useState<DotNetMerchantDto[]>([]);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [services, setServices] = useState<ApiService[]>([]);
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [activeConversation, setActiveConversation] = useState<ApiConversation | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Availability booking flow ────────────────────────────────────────────
  // 'datetime' → user picks date+time → 'check' → 'select' (show merchants) → 'confirm'
  const [bookingStep, setBookingStep] = useState<'datetime' | 'select' | 'confirm'>('datetime');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<DotNetAvailabilityResponseDto | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<DotNetMerchantAvailabilityDto | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setDataLoading(true);
    try {
      const [provs, svcs, bkgs, convs] = await Promise.all([
        api.providers.list(),
        api.services.list(),
        api.bookings.list(),
        api.conversations.list(),
      ]);
      setProviders(provs);
      setServices(svcs);
      setBookings(bkgs);
      setConversations(convs);
      // Load .NET merchants in background — used to enrich search with businessName
      dotnetApi.merchants.getAll().then(setDotnetMerchants).catch(() => {});
    } catch (e: any) {
      toast(e.message || 'خطأ في تحميل البيانات', 'error');
    } finally {
      setDataLoading(false);
    }
  }

  // Build a businessName lookup: providerRefId → businessName (from .NET)
  const businessNameMap = Object.fromEntries(
    dotnetMerchants
      .filter(m => m.providerRefId)
      .map(m => [m.providerRefId as string, m.businessName])
  );

  const q = searchQuery.trim().toLowerCase();

  const filteredProviders = q
    ? providers.filter(p =>
        (businessNameMap[p.id] || p.name).toLowerCase().includes(q) ||
        (p.specialty || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q)
      )
    : providers;

  const filteredServices = (() => {
    const byCat = categoryFilter ? services.filter(s => s.category === categoryFilter) : services;
    return q
      ? byCat.filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q)
        )
      : byCat;
  })();

  const bottomNavItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: Home },
    { id: 'bookings', label: 'حجوزاتي', icon: Calendar },
    { id: 'messages', label: 'رسائلي', icon: MessageSquare },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  useEffect(() => {
    if (activeConversation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeConversation]);

  const handleClose = () => {
    setShowModal(null);
    setSelectedItem(null);
    setReviewRating(5);
    setReviewComment('');
    setSelectedNeighborhood('');
    setBookingStep('datetime');
    setBookingDate('');
    setBookingTime('');
    setAvailabilityResult(null);
    setSelectedMerchant(null);
  };

  const checkAvailability = async () => {
    if (!bookingDate || !bookingTime) return;
    setAvailabilityLoading(true);
    try {
      const result = await dotnetApi.bookings.getAvailableMerchants(
        selectedItem?.id ?? '',
        `${bookingDate}T${bookingTime}:00.000Z`,
      );
      setAvailabilityResult(result);
      setBookingStep('select');
    } catch {
      // .NET offline — skip merchant selection and book directly with the service's own provider
      setAvailabilityResult({ isAvailable: true, availableMerchants: [], suggestedMerchant: null, suggestedTime: null });
      setSelectedMerchant(null); // will fall back to selectedItem.providerId in handleSubmit
      setBookingStep('confirm');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleStartChat = async (provider: ApiProvider) => {
    try {
      const existing = conversations.find(c => c.providerId === provider.id);
      let conv: ApiConversation;
      if (existing) {
        conv = existing;
      } else {
        conv = await api.conversations.start(provider.id);
        setConversations(prev => [conv, ...prev]);
      }
      const msgs = await api.conversations.messages(conv.id);
      setMessages(msgs);
      setActiveConversation(conv);
      setSelectedProvider(null);
      setActiveTab('messages');
    } catch (e: any) {
      toast(e.message || 'حدث خطأ', 'error');
    }
  };

  const handleOpenConversation = async (conv: ApiConversation) => {
    setActiveConversation(conv);
    try {
      const msgs = await api.conversations.messages(conv.id);
      setMessages(msgs);
    } catch { /* ignore */ }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    try {
      if (showModal === 'add_booking' && bookingStep === 'confirm') {
        const neighborhood = selectedNeighborhood || (data.neighborhood as string);
        if (!neighborhood) { toast('يرجى اختيار الحي', 'error'); return; }
        // Use the merchant selected from the availability list, falling back to the service's own provider
        const providerId = selectedMerchant?.providerRefId ?? selectedItem.providerId;
        const booking = await api.bookings.create({
          clientId:    user!.id,
          clientName:  user!.name,
          providerId,
          serviceId:   selectedItem.id,
          date:        bookingDate,
          time:        bookingTime,
          neighborhood,
          totalPrice:  selectedItem.price,
        });
        setBookings(prev => [booking, ...prev]);
        toast('تم إرسال طلب الحجز! سيتم تأكيده قريباً ✓');
      } else if (showModal === 'process_payment') {
        const paid = await api.bookings.pay(selectedItem.id);
        setBookings(prev => prev.map(b => b.id === paid.id ? paid : b));
        toast('تمت عملية الدفع بنجاح 💳');
      } else if (showModal === 'add_review') {
        const review = await api.reviews.create(selectedItem.id, reviewRating, reviewComment);
        setBookings(prev => prev.map(b => b.id === selectedItem.id ? { ...b, reviewId: review.id } : b));
        toast('تم إرسال تقييمك، شكراً لكِ! ⭐');
      } else if (showModal === 'confirm_service') {
        const b = await api.bookings.confirm(selectedItem.id);
        setBookings(prev => prev.map(x => x.id === b.id ? b : x));
        toast('تم تأكيد استلام الخدمة ✓');
      }
    } catch (e: any) {
      toast(e.message || 'حدث خطأ', 'error');
      return;
    }

    handleClose();
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const formatSuggestedTime = (iso: string) => {
    const d = new Date(iso);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const dDay = new Date(d); dDay.setHours(0, 0, 0, 0);
    const timeStr = d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    if (dDay.getTime() === today.getTime()) return `اليوم الساعة ${timeStr}`;
    if (dDay.getTime() === tomorrow.getTime()) return `غداً الساعة ${timeStr}`;
    return `${d.toLocaleDateString('ar-SA', { weekday: 'long' })} الساعة ${timeStr}`;
  };

  // ─── Render: Dashboard ───────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">أهلاً بكِ ✨</h2>
          <p className="text-sm text-gray-500">اكتشفي أفضل خبيرات التجميل</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="ابحثي عن خبيرة أو خدمة..."
          className="w-full bg-white border border-gray-100 rounded-3xl px-12 py-4 text-sm shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
          >✕</button>
        )}
      </div>

      {/* Providers */}
      <div className="space-y-3">
        <h3 className="font-bold">
          {q ? `نتائج البحث (${filteredProviders.length})` : 'أفضل خبيرات التجميل'}
        </h3>
        <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4">
          {filteredProviders.map((provider) => (
            <button
              key={provider.id}
              onClick={async () => {
                setSelectedProvider(provider);
                try {
                  const [svcs, revs] = await Promise.all([
                    api.providers.services(provider.id),
                    api.providers.reviews(provider.id),
                  ]);
                  setProviderServices(svcs);
                  setProviderReviews(revs);
                } catch { /* ignore */ }
              }}
              className="min-w-40 bg-white rounded-4xl border border-gray-100 p-4 shadow-sm text-center active:scale-[0.97] transition-all"
            >
              <div className="relative w-20 h-20 mx-auto mb-3">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-orange-100">
                  <img src={provider.avatar} className="w-full h-full object-cover" alt="" />
                </div>
                {provider.isVerified && (
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border border-white">
                    <ShieldCheck size={11} className="text-white" />
                  </div>
                )}
              </div>
              <h4 className="font-bold text-sm">{businessNameMap[provider.id] || provider.name}</h4>
              <p className="text-[10px] text-gray-400 mb-2">{provider.specialty}</p>
              <div className="flex items-center justify-center gap-1 text-orange-500 font-black text-xs">
                <Star size={12} fill="currentColor" />
                <span>{provider.rating}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">خدمات مميزة</h3>
          <div className="flex gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === 'الكل' ? null : cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  (cat === 'الكل' && !categoryFilter) || categoryFilter === cat
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-500 border border-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4">
          {filteredServices.map((service) => (
            <div key={service.id} className="min-w-50 bg-white rounded-4xl border border-gray-100 overflow-hidden shadow-sm shrink-0">
              <img src={`https://picsum.photos/seed/${service.id}/300/200`} className="w-full h-32 object-cover" alt="" />
              <div className="p-4">
                <h4 className="font-bold text-sm">{service.name}</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">{service.duration} دقيقة</p>
                <p className="text-orange-600 font-black text-sm mt-1">{service.price} ﷼</p>
                <button
                  onClick={() => { setSelectedItem(service); setShowModal('add_booking'); }}
                  className="w-full mt-3 py-2.5 bg-black text-white rounded-xl text-xs font-bold active:scale-[0.97] transition-all"
                >
                  احجزي الآن
                </button>
              </div>
            </div>
          ))}
          {filteredServices.length === 0 && (
            <div className="w-full py-8 text-center text-gray-400 text-sm font-bold">
              لا توجد خدمات في هذه الفئة
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Render: Bookings ────────────────────────────────────────────────────
  const renderBookings = () => (
    <div className="space-y-6 pb-24">
      <h2 className="text-2xl font-black">حجوزاتي</h2>
      {bookings.length === 0 ? (
        <div className="p-12 bg-white rounded-4xl border border-gray-100 text-center">
          <Calendar size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-bold mb-2">لا توجد حجوزات بعد</p>
          <button onClick={() => setActiveTab('dashboard')} className="text-sm text-blue-600 font-bold">
            اكتشفي الخدمات
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const hasReview = !!booking.reviewId;
            const bothConfirmed = booking.clientConfirmed && booking.providerConfirmed;

            const statusConfig = {
              [BookingStatus.CONFIRMED]: { label: 'مؤكد', color: 'bg-green-500', textColor: 'text-green-700', bg: 'bg-green-50' },
              [BookingStatus.PENDING]: { label: 'في الانتظار', color: 'bg-orange-400', textColor: 'text-orange-700', bg: 'bg-orange-50' },
              [BookingStatus.COMPLETED]: { label: 'مكتمل', color: 'bg-blue-400', textColor: 'text-blue-700', bg: 'bg-blue-50' },
              [BookingStatus.CANCELLED]: { label: 'ملغي', color: 'bg-gray-300', textColor: 'text-gray-500', bg: 'bg-gray-50' },
              [BookingStatus.DISPUTED]: { label: 'نزاع', color: 'bg-red-400', textColor: 'text-red-700', bg: 'bg-red-50' },
            }[booking.status];

            return (
              <div key={booking.id} className="p-5 bg-white rounded-4xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-1.5 h-full ${statusConfig.color}`} />
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold">{booking.serviceName}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">مع {booking.providerName}</p>
                    <p className="text-[10px] text-gray-400">{booking.date} • {booking.time}</p>
                    {booking.neighborhood && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin size={10} className="text-gray-400" />
                        <span className="text-[10px] text-gray-400">{booking.neighborhood}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-black text-orange-600">{booking.totalPrice} ﷼</p>
                    <p className="text-[10px] text-gray-400">{booking.servicePrice} + {booking.commission} عمولة</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${statusConfig.bg} ${statusConfig.textColor}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-2 flex-wrap">
                  {booking.paymentStatus === PaymentStatus.UNPAID && booking.status !== BookingStatus.CANCELLED && (
                    <button
                      onClick={() => { setSelectedItem(booking); setShowModal('process_payment'); }}
                      className="flex-1 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-bold"
                    >
                      ادفع الآن
                    </button>
                  )}
                  {booking.status === BookingStatus.CONFIRMED && !booking.clientConfirmed && (
                    <button
                      onClick={() => { setSelectedItem(booking); setShowModal('confirm_service'); }}
                      className="flex-1 py-2.5 bg-green-600 text-white rounded-2xl text-xs font-bold"
                    >
                      ✓ أكّدي استلام الخدمة
                    </button>
                  )}
                  {booking.status === BookingStatus.CONFIRMED && booking.clientConfirmed && !bothConfirmed && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 font-bold bg-orange-50 px-3 py-2 rounded-2xl">
                      <CheckCircle size={14} />
                      <span>أكّدتِ — بانتظار تأكيد المبدعة</span>
                    </div>
                  )}
                  {booking.status === BookingStatus.COMPLETED && !hasReview && (
                    <button
                      onClick={() => { setSelectedItem(booking); setShowModal('add_review'); }}
                      className="flex-1 py-2.5 bg-orange-50 text-orange-600 rounded-2xl text-xs font-bold border border-orange-100"
                    >
                      ⭐ اكتبي تقييماً
                    </button>
                  )}
                  {booking.status === BookingStatus.COMPLETED && hasReview && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 font-bold">
                      <CheckCircle size={14} className="text-green-500" />
                      <span>تم التقييم</span>
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
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-2xl overflow-hidden">
                <img src={activeConversation.providerAvatar} className="w-full h-full object-cover" alt="" />
              </div>
              <div>
                <h3 className="font-bold text-sm">{activeConversation.providerName}</h3>
                <p className="text-[10px] text-gray-400">متاحة</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {convMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.senderRole === 'CLIENT' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-3xl text-sm ${
                  msg.senderRole === 'CLIENT'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
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
              placeholder="اكتبي رسالتك..."
              className="flex-1 bg-transparent text-sm font-bold focus:outline-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim()}
              className="p-2 bg-blue-600 text-white rounded-xl disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-24">
        <h2 className="text-2xl font-black">رسائلي</h2>
        {conversations.length === 0 ? (
          <div className="p-12 bg-white rounded-4xl border border-gray-100 text-center">
            <MessageSquare size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 font-bold mb-2">لا توجد محادثات بعد</p>
            <p className="text-xs text-gray-400">يمكنك مراسلة أي مبدعة من ملفها الشخصي</p>
          </div>
        ) : (
          <div className="bg-white rounded-4xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => handleOpenConversation(conv)}
                className="w-full p-5 flex items-center gap-4 text-right hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0">
                  <img src={conv.providerAvatar} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm">{conv.providerName}</h4>
                  <p className="text-xs text-gray-400 truncate">{conv.lastMessage || 'ابدأي المحادثة...'}</p>
                </div>
                {(conv.unreadCount ?? 0) > 0 && (
                  <div className="w-5 h-5 bg-blue-600 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0">
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

  // ─── Render: Settings ────────────────────────────────────────────────────
  const renderSettings = () => (
    <div className="space-y-6 pb-24">
      <h2 className="text-2xl font-black">الإعدادات</h2>
      <div className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 bg-linear-to-br from-blue-600 to-blue-700 text-white flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl border-4 border-white/20 overflow-hidden shrink-0">
            <img src="https://picsum.photos/seed/client/100/100" alt="" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-lg">{user?.name || 'عميلة'}</h3>
            <p className="text-xs text-white/80">عميلة مميزة</p>
          </div>
          <button onClick={logout} className="p-2 bg-white/20 rounded-xl"><LogOut size={18} /></button>
        </div>
        <div className="p-4 space-y-1">
          {[
            { label: 'إعدادات الحساب', icon: Settings, action: () => toast('إعدادات الحساب قريباً ✨', 'info') },
            { label: 'الدعم الفني', icon: MessageSquare, action: () => toast('للتواصل مع الدعم: support@ziena.sa', 'info') },
          ].map((item, i) => (
            <button key={i} onClick={item.action} className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 rounded-2xl transition-colors">
              <div className="p-2 bg-gray-50 rounded-xl text-gray-500"><item.icon size={18} /></div>
              <span className="text-sm font-bold flex-1 text-right">{item.label}</span>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-4xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold mb-4">إحصائياتي</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'حجوزاتي', value: String(bookings.length) },
            { label: 'تقييماتي', value: String(bookings.filter(b => b.reviewId).length) },
            { label: 'أنفقت', value: `${bookings.filter(b => b.paymentStatus === 'PAID').reduce((s, b) => s + b.totalPrice, 0)} ﷼` },
          ].map((s, i) => (
            <div key={i} className="text-center p-3 bg-gray-50 rounded-2xl">
              <p className="text-lg font-black">{s.value}</p>
              <p className="text-[10px] text-gray-400 font-bold">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── Render: Provider Profile ────────────────────────────────────────────
  const renderProviderProfile = () => {
    if (!selectedProvider) return null;
    const avgRating = providerReviews.length
      ? (providerReviews.reduce((s, r) => s + r.rating, 0) / providerReviews.length).toFixed(1)
      : selectedProvider.rating.toFixed(1);

    return (
      <div className="pb-24">
        {/* Header */}
        <div className="relative -mx-5 mb-6">
          <div className="h-36 bg-gradient-to-br from-orange-400 to-pink-500" />
          <button
            onClick={() => setSelectedProvider(null)}
            className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-xl"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="px-5">
            <div className="flex items-end gap-4 -mt-10">
              <div className="relative w-20 h-20 shrink-0">
                <div className="w-20 h-20 rounded-3xl overflow-hidden border-4 border-white shadow-lg">
                  <img src={selectedProvider.avatar} className="w-full h-full object-cover" alt="" />
                </div>
                {selectedProvider.isVerified && (
                  <div className="absolute -bottom-1 -left-1 flex items-center gap-1 bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white">
                    <ShieldCheck size={9} />
                    <span>موثّقة</span>
                  </div>
                )}
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-black">{selectedProvider.name}</h2>
                <p className="text-sm text-gray-500">{selectedProvider.specialty}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => handleStartChat(selectedProvider)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-2xl text-sm font-bold border border-blue-100"
          >
            <MessageSquare size={16} />
            <span>راسليها</span>
          </button>
          <button
            onClick={() => { setSelectedItem(providerServices[0] || services[0]); setSelectedProvider(null); setShowModal('add_booking'); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-black text-white rounded-2xl text-sm font-bold"
          >
            <Calendar size={16} />
            <span>احجزي الآن</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'التقييم', value: `${avgRating} ★` },
            { label: 'التقييمات', value: String(selectedProvider.reviewCount ?? providerReviews.length) },
            { label: 'الخدمات', value: String(providerServices.length) },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-3 text-center border border-gray-100">
              <p className="font-black text-base">{s.value}</p>
              <p className="text-[10px] text-gray-400 font-bold">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Coverage */}
        {selectedProvider.coveredNeighborhoods && selectedProvider.coveredNeighborhoods.length > 0 && (
          <div className="bg-white rounded-4xl border border-gray-100 p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} className="text-orange-500" />
              <h3 className="font-bold">الأحياء المغطاة</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedProvider.coveredNeighborhoods.map(n => (
                <span key={n} className="px-3 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-xl border border-orange-100">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {selectedProvider.bio && (
          <div className="bg-white rounded-4xl border border-gray-100 p-5 mb-6">
            <h3 className="font-bold mb-2">نبذة</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{selectedProvider.bio}</p>
          </div>
        )}

        {/* Services */}
        <div className="mb-6">
          <h3 className="font-bold mb-3">الخدمات المتاحة</h3>
          <div className="space-y-3">
            {providerServices.map(service => {
              const commission = Math.round(service.price * COMMISSION_RATE);
              return (
                <div key={service.id} className="bg-white rounded-3xl border border-gray-100 p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0">
                    <img src={`https://picsum.photos/seed/${service.id}/100/100`} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm">{service.name}</h4>
                    <p className="text-[10px] text-gray-400">{service.duration} دقيقة</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-orange-600 font-black text-sm">{service.price + commission} ﷼</p>
                      <p className="text-[10px] text-gray-400">({service.price} + {commission} عمولة)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedItem(service);
                      setSelectedProvider(null);
                      setShowModal('add_booking');
                    }}
                    className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold shrink-0"
                  >
                    احجزي
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews */}
        <div>
          <h3 className="font-bold mb-3">التقييمات ({providerReviews.length})</h3>

          {providerReviews.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-6 text-center">
              <p className="text-gray-400 text-sm">لا توجد تقييمات بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {providerReviews.map(review => (
                <div key={review.id} className="bg-white rounded-3xl border border-gray-100 p-4">
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={14} fill={s <= review.rating ? 'currentColor' : 'none'} className={s <= review.rating ? 'text-orange-400' : 'text-gray-200'} />
                    ))}
                    <span className="text-[10px] text-gray-400 mr-2">{review.createdAt}</span>
                  </div>
                  <p className="text-sm text-gray-600">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
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
            key={selectedProvider?.id || activeConversation?.id || activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {selectedProvider ? renderProviderProfile() : (
              <>
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'bookings' && renderBookings()}
                {activeTab === 'messages' && renderMessages()}
                {activeTab === 'settings' && renderSettings()}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      {!selectedProvider && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-4 py-3 pb-8 flex justify-around items-center z-50">
          {bottomNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setActiveConversation(null); }}
              className="relative flex flex-col items-center gap-1 group"
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 -translate-y-1'
                  : 'text-gray-400 group-hover:bg-gray-50'
              }`}>
                <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold ${activeTab === item.id ? 'text-blue-600 opacity-100' : 'text-gray-400 opacity-0'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      )}

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
              {showModal === 'add_booking'
                ? bookingStep === 'datetime' ? `اختاري الموعد`
                  : bookingStep === 'select' ? 'اختاري المزوّدة'
                  : `تأكيد الحجز: ${selectedItem?.name}`
                : showModal === 'process_payment' ? 'إتمام الدفع'
                : showModal === 'confirm_service' ? 'تأكيد استلام الخدمة'
                : 'اكتبي تقييمك'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── STEP 1: DateTime picker ─────────────────────────────── */}
              {showModal === 'add_booking' && bookingStep === 'datetime' && (
                <>
                  <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100 text-center">
                    <p className="text-sm font-bold">{selectedItem?.name}</p>
                    <p className="text-orange-600 font-black">{selectedItem?.price} ﷼</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 mb-1.5 block px-1">التاريخ</label>
                    <input
                      type="date" required value={bookingDate}
                      onChange={e => setBookingDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 mb-1.5 block px-1">الوقت</label>
                    <input
                      type="time" required value={bookingTime}
                      onChange={e => setBookingTime(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!bookingDate || !bookingTime || availabilityLoading}
                    onClick={checkAvailability}
                    className="w-full bg-black text-white py-5 rounded-3xl font-black mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {availabilityLoading ? 'جارٍ التحقق...' : 'تحقق من التوفر'}
                  </button>
                </>
              )}

              {/* ── STEP 2: Merchant selection ──────────────────────────── */}
              {showModal === 'add_booking' && bookingStep === 'select' && (() => {
                const res = availabilityResult;
                if (!res) return null;

                // Available merchants
                if (res.isAvailable && res.availableMerchants.length > 0) {
                  return (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500 font-bold">
                        المزوّدات المتاحة في {bookingDate} • {bookingTime}
                      </p>
                      {res.availableMerchants.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => { setSelectedMerchant(m); setBookingStep('confirm'); }}
                          className="w-full p-4 bg-white border-2 border-gray-100 rounded-3xl flex items-center gap-4 text-right hover:border-orange-400 transition-all active:scale-[0.98]"
                        >
                          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                            <Star size={18} className="text-orange-500" fill="currentColor" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-black text-sm">{m.businessName}</p>
                              {m.isVerified && <ShieldCheck size={13} className="text-blue-500 shrink-0" />}
                            </div>
                            {m.bio && <p className="text-xs text-gray-400 truncate">{m.bio}</p>}
                          </div>
                          <ChevronRight size={16} className="text-gray-300 shrink-0" />
                        </button>
                      ))}
                    </div>
                  );
                }

                // No availability + suggestion
                return (
                  <div className="space-y-4">
                    <div className="p-5 bg-red-50 rounded-3xl border border-red-100 text-center">
                      <AlertCircle size={32} className="mx-auto text-red-400 mb-2" />
                      <p className="font-black text-sm text-red-700">نعتذر، لا يوجد مقدمة خدمة متاحة في هذا الوقت</p>
                    </div>
                    {res.suggestedMerchant && res.suggestedTime && (
                      <div className="p-5 bg-blue-50 rounded-3xl border border-blue-100 space-y-3">
                        <p className="text-sm font-bold text-blue-800 text-right">
                          نقترح عليكِ الحجز مع{' '}
                          <span className="text-blue-600">{res.suggestedMerchant.businessName}</span>
                          {' '}في وقت{' '}
                          <span className="font-black">{formatSuggestedTime(res.suggestedTime)}</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(res.suggestedTime!);
                            setBookingDate(d.toISOString().split('T')[0]);
                            setBookingTime(d.toTimeString().slice(0, 5));
                            setSelectedMerchant(res.suggestedMerchant);
                            setBookingStep('confirm');
                          }}
                          className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black text-sm"
                        >
                          اختيار هذا الموعد
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setBookingStep('datetime')}
                      className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm"
                    >
                      تغيير الموعد
                    </button>
                  </div>
                );
              })()}

              {/* ── STEP 3: Confirm (neighborhood + price) ─────────────── */}
              {showModal === 'add_booking' && bookingStep === 'confirm' && (() => {
                const commission = Math.round((selectedItem?.price || 0) * COMMISSION_RATE);
                const total = (selectedItem?.price || 0) + commission;
                return (
                  <>
                    {/* Selected merchant + time summary */}
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                      <ShieldCheck size={20} className="text-blue-500 shrink-0" />
                      <div>
                        <p className="text-sm font-black">{selectedMerchant?.businessName ?? 'مزوّدة الخدمة'}</p>
                        <p className="text-xs text-blue-600">{bookingDate} • {bookingTime}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBookingStep('select')}
                        className="mr-auto text-xs text-gray-400 font-bold underline"
                      >
                        تغيير
                      </button>
                    </div>

                    {/* Price Breakdown */}
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">سعر الخدمة</span>
                        <span className="font-bold text-sm">{selectedItem?.price} ﷼</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">عمولة زينة (2%)</span>
                        <span className="text-xs text-gray-400">+ {commission} ﷼</span>
                      </div>
                      <div className="border-t border-orange-100 pt-2 flex items-center justify-between">
                        <span className="font-bold">الإجمالي</span>
                        <span className="font-black text-orange-600 text-lg">{total} ﷼</span>
                      </div>
                    </div>

                    {/* Neighborhood */}
                    <div>
                      <label className="text-xs font-bold text-gray-400 mb-1.5 block px-1">حيّك</label>
                      <div className="flex flex-wrap gap-2">
                        {RIYADH_NEIGHBORHOODS.map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setSelectedNeighborhood(n)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                              selectedNeighborhood === n
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-blue-200'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      {selectedNeighborhood && (
                        <div className="flex items-center gap-1 mt-2 text-blue-600">
                          <MapPin size={12} />
                          <span className="text-xs font-bold">{selectedNeighborhood}</span>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {showModal === 'process_payment' && (() => {
                const booking = selectedItem;
                return (
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-50 rounded-2xl border-2 border-black flex items-center gap-4">
                      <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shrink-0">
                        <PaymentIcon size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold">بطاقة مدى / فيزا</p>
                        <p className="text-[10px] text-gray-400">**** **** **** 1234</p>
                      </div>
                      <CheckCircle size={18} className="text-green-500" />
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">سعر الخدمة</span>
                        <span className="text-sm font-bold">{booking?.servicePrice} ﷼</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">عمولة زينة (2%)</span>
                        <span className="text-xs text-gray-400">+ {booking?.commission} ﷼</span>
                      </div>
                      <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                        <span className="text-sm font-bold">الإجمالي</span>
                        <span className="font-black text-orange-600">{booking?.totalPrice} ﷼</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {showModal === 'confirm_service' && (
                <div className="text-center space-y-4 py-2">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={32} className="text-green-500" />
                  </div>
                  <p className="font-bold text-gray-700">هل تأكدتِ من استلام الخدمة بشكل مُرضٍ؟</p>
                  <div className="p-4 bg-blue-50 rounded-2xl text-xs text-blue-700 font-bold text-right">
                    <AlertCircle size={14} className="inline ml-1" />
                    تأكيدك يُتيح للمبدعة استلام مبلغ الخدمة في محفظتها
                  </div>
                </div>
              )}

              {showModal === 'add_review' && (
                <div className="space-y-4">
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} type="button" onClick={() => setReviewRating(s)} className="transition-transform active:scale-90">
                        <Star
                          size={36}
                          fill={s <= reviewRating ? 'currentColor' : 'none'}
                          className={s <= reviewRating ? 'text-orange-400' : 'text-gray-200'}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="شاركي تجربتك مع هذه الخدمة..."
                    rows={3}
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>
              )}

              {/* Submit button — hidden during step 'datetime' and 'select' (those have their own buttons) */}
              {!(showModal === 'add_booking' && (bookingStep === 'datetime' || bookingStep === 'select')) && (
                <button
                  type="submit"
                  className="w-full bg-black text-white py-5 rounded-3xl font-black mt-2"
                >
                  {showModal === 'add_booking' ? 'تأكيد الحجز والدفع' :
                   showModal === 'process_payment' ? 'ادفع الآن' :
                   showModal === 'confirm_service' ? 'نعم، أكّدي الاستلام' :
                   'إرسال التقييم'}
                </button>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
