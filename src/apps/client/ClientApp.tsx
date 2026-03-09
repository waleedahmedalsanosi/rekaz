import React, { useState, useRef, useEffect } from 'react';
import {
  Home, Calendar, Settings, Search, Star,
  LogOut, ChevronRight, ArrowLeft, MessageSquare, CreditCard as PaymentIcon,
  CheckCircle, Send, MapPin, ShieldCheck, AlertCircle, Bell, SlidersHorizontal,
  User, Globe, HelpCircle, Heart, Paperclip, ChevronLeft, Clock, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RIYADH_NEIGHBORHOODS } from '../../lib/mockData';
import { BookingStatus, PaymentStatus } from '../../lib/types';
import { useToast } from '../../components/Toast';
import { api, dotnetApi, MoyasarSource, DotNetMerchantDto, DotNetMerchantAvailabilityDto, DotNetAvailabilityResponseDto, ApiProvider, ApiService, ApiBooking, ApiConversation, ApiMessage, ApiReview } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORIES = ['الكل', 'مكياج', 'شعر', 'عناية'];
const COMMISSION_RATE = 0.02;

export default function ClientApp() {
  const { toast } = useToast();
  const { user, logout, updateUser } = useAuth();
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
  const [disputeReason, setDisputeReason] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [bookingsTab, setBookingsTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [browseFilter, setBrowseFilter] = useState<string>('الكل');
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('ziena_read_notifs') || '[]')
  );
  const [accountSubView, setAccountSubView] = useState<
    'addresses' | 'add-address' | 'edit-address' |
    'payment'   | 'add-payment' | 'edit-payment' |
    'support'   | 'notifications' | 'language' | null
  >(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calDay, setCalDay] = useState<number | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  // Language + notifications + payment/address state
  const [language, setLanguage] = useState<'ar' | 'en'>(
    () => (localStorage.getItem('ziena_lang') as 'ar' | 'en') || 'ar'
  );
  const [favorites, setFavorites] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('ziena_favorites') || '[]')
  );
  const [notifSettings, setNotifSettings] = useState({
    bookingUpdates: true, messages: true, promotions: false, reminders: true,
  });
  const [savedCards, setSavedCards] = useState([
    { id: 'c1', brand: 'Visa',       last4: '4242', expiry: '12/26', isDefault: true  },
    { id: 'c2', brand: 'Mastercard', last4: '5678', expiry: '08/25', isDefault: false },
  ]);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({
    type: 'card' as 'card' | 'stc',
    cardNumber: '', cardName: '', expiry: '', cvv: '', stcPhone: '', isDefault: false,
  });
  const [savedAddresses, setSavedAddresses] = useState([
    { id: 'a1', label: 'المنزل', district: 'العليا',  street: 'شارع العروبة',    isDefault: true  },
    { id: 'a2', label: 'العمل',  district: 'الملقا',  street: 'طريق الملك فهد', isDefault: false },
  ]);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrForm, setAddrForm] = useState({ label: 'المنزل', district: '', street: '', isDefault: false });
  const [gpsLoading, setGpsLoading] = useState(false);

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

  // ── Moyasar payment form state ──────────────────────────────────────────
  const [payMethod, setPayMethod] = useState<'creditcard' | 'stcpay'>('creditcard');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardMonth, setCardMonth] = useState('');
  const [cardYear, setCardYear] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [stcMobile, setStcMobile] = useState('');
  const [payLoading, setPayLoading] = useState(false);

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
    // Handle Moyasar 3DS callback redirects: /?payment_success=bookingId or /?payment_failed=reason
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_success')) {
      toast('تمت عملية الدفع بنجاح! 💳');
      window.history.replaceState({}, '', '/');
    } else if (params.get('payment_failed')) {
      toast(decodeURIComponent(params.get('payment_failed') || 'فشل الدفع'), 'error');
      window.history.replaceState({}, '', '/');
    } else if (params.get('payment_error')) {
      toast('حدث خطأ في التحقق من الدفع، تواصل مع الدعم', 'error');
      window.history.replaceState({}, '', '/');
    }
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
    { id: 'explore', label: 'استكشاف', icon: Search },
    { id: 'bookings', label: 'حجوزاتي', icon: Calendar },
    { id: 'account', label: 'حسابي', icon: Settings },
  ];

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

  // Poll conversation list every 15 s to refresh unread badges
  useEffect(() => {
    const id = setInterval(() => {
      api.conversations.list().then(setConversations).catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, []);

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
    setCalDay(null);
    setSelectedTimeSlot(null);
    setDisputeReason('');
    setProfileName('');
    setProfilePhone('');
  };

  const toggleFavorite = (providerId: string) => {
    const newFavorites = favorites.includes(providerId)
      ? favorites.filter(id => id !== providerId)
      : [...favorites, providerId];
    setFavorites(newFavorites);
    localStorage.setItem('ziena_favorites', JSON.stringify(newFavorites));
    toast(newFavorites.includes(providerId) ? 'أضفت للمفضلة ❤️' : 'أزلت من المفضلة', 'info');
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
    // Immediately clear unread badge in local state (server marks as read via GET messages)
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
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
        if (!selectedItem) return;
        setPayLoading(true);
        try {
          const source: MoyasarSource = payMethod === 'stcpay'
            ? { type: 'stcpay', mobile: stcMobile }
            : { type: 'creditcard', name: cardName, number: cardNumber.replace(/\s/g, ''), month: cardMonth, year: cardYear, cvc: cardCvc };

          const result = await api.payments.create(selectedItem.id, source);

          if (result.redirect_url) {
            // 3DS required — redirect to Moyasar's authentication page
            window.location.href = result.redirect_url;
            return; // don't close modal yet
          }
          if (result.success) {
            setBookings(prev => prev.map(b => b.id === selectedItem.id ? { ...b, paymentStatus: 'PAID' } : b));
            toast('تمت عملية الدفع بنجاح 💳');
          }
        } finally {
          setPayLoading(false);
        }
      } else if (showModal === 'add_review') {
        const review = await api.reviews.create(selectedItem.id, reviewRating, reviewComment);
        setBookings(prev => prev.map(b => b.id === selectedItem.id ? { ...b, reviewId: review.id } : b));
        toast('تم إرسال تقييمك، شكراً لكِ! ⭐');
      } else if (showModal === 'confirm_service') {
        const b = await api.bookings.confirm(selectedItem.id);
        setBookings(prev => prev.map(x => x.id === b.id ? b : x));
        toast('تم تأكيد استلام الخدمة ✓');
      } else if (showModal === 'file_dispute') {
        if (!disputeReason.trim()) { toast('يرجى ذكر سبب النزاع', 'error'); return; }
        await api.bookings.dispute(selectedItem.id, disputeReason);
        setBookings(prev => prev.map(b => b.id === selectedItem.id ? { ...b, status: 'DISPUTED' } : b));
        toast('تم فتح النزاع، سيتواصل معكِ الدعم');
      } else if (showModal === 'update_profile') {
        if (!profileName.trim()) { toast('يرجى إدخال الاسم', 'error'); return; }
        const updated = await api.auth.updateMe({ name: profileName.trim(), phone: profilePhone.trim() || undefined });
        updateUser({ name: updated.name, phone: updated.phone });
        toast('تم حفظ البيانات ✓');
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

  // ─── GPS + language helpers ──────────────────────────────────────────────
  const handleGetGPS = async () => {
    if (!navigator.geolocation) { toast('المتصفح لا يدعم تحديد الموقع', 'error'); return; }
    setGpsLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`,
        { headers: { 'User-Agent': 'ZienaApp/1.0' } }
      );
      const data = await res.json();
      const a = data.address || {};
      setAddrForm(prev => ({
        ...prev,
        street:   a.road || a.pedestrian || a.street || '',
        district: a.suburb || a.neighbourhood || a.city_district || a.county || '',
      }));
      toast('تم تحديد موقعك بنجاح');
    } catch {
      toast('تعذّر الحصول على موقعك، تأكدي من تفعيل خدمة الموقع', 'error');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSaveLanguage = (lang: 'ar' | 'en') => {
    setLanguage(lang);
    localStorage.setItem('ziena_lang', lang);
    toast(lang === 'ar' ? 'تم تغيير اللغة إلى العربية' : 'Language changed to English');
  };

    // ─── Render: Dashboard (Home) ────────────────────────────────────────────
  const renderDashboard = () => {
    const upcomingBooking = bookings.find(b => b.status !== 'CANCELLED' && b.status !== 'COMPLETED');
    const cardGradients = [
      ['#C4A882', '#D4B896'],
      ['#A07850', '#B8906A'],
      ['#B89060', '#CBA878'],
      ['#D4B896', '#E2CBA8'],
    ];
    return (
      <div className="pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 pt-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNotifications(true)} className="w-10 h-10 rounded-full bg-white border border-[#EDE8E2] flex items-center justify-center">
              <Bell size={18} className="text-[#8B7355]" />
            </button>
            <div className="w-10 h-10 rounded-full bg-[#C9956A] flex items-center justify-center text-white font-black text-base">
              {user?.name?.[0] || 'م'}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#8B7355]">مرحباً بك</p>
            <h1 className="text-2xl font-black text-[#1C1410]">{user?.name || 'عميلة'} ✦</h1>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B7355]" size={17} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحثي عن خدمة أو متخصصة..."
            className="w-full bg-white border border-[#EDE8E2] rounded-2xl pr-11 pl-4 py-3.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#C9956A] shadow-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="mb-5">
          <p className="text-xs text-[#8B7355] font-semibold mb-2.5 text-right">الخدمات</p>
          <div className="flex gap-2 justify-end flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === 'الكل' ? null : cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                  (cat === 'الكل' && !categoryFilter) || categoryFilter === cat
                    ? 'bg-[#1C1410] text-white'
                    : 'bg-white text-[#8B7355] border border-[#EDE8E2]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* مميزات لك */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setActiveTab('explore')} className="text-xs text-[#C9956A] font-bold">عرض الكل</button>
            <h2 className="font-black text-lg text-[#1C1410]">مميزات لك</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(filteredProviders.length > 0 ? filteredProviders : providers).slice(0, 4).map((provider, idx) => {
              const [c1, c2] = cardGradients[idx % cardGradients.length];
              const providerServices2 = services.filter(s => s.providerId === provider.id);
              const minPrice = providerServices2.length > 0 ? Math.min(...providerServices2.map(s => s.price)) : null;
              const isAvailable = provider.isAvailable !== false;
              return (
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
                  className="relative rounded-3xl p-4 text-white active:scale-[0.97] transition-all overflow-hidden text-right"
                  style={{ background: `linear-gradient(160deg, ${c1}, ${c2})`, minHeight: 190 }}
                >
                  <span className={`absolute top-3 right-3 text-[10px] font-black px-2.5 py-1 rounded-full ${
                    isAvailable ? 'bg-white/25 text-white' : 'bg-[#1C1410]/60 text-white'
                  }`}>
                    {isAvailable ? 'متاحة' : 'مشغولة'}
                  </span>
                  <div className="flex justify-center mt-7 mb-2">
                    <div className="w-14 h-14 rounded-full bg-white/30 border border-white/40 flex items-center justify-center text-2xl font-black">
                      {(businessNameMap[provider.id] || provider.name)[0]}
                    </div>
                  </div>
                  <h4 className="font-black text-sm text-center">{businessNameMap[provider.id] || provider.name}</h4>
                  <p className="text-[11px] text-white/80 text-center mt-0.5">{provider.specialty}</p>
                  <div className="flex items-center justify-center gap-2 mt-1.5">
                    <span className="text-xs font-black">★ {provider.rating}</span>
                    {minPrice && <span className="text-[10px] text-white/70">{minPrice} ريال</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming Booking Card */}
        {upcomingBooking && (
          <div className="bg-[#1C1410] rounded-3xl p-5 text-white">
            <p className="text-[11px] text-white/50 mb-1">الحجز القادم</p>
            <h3 className="text-xl font-black mb-3">{upcomingBooking.serviceName}</h3>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#C9956A] flex items-center justify-center text-sm font-black shrink-0">
                {upcomingBooking.providerName[0]}
              </div>
              <span className="text-sm text-white/80 flex-1">{upcomingBooking.providerName}</span>
              <span className="text-xs bg-white/15 px-3 py-1 rounded-full text-white/70">
                {upcomingBooking.time && `م ${upcomingBooking.time.replace(':00', '')}`}
              </span>
            </div>
            {upcomingBooking.date && (
              <p className="text-[10px] text-white/40 mt-2">
                {new Date(upcomingBooking.date).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Render: Browse/Explore ─────────────────────────────────────────────
  const renderExplore = () => {
    const browseFilters = ['الكل', 'متاحة الآن', 'الأعلى تقييماً', 'مكياج'];
    const displayProviders = searchQuery.trim()
      ? filteredProviders
      : browseFilter === 'الكل'
        ? providers
        : browseFilter === 'متاحة الآن'
          ? providers.filter(p => p.isAvailable !== false)
          : browseFilter === 'الأعلى تقييماً'
            ? [...providers].sort((a, b) => b.rating - a.rating)
            : providers.filter(p => (p.specialty || '').includes(browseFilter));
    return (
      <div className="pb-28">
        {/* Header */}
        <div className="text-right mb-1 pt-2">
          <h1 className="text-3xl font-black text-[#1C1410]">استعراض</h1>
          <p className="text-sm text-[#8B7355] mt-0.5">{providers.length} متخصصة في الرياض</p>
        </div>

        {/* Search with filter */}
        <div className="relative mb-4 mt-4">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B7355]" size={17} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحثي عن اسم أو خدمة..."
            className="w-full bg-white border border-[#EDE8E2] rounded-2xl pr-11 pl-14 py-3.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#C9956A] shadow-sm"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#1C1410] rounded-xl flex items-center justify-center">
            <SlidersHorizontal size={16} className="text-white" />
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-5 flex-wrap justify-end">
          {browseFilters.map(f => (
            <button
              key={f}
              onClick={() => setBrowseFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                browseFilter === f
                  ? 'bg-[#C9956A] text-white'
                  : 'bg-white text-[#8B7355] border border-[#EDE8E2]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Provider list */}
        <div className="space-y-3">
          {displayProviders.map(provider => {
            const provSvcs = services.filter(s => s.providerId === provider.id);
            const minPrice = provSvcs.length > 0 ? Math.min(...provSvcs.map(s => s.price)) : null;
            const isAvailable = provider.isAvailable !== false;
            const specialties = provider.specialty || '';
            return (
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
                className="w-full bg-white rounded-3xl border border-[#EDE8E2] p-4 flex items-center gap-4 text-right active:scale-[0.99] transition-all shadow-sm"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C4A882] to-[#A07850] flex items-center justify-center text-white text-xl font-black shrink-0">
                  {(businessNameMap[provider.id] || provider.name)[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-base text-[#1C1410]">{businessNameMap[provider.id] || provider.name}</h4>
                  <p className="text-xs text-[#8B7355] truncate">{specialties}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-xs text-[#8B7355]">{isAvailable ? 'متاحة الآن' : 'مشغولة'}</span>
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-sm font-black text-[#1C1410]">{provider.rating}</span>
                    <Star size={13} fill="#C9956A" className="text-[#C9956A]" />
                  </div>
                  {minPrice && <p className="text-xs text-[#C9956A] font-bold mt-0.5">من {minPrice} ريال</p>}
                </div>
              </button>
            );
          })}
          {displayProviders.length === 0 && (
            <div className="py-16 text-center">
              <Search size={40} className="mx-auto text-[#EDE8E2] mb-3" />
              <p className="text-[#8B7355] font-bold">لا توجد نتائج</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Render: Bookings ────────────────────────────────────────────────────
  const renderBookings = () => {
    const tabBookings = bookings.filter(b => {
      if (bookingsTab === 'upcoming') return b.status !== 'CANCELLED' && b.status !== 'COMPLETED';
      if (bookingsTab === 'completed') return b.status === 'COMPLETED';
      return b.status === 'CANCELLED';
    });
    const statusLabel: Record<string, { text: string; cls: string }> = {
      CONFIRMED: { text: 'مقبول', cls: 'bg-[#E8F5E9] text-green-700' },
      PENDING:   { text: 'في الانتظار', cls: 'bg-[#FFF8F0] text-[#C9956A]' },
      COMPLETED: { text: 'مكتمل', cls: 'bg-[#F0F4FF] text-blue-700' },
      CANCELLED: { text: 'ملغي', cls: 'bg-gray-100 text-gray-500' },
      DISPUTED:  { text: 'نزاع', cls: 'bg-red-50 text-red-600' },
    };
    return (
      <div className="pb-28">
        {/* Title */}
        <div className="text-right mb-5 pt-2">
          <h1 className="text-3xl font-black text-[#1C1410]">حجوزاتي</h1>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-[#EDE8E2] p-1 flex mb-5">
          {(['upcoming', 'completed', 'cancelled'] as const).map((tab, i) => (
            <button
              key={tab}
              onClick={() => setBookingsTab(tab)}
              className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
                bookingsTab === tab ? 'bg-[#1C1410] text-white' : 'text-[#8B7355]'
              }`}
            >
              {['القادمة', 'المكتملة', 'الملغاة'][i]}
            </button>
          ))}
        </div>

        {/* Booking cards */}
        {tabBookings.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar size={40} className="mx-auto text-[#EDE8E2] mb-3" />
            <p className="text-[#8B7355] font-bold">لا توجد حجوزات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tabBookings.map((booking) => {
              const hasReview = !!booking.reviewId;
              const bothConfirmed = booking.clientConfirmed && booking.providerConfirmed;
              const sl = statusLabel[booking.status] || { text: booking.status, cls: 'bg-gray-100 text-gray-500' };
              const formattedDate = booking.date
                ? new Date(booking.date).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                : booking.date;
              return (
                <div key={booking.id} className="bg-white rounded-3xl border border-[#EDE8E2] overflow-hidden shadow-sm">
                  {/* Date header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDE8E2]">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${sl.cls}`}>{sl.text}</span>
                    <span className="text-xs text-[#8B7355] font-semibold">{formattedDate}</span>
                  </div>

                  {/* Booking body */}
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#C4A882] to-[#A07850] flex items-center justify-center text-white font-black shrink-0">
                        {booking.providerName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-base text-[#1C1410]">{booking.serviceName}</h4>
                        <p className="text-xs text-[#8B7355]">{booking.providerName} · {booking.time} · {booking.duration || '—'} دقيقة</p>
                      </div>
                      <p className="font-black text-[#1C1410] shrink-0">{booking.totalPrice} ريال</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      {booking.status === BookingStatus.CONFIRMED && !booking.clientConfirmed && (
                        <button
                          onClick={() => { setSelectedItem(booking); setShowModal('confirm_service'); }}
                          className="flex-1 py-2.5 bg-[#1C1410] text-white rounded-2xl text-xs font-bold"
                        >مراسلة المتخصصة</button>
                      )}
                      {(booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PENDING) && (
                        <button
                          onClick={() => { setSelectedItem(booking); setShowModal('file_dispute'); }}
                          className="flex-1 py-2.5 bg-[#FAF7F4] text-[#8B7355] rounded-2xl text-xs font-bold border border-[#EDE8E2]"
                        >إلغاء</button>
                      )}
                      {booking.paymentStatus === PaymentStatus.UNPAID && booking.status !== BookingStatus.CANCELLED && (
                        <button
                          onClick={() => { setSelectedItem(booking); setShowModal('process_payment'); }}
                          className="flex-1 py-2.5 bg-[#C9956A] text-white rounded-2xl text-xs font-bold"
                        >ادفع الآن</button>
                      )}
                      {booking.status === BookingStatus.COMPLETED && !hasReview && (
                        <>
                          <button
                            onClick={() => { setSelectedItem(booking); setShowModal('confirm_service'); }}
                            className="flex-1 py-2.5 bg-[#1C1410] text-white rounded-2xl text-xs font-bold"
                          >مراسلة المتخصصة</button>
                          <button
                            onClick={() => { setSelectedItem(booking); setShowModal('add_review'); }}
                            className="flex-1 py-2.5 bg-[#FAF7F4] text-[#8B7355] rounded-2xl text-xs font-bold border border-[#EDE8E2]"
                          >قيّمي الخدمة ★</button>
                        </>
                      )}
                      {booking.status === BookingStatus.CONFIRMED && booking.clientConfirmed && !bothConfirmed && (
                        <div className="flex items-center gap-1 text-xs text-[#C9956A] font-bold">
                          <CheckCircle size={14} />
                          <span>بانتظار تأكيد المبدعة</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─── Render: Messages (Paper 21) ─────────────────────────────────────────
  const renderMessages = () => {
    if (activeConversation) {
      const convMessages = messages.filter(m => m.conversationId === activeConversation.id);
      // Find related upcoming booking with this provider
      const relatedBooking = bookings.find(
        b => b.providerId === activeConversation.providerId && b.status !== 'CANCELLED'
      );
      return (
        <div className="flex flex-col -mx-5 -mt-6" style={{ height: 'calc(100vh - 80px)' }}>
          {/* Chat Header */}
          <div className="bg-white px-4 pt-10 pb-4 flex items-center justify-between border-b border-[#EDE8E2] shrink-0">
            <button className="p-2 rounded-full bg-[#FAF7F4]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
            <div className="flex items-center gap-3 flex-1 justify-end">
              <div className="text-right">
                <h3 className="font-black text-sm text-[#1C1410]">{activeConversation.providerName}</h3>
                <div className="flex items-center gap-1 justify-end">
                  <span className="text-[10px] text-green-500 font-bold">متاحة الآن</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C4A882] to-[#A07850] flex items-center justify-center text-white font-black text-sm">
                {activeConversation.providerName[0]}
              </div>
            </div>
            <button onClick={() => setActiveConversation(null)} className="p-2 rounded-full bg-[#FAF7F4] mr-2">
              <ChevronLeft size={18} className="text-[#1C1410]" />
            </button>
          </div>

          {/* Booking context bar */}
          {relatedBooking && (
            <div className="bg-[#FAF7F4] border-b border-[#EDE8E2] px-4 py-2.5 flex items-center justify-between shrink-0">
              <span className="text-xs text-[#C9956A] font-bold">عرض التفاصيل</span>
              <div className="text-right">
                <span className="text-xs font-black text-[#1C1410]">{relatedBooking.serviceName}</span>
                <span className="text-[10px] text-[#8B7355] mr-2">{relatedBooking.date}</span>
              </div>
              <div className="w-1 h-8 bg-[#C9956A] rounded-full" />
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#FAF7F4]">
            {convMessages.length === 0 && (
              <div className="text-center pt-10">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#C9956A]/10 flex items-center justify-center mb-3">
                  <MessageSquare size={24} className="text-[#C9956A]" />
                </div>
                <p className="text-sm text-[#8B7355] font-bold">ابدأي المحادثة مع {activeConversation.providerName}</p>
              </div>
            )}
            {convMessages.map(msg => {
              const isClient = msg.senderRole === 'CLIENT';
              return (
                <div key={msg.id} className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[72%] px-4 py-2.5 text-sm leading-relaxed ${
                    isClient
                      ? 'bg-[#1C1410] text-white rounded-3xl rounded-tr-md'
                      : 'bg-white text-[#1C1410] border border-[#EDE8E2] rounded-3xl rounded-tl-md shadow-sm'
                  }`}>
                    {msg.content}
                    <div className={`text-[9px] mt-1 ${isClient ? 'text-white/40' : 'text-[#8B7355]/60'} text-left`}>
                      {new Date(msg.createdAt || Date.now()).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="bg-white border-t border-[#EDE8E2] px-4 py-3 flex items-center gap-2 shrink-0">
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim()}
              className="w-10 h-10 bg-[#C9956A] rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
            >
              <Send size={16} className="text-white" />
            </button>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="اكتبي رسالتك..."
              className="flex-1 bg-[#FAF7F4] rounded-2xl px-4 py-2.5 text-sm text-right font-medium focus:outline-none border border-[#EDE8E2]"
            />
            <button className="w-10 h-10 bg-[#FAF7F4] border border-[#EDE8E2] rounded-2xl flex items-center justify-center shrink-0">
              <Paperclip size={16} className="text-[#8B7355]" />
            </button>
          </div>
        </div>
      );
    }

    // Conversation list
    return (
      <div className="pb-28">
        <div className="text-right mb-5 pt-2">
          <h1 className="text-3xl font-black text-[#1C1410]">رسائلي</h1>
          <p className="text-sm text-[#8B7355] mt-0.5">{conversations.length} محادثة</p>
        </div>

        {conversations.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#EDE8E2] flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-[#8B7355]" />
            </div>
            <p className="text-[#8B7355] font-bold mb-1">لا توجد محادثات بعد</p>
            <p className="text-xs text-[#8B7355]/60">راسلي أي متخصصة من ملفها الشخصي</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(conv => {
              const lastTime = conv.lastMessageAt
                ? new Date(conv.lastMessageAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                : '';
              return (
                <button
                  key={conv.id}
                  onClick={() => handleOpenConversation(conv)}
                  className="w-full bg-white rounded-3xl border border-[#EDE8E2] p-4 flex items-center gap-3 text-right active:scale-[0.99] transition-all shadow-sm"
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C4A882] to-[#A07850] flex items-center justify-center text-white font-black text-base">
                      {conv.providerName[0]}
                    </div>
                    <span className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-sm text-[#1C1410]">{conv.providerName}</h4>
                    <p className="text-xs text-[#8B7355] truncate mt-0.5">{conv.lastMessage || 'ابدأي المحادثة...'}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span className="text-[10px] text-[#8B7355]">{lastTime}</span>
                    {(conv.unreadCount ?? 0) > 0 && (
                      <div className="w-5 h-5 bg-[#C9956A] rounded-full text-white text-[10px] font-black flex items-center justify-center">
                        {conv.unreadCount}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─── Render: Notifications (Paper 22) ────────────────────────────────────
  const renderNotifications = () => {
    const mockNotifications = [
      { id: 'n1', group: 'اليوم', icon: 'calendar', title: 'تأكيد الحجز', desc: 'تم قبول حجزك مع رنا مكياج يوم الخميس الساعة 4 مساءً', time: 'منذ ساعتين' },
      { id: 'n2', group: 'اليوم', icon: 'star', title: 'تذكير بموعدك', desc: 'حجزك مع ليلى للشعر غداً الساعة 3 مساءً', time: 'منذ 4 ساعات' },
      { id: 'n3', group: 'أمس', icon: 'check', title: 'اكتمل حجزك', desc: 'تم إكمال خدمة مكياج سهرة بنجاح. قيّمي تجربتك!', time: 'أمس 7:00 م' },
      { id: 'n4', group: 'أمس', icon: 'message', title: 'رسالة جديدة', desc: 'أرسلت رنا رسالة: "تفضلي، موعدك مؤكد إن شاء الله"', time: 'أمس 5:30 م' },
      { id: 'n5', group: 'هذا الأسبوع', icon: 'offer', title: 'عرض خاص لكِ', desc: 'خصم 20% على خدمات الشعر هذا الأسبوع فقط!', time: 'الثلاثاء 2:00 م' },
    ];
    const notificationsWithRead = mockNotifications.map(n => ({ ...n, read: readNotifIds.includes(n.id) }));
    const groups = [...new Set(notificationsWithRead.map(n => n.group))];
    const iconEl = (icon: string) => {
      const base = "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0";
      if (icon === 'calendar') return <div className={`${base} bg-[#C9956A]/15`}><Calendar size={18} className="text-[#C9956A]" /></div>;
      if (icon === 'star') return <div className={`${base} bg-yellow-50`}><Star size={18} className="text-yellow-500" fill="currentColor" /></div>;
      if (icon === 'check') return <div className={`${base} bg-green-50`}><CheckCircle size={18} className="text-green-500" /></div>;
      if (icon === 'message') return <div className={`${base} bg-blue-50`}><MessageSquare size={18} className="text-blue-500" /></div>;
      return <div className={`${base} bg-[#FAF7F4]`}><Bell size={18} className="text-[#8B7355]" /></div>;
    };
    const markAllRead = () => {
      const allIds = mockNotifications.map(n => n.id);
      setReadNotifIds(allIds);
      localStorage.setItem('ziena_read_notifs', JSON.stringify(allIds));
      toast('تم تحديد الكل مقروء ✓', 'success');
    };
    return (
      <div className="fixed inset-0 z-50 bg-[#FAF7F4]" dir="rtl">
        {/* Header */}
        <div className="bg-white border-b border-[#EDE8E2] px-5 pt-12 pb-4 flex items-center justify-between">
          <button onClick={markAllRead} className="text-xs text-[#C9956A] font-bold">تحديد الكل مقروء</button>
          <h1 className="text-xl font-black text-[#1C1410]">الإشعارات</h1>
          <button onClick={() => setShowNotifications(false)} className="p-2 rounded-full bg-[#FAF7F4]">
            <X size={18} className="text-[#1C1410]" />
          </button>
        </div>

        <div className="overflow-y-auto h-full px-5 pb-24 pt-4">
          {groups.map(group => (
            <div key={group} className="mb-5">
              <p className="text-xs font-black text-[#8B7355] mb-2 text-right">{group}</p>
              <div className="space-y-2">
                {notificationsWithRead.filter(n => n.group === group).map(n => (
                  <div key={n.id} className={`bg-white rounded-3xl border p-4 flex items-start gap-3 ${n.read ? 'border-[#EDE8E2]' : 'border-[#C9956A]/30'}`}>
                    {iconEl(n.icon)}
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[#8B7355]">{n.time}</span>
                        <h4 className={`text-sm font-black ${n.read ? 'text-[#1C1410]' : 'text-[#C9956A]'}`}>{n.title}</h4>
                      </div>
                      <p className="text-xs text-[#8B7355] mt-0.5 leading-relaxed">{n.desc}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-[#C9956A] mt-1 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Render: Account (Paper 24) ──────────────────────────────────────────
  const renderSettings = () => {
    const completedCount = bookings.filter(b => b.status === 'COMPLETED').length;

    // ── Notification Settings ────────────────────────────────────────────
    if (accountSubView === 'notifications') {
      const rows: { key: keyof typeof notifSettings; label: string; desc: string }[] = [
        { key: 'bookingUpdates', label: 'تحديثات الحجوزات',  desc: 'قبول الحجز، التأكيد، والإلغاء' },
        { key: 'messages',       label: 'الرسائل',           desc: 'رسائل جديدة من المبدعات' },
        { key: 'promotions',     label: 'العروض والتخفيضات', desc: 'عروض خاصة وكوبونات خصم' },
        { key: 'reminders',      label: 'التذكيرات',         desc: 'تذكير بالمواعيد القادمة' },
      ];
      const allOn = Object.values(notifSettings).every(Boolean);
      return (
        <div className="pb-28">
          <div className="flex items-center justify-between mb-6 pt-2">
            <button onClick={() => setAccountSubView(null)} className="p-2 bg-white rounded-xl border border-[#EDE8E2]">
              <ChevronLeft size={18} className="text-[#1C1410]" />
            </button>
            <h1 className="text-xl font-black text-[#1C1410]">إعدادات الإشعارات</h1>
            <div className="w-9" />
          </div>
          <div className="bg-[#1C1410] rounded-3xl p-4 mb-5 flex items-center justify-between">
            <button
              onClick={() => setNotifSettings({ bookingUpdates: !allOn, messages: !allOn, promotions: !allOn, reminders: !allOn })}
              className={`w-12 h-7 rounded-full flex items-center px-1 transition-all ${allOn ? 'bg-[#C9956A] justify-end' : 'bg-white/20 justify-start'}`}
            >
              <div className="w-5 h-5 bg-white rounded-full shadow" />
            </button>
            <div className="text-right">
              <p className="font-black text-white text-sm">تفعيل الإشعارات</p>
              <p className="text-xs text-white/50">{allOn ? 'جميع الإشعارات مفعّلة' : 'بعض الإشعارات متوقفة'}</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-[#EDE8E2] overflow-hidden">
            {rows.map((row, i) => (
              <div key={row.key} className={`px-4 py-4 flex items-center gap-3 ${i < rows.length - 1 ? 'border-b border-[#EDE8E2]' : ''}`}>
                <button
                  onClick={() => setNotifSettings(prev => ({ ...prev, [row.key]: !prev[row.key] }))}
                  className={`w-12 h-7 rounded-full flex items-center px-1 transition-all shrink-0 ${notifSettings[row.key] ? 'bg-[#C9956A] justify-end' : 'bg-[#EDE8E2] justify-start'}`}
                >
                  <div className="w-5 h-5 bg-white rounded-full shadow" />
                </button>
                <div className="flex-1 text-right">
                  <p className="text-sm font-bold text-[#1C1410]">{row.label}</p>
                  <p className="text-xs text-[#8B7355]">{row.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Language Settings ────────────────────────────────────────────────
    if (accountSubView === 'language') {
      const options = [
        { code: 'ar' as const, name: 'العربية', native: 'Arabic',       dir: 'RTL', flag: '🇸🇦' },
        { code: 'en' as const, name: 'English', native: 'الإنجليزية', dir: 'LTR', flag: '🇬🇧' },
      ];
      return (
        <div className="pb-28">
          <div className="flex items-center justify-between mb-6 pt-2">
            <button onClick={() => setAccountSubView(null)} className="p-2 bg-white rounded-xl border border-[#EDE8E2]">
              <ChevronLeft size={18} className="text-[#1C1410]" />
            </button>
            <h1 className="text-xl font-black text-[#1C1410]">اللغة</h1>
            <div className="w-9" />
          </div>
          <div className="bg-white rounded-3xl border border-[#EDE8E2] overflow-hidden mb-4">
            {options.map((opt, i) => (
              <button
                key={opt.code}
                onClick={() => handleSaveLanguage(opt.code)}
                className={`w-full px-4 py-4 flex items-center gap-3 active:bg-[#FAF7F4] ${i === 0 ? 'border-b border-[#EDE8E2]' : ''}`}
              >
                {language === opt.code
                  ? <CheckCircle size={18} className="text-[#C9956A] shrink-0" fill="currentColor" />
                  : <div className="w-[18px] h-[18px] rounded-full border-2 border-[#EDE8E2] shrink-0" />}
                <div className="flex-1 text-right">
                  <p className="text-sm font-black text-[#1C1410]">{opt.name}</p>
                  <p className="text-xs text-[#8B7355]">{opt.native} · {opt.dir}</p>
                </div>
                <span className="text-2xl">{opt.flag}</span>
              </button>
            ))}
          </div>
          {language === 'en' && (
            <div className="bg-[#C9956A]/10 border border-[#C9956A]/30 rounded-2xl p-4 text-right">
              <p className="text-sm font-bold text-[#C9956A]">English mode is active. Full translation coming soon — some labels may still appear in Arabic.</p>
            </div>
          )}
        </div>
      );
    }

    // ── Saved Addresses list ─────────────────────────────────────────────
    if (accountSubView === 'addresses') {
      return (
        <div className="pb-28">
          <div className="flex items-center justify-between mb-6 pt-2">
            <button onClick={() => setAccountSubView(null)} className="p-2 bg-white rounded-xl border border-[#EDE8E2]">
              <ChevronLeft size={18} className="text-[#1C1410]" />
            </button>
            <h1 className="text-xl font-black text-[#1C1410]">عناويني المحفوظة</h1>
            <div className="w-9" />
          </div>
          <div className="space-y-3 mb-5">
            {savedAddresses.map(addr => (
              <div key={addr.id} className="bg-white rounded-3xl border border-[#EDE8E2] p-4 flex items-center gap-3 shadow-sm">
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => { setEditingAddressId(addr.id); setAddrForm({ label: addr.label, district: addr.district, street: addr.street, isDefault: addr.isDefault }); setAccountSubView('edit-address'); }}
                    className="w-9 h-9 rounded-xl bg-[#FAF7F4] border border-[#EDE8E2] flex items-center justify-center"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button
                    onClick={() => { setSavedAddresses(prev => prev.filter(a => a.id !== addr.id)); toast('تم حذف العنوان'); }}
                    className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center"
                  >
                    <X size={14} className="text-red-400" />
                  </button>
                </div>
                <div className="flex-1 text-right min-w-0">
                  <div className="flex items-center justify-end gap-2 mb-0.5">
                    {addr.isDefault && <span className="text-[10px] bg-[#C9956A]/15 text-[#C9956A] px-2 py-0.5 rounded-full font-bold">افتراضي</span>}
                    <h4 className="font-black text-sm text-[#1C1410]">{addr.label}</h4>
                  </div>
                  <p className="text-xs text-[#8B7355] truncate">{addr.district} — {addr.street}</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#C9956A]/10 flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-[#C9956A]" />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setAddrForm({ label: 'المنزل', district: '', street: '', isDefault: false }); setEditingAddressId(null); setAccountSubView('add-address'); }}
            className="w-full py-4 border-2 border-dashed border-[#EDE8E2] rounded-3xl text-sm font-bold text-[#8B7355] flex items-center justify-center gap-2"
          >
            <span className="text-lg leading-none">+</span> إضافة عنوان جديد
          </button>
        </div>
      );
    }

    // ── Add / Edit Address ───────────────────────────────────────────────
    if (accountSubView === 'add-address' || accountSubView === 'edit-address') {
      const isEdit = accountSubView === 'edit-address';
      const labelOptions = ['المنزل', 'العمل', 'عنوان آخر'];
      return (
        <div className="pb-28">
          <div className="flex items-center justify-between mb-6 pt-2">
            <button onClick={() => setAccountSubView('addresses')} className="p-2 bg-white rounded-xl border border-[#EDE8E2]">
              <ChevronLeft size={18} className="text-[#1C1410]" />
            </button>
            <h1 className="text-xl font-black text-[#1C1410]">{isEdit ? 'تعديل العنوان' : 'إضافة عنوان'}</h1>
            <div className="w-9" />
          </div>

          <button
            onClick={handleGetGPS}
            disabled={gpsLoading}
            className="w-full mb-5 py-4 bg-[#1C1410] rounded-3xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {gpsLoading
              ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <MapPin size={18} className="text-white" />}
            <span className="font-black text-white text-sm">{gpsLoading ? 'جارٍ تحديد موقعك...' : 'استخدام موقعي الحالي GPS'}</span>
          </button>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-[#8B7355] mb-2 text-right">تسمية العنوان</p>
              <div className="flex gap-2 justify-end">
                {labelOptions.map(lbl => (
                  <button
                    key={lbl}
                    onClick={() => setAddrForm(p => ({ ...p, label: lbl }))}
                    className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all border ${addrForm.label === lbl ? 'bg-[#1C1410] text-white border-[#1C1410]' : 'bg-white text-[#8B7355] border-[#EDE8E2]'}`}
                  >{lbl}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#8B7355] mb-2 text-right">الحي</p>
              <input
                value={addrForm.district}
                onChange={e => setAddrForm(p => ({ ...p, district: e.target.value }))}
                placeholder="مثال: العليا"
                className="w-full bg-white border border-[#EDE8E2] rounded-2xl px-4 py-3.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#C9956A]"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-[#8B7355] mb-2 text-right">الشارع / التفاصيل</p>
              <input
                value={addrForm.street}
                onChange={e => setAddrForm(p => ({ ...p, street: e.target.value }))}
                placeholder="مثال: شارع العروبة، بناية 12"
                className="w-full bg-white border border-[#EDE8E2] rounded-2xl px-4 py-3.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#C9956A]"
              />
            </div>
            <div className="bg-white border border-[#EDE8E2] rounded-2xl px-4 py-4 flex items-center justify-between">
              <button
                onClick={() => setAddrForm(p => ({ ...p, isDefault: !p.isDefault }))}
                className={`w-12 h-7 rounded-full flex items-center px-1 transition-all shrink-0 ${addrForm.isDefault ? 'bg-[#C9956A] justify-end' : 'bg-[#EDE8E2] justify-start'}`}
              >
                <div className="w-5 h-5 bg-white rounded-full shadow" />
              </button>
              <span className="text-sm font-bold text-[#1C1410]">تعيين كعنوان افتراضي</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (!addrForm.district.trim() || !addrForm.street.trim()) { toast('يرجى إدخال الحي والشارع', 'error'); return; }
              if (isEdit && editingAddressId) {
                setSavedAddresses(prev => prev.map(a =>
                  a.id === editingAddressId ? { ...a, ...addrForm }
                  : addrForm.isDefault ? { ...a, isDefault: false } : a
                ));
                toast('تم تحديث العنوان ✓');
              } else {
                setSavedAddresses(prev => addrForm.isDefault
                  ? [{ id: `a${Date.now()}`, ...addrForm }, ...prev.map(a => ({ ...a, isDefault: false }))]
                  : [...prev, { id: `a${Date.now()}`, ...addrForm }]
                );
                toast('تمت إضافة العنوان ✓');
              }
              setAccountSubView('addresses');
            }}
            className="w-full mt-6 py-4 bg-[#1C1410] text-white rounded-3xl font-black text-sm"
          >
            {isEdit ? 'حفظ التعديلات' : 'إضافة العنوان'}
          </button>

          {isEdit && (
            <button
              onClick={() => { setSavedAddresses(prev => prev.filter(a => a.id !== editingAddressId)); toast('تم حذف العنوان'); setAccountSubView('addresses'); }}
              className="w-full mt-3 py-4 bg-red-50 text-red-500 rounded-3xl font-bold text-sm border border-red-100"
            >
              حذف العنوان
            </button>
          )}
        </div>
      );
    }

    // ── Payment Methods list ─────────────────────────────────────────────
    if (accountSubView === 'payment') {
      const brandIcon = (brand: string) => (
        <div className={`w-12 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black ${brand === 'Visa' ? 'bg-[#1A1F71]' : brand === 'Mastercard' ? 'bg-[#252525]' : 'bg-[#6200EA]'}`}>
          {brand === 'Mastercard' ? 'MC' : brand === 'STC Pay' ? 'STC' : brand}
        </div>
      );
      return (
        <div className="pb-28">
          <div className="flex items-center justify-between mb-6 pt-2">
            <button onClick={() => setAccountSubView(null)} className="p-2 bg-white rounded-xl border border-[#EDE8E2]">
              <ChevronLeft size={18} className="text-[#1C1410]" />
            </button>
            <h1 className="text-xl font-black text-[#1C1410]">طرق الدفع</h1>
            <div className="w-9" />
          </div>
          <div className="space-y-3 mb-5">
            {savedCards.map(card => (
              <div key={card.id} className={`bg-white rounded-3xl border p-4 flex items-center gap-3 shadow-sm ${card.isDefault ? 'border-[#C9956A]/50' : 'border-[#EDE8E2]'}`}>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => { setEditingCardId(card.id); setPayForm({ type: 'card', cardNumber: `•••• •••• •••• ${card.last4}`, cardName: '', expiry: card.expiry, cvv: '', stcPhone: '', isDefault: card.isDefault }); setAccountSubView('edit-payment'); }}
                    className="w-9 h-9 rounded-xl bg-[#FAF7F4] border border-[#EDE8E2] flex items-center justify-center"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button
                    onClick={() => { setSavedCards(prev => prev.filter(c => c.id !== card.id)); toast('تم حذف البطاقة'); }}
                    className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center"
                  >
                    <X size={14} className="text-red-400" />
                  </button>
                </div>
                <div className="flex-1 text-right min-w-0">
                  <div className="flex items-center justify-end gap-2 mb-0.5">
                    {card.isDefault && <span className="text-[10px] bg-[#C9956A]/15 text-[#C9956A] px-2 py-0.5 rounded-full font-bold">افتراضية</span>}
                    <h4 className="font-black text-sm text-[#1C1410]">{card.brand} •••• {card.last4}</h4>
                  </div>
                  <p className="text-xs text-[#8B7355]">تنتهي {card.expiry}</p>
                </div>
                {brandIcon(card.brand)}
              </div>
            ))}
          </div>
          <button
            onClick={() => { setEditingCardId(null); setPayForm({ type: 'card', cardNumber: '', cardName: '', expiry: '', cvv: '', stcPhone: '', isDefault: false }); setAccountSubView('add-payment'); }}
            className="w-full py-4 border-2 border-dashed border-[#EDE8E2] rounded-3xl text-sm font-bold text-[#8B7355] flex items-center justify-center gap-2"
          >
            <span className="text-lg leading-none">+</span> إضافة بطاقة جديدة
          </button>
        </div>
      );
    }

    // ── Add / Edit Payment ────────────────────────────────────────────────
    if (accountSubView === 'add-payment' || accountSubView === 'edit-payment') {
      const isEdit = accountSubView === 'edit-payment';
      return (
        <div className="pb-28">
          <div className="flex items-center justify-between mb-6 pt-2">
            <button onClick={() => setAccountSubView('payment')} className="p-2 bg-white rounded-xl border border-[#EDE8E2]">
              <ChevronLeft size={18} className="text-[#1C1410]" />
            </button>
            <h1 className="text-xl font-black text-[#1C1410]">{isEdit ? 'تعديل البطاقة' : 'إضافة بطاقة جديدة'}</h1>
            <div className="w-9" />
          </div>

          <div className="flex gap-3 mb-5">
            {(['card', 'stc'] as const).map(t => (
              <button
                key={t}
                onClick={() => setPayForm(p => ({ ...p, type: t }))}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-2 ${payForm.type === t ? 'border-[#1C1410] bg-[#1C1410] text-white' : 'border-[#EDE8E2] bg-white text-[#8B7355]'}`}
              >
                {t === 'card' ? <><PaymentIcon size={15} /> بطاقة ائتمان</> : <><span className="text-xs font-black">STC</span> STC Pay</>}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {payForm.type === 'card' ? (
              <>
                <div>
                  <p className="text-xs font-bold text-[#8B7355] mb-2 text-right">رقم البطاقة</p>
                  <input
                    value={payForm.cardNumber}
                    onChange={e => setPayForm(p => ({ ...p, cardNumber: e.target.value.replace(/D/g,'').replace(/(.{4})/g,'$1 ').trim().slice(0,19) }))}
                    placeholder="•••• •••• •••• ••••"
                    className="w-full bg-white border border-[#EDE8E2] rounded-2xl px-4 py-3.5 text-sm text-left ltr tracking-widest focus:outline-none focus:ring-2 focus:ring-[#C9956A]"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#8B7355] mb-2 text-right">اسم حامل البطاقة</p>
                  <input
                    value={payForm.cardName}
                    onChange={e => setPayForm(p => ({ ...p, cardName: e.target.value }))}
                    placeholder="الاسم كما هو على البطاقة"
                    className="w-full bg-white border border-[#EDE8E2] rounded-2xl px-4 py-3.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#C9956A]"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#8B7355] mb-2 text-right">تاريخ الانتهاء</p>
                    <input
                      value={payForm.expiry}
                      onChange={e => setPayForm(p => ({ ...p, expiry: e.target.value.replace(/D/g,'').replace(/^(d{2})(d)/,'$1/$2').slice(0,5) }))}
                      placeholder="MM/YY"
                      className="w-full bg-white border border-[#EDE8E2] rounded-2xl px-4 py-3.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#C9956A]"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#8B7355] mb-2 text-right">رمز CVV</p>
                    <input
                      value={payForm.cvv}
                      onChange={e => setPayForm(p => ({ ...p, cvv: e.target.value.replace(/D/g,'').slice(0,4) }))}
                      placeholder="•••"
                      className="w-full bg-white border border-[#EDE8E2] rounded-2xl px-4 py-3.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#C9956A]"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs font-bold text-[#8B7355] mb-2 text-right">رقم جوال STC Pay</p>
                <input
                  value={payForm.stcPhone}
                  onChange={e => setPayForm(p => ({ ...p, stcPhone: e.target.value }))}
                  placeholder="05XXXXXXXX"
                  className="w-full bg-white border border-[#EDE8E2] rounded-2xl px-4 py-3.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#C9956A]"
                />
                <p className="text-xs text-[#8B7355] text-right mt-2">ستستلمين رمز OTP للتأكيد عند الدفع</p>
              </div>
            )}

            <div className="bg-white border border-[#EDE8E2] rounded-2xl px-4 py-4 flex items-center justify-between">
              <button
                onClick={() => setPayForm(p => ({ ...p, isDefault: !p.isDefault }))}
                className={`w-12 h-7 rounded-full flex items-center px-1 transition-all shrink-0 ${payForm.isDefault ? 'bg-[#C9956A] justify-end' : 'bg-[#EDE8E2] justify-start'}`}
              >
                <div className="w-5 h-5 bg-white rounded-full shadow" />
              </button>
              <span className="text-sm font-bold text-[#1C1410]">تعيين كبطاقة افتراضية</span>
            </div>

            <p className="text-xs text-[#8B7355] text-center flex items-center justify-center gap-1">
              <ShieldCheck size={12} className="text-[#8B7355]" />
              بياناتك محمية بتشفير SSL عبر موياسر للمدفوعات
            </p>
          </div>

          <button
            onClick={() => {
              if (payForm.type === 'card' && payForm.cardNumber.replace(/s/g,'').replace(/•/g,'').length < 4) { toast('يرجى إدخال رقم البطاقة', 'error'); return; }
              if (payForm.type === 'stc' && !payForm.stcPhone.trim()) { toast('يرجى إدخال رقم الجوال', 'error'); return; }
              const rawNum = payForm.cardNumber.replace(/s/g,'');
              const last4 = rawNum.slice(-4);
              const brand = payForm.type === 'stc' ? 'STC Pay' : (rawNum.replace(/•/g,'')[0] === '4' ? 'Visa' : 'Mastercard');
              if (isEdit && editingCardId) {
                setSavedCards(prev => prev.map(c =>
                  c.id === editingCardId ? { ...c, brand, last4, expiry: payForm.expiry, isDefault: payForm.isDefault }
                  : payForm.isDefault ? { ...c, isDefault: false } : c
                ));
                toast('تم تحديث البطاقة ✓');
              } else {
                setSavedCards(prev => payForm.isDefault
                  ? [{ id: `c${Date.now()}`, brand, last4, expiry: payForm.expiry, isDefault: true }, ...prev.map(c => ({ ...c, isDefault: false }))]
                  : [...prev, { id: `c${Date.now()}`, brand, last4, expiry: payForm.expiry, isDefault: false }]
                );
                toast('تمت إضافة البطاقة ✓');
              }
              setAccountSubView('payment');
            }}
            className="w-full mt-6 py-4 bg-[#1C1410] text-white rounded-3xl font-black text-sm"
          >
            {isEdit ? 'حفظ التعديلات' : 'حفظ البطاقة'}
          </button>

          {isEdit && (
            <button
              onClick={() => { setSavedCards(prev => prev.filter(c => c.id !== editingCardId)); toast('تم حذف البطاقة'); setAccountSubView('payment'); }}
              className="w-full mt-3 py-4 bg-red-50 text-red-500 rounded-3xl font-bold text-sm border border-red-100"
            >
              حذف البطاقة
            </button>
          )}
        </div>
      );
    }

    // ── Support Center ───────────────────────────────────────────────────
    if (accountSubView === 'support') {
      const faqs = [
        { q: 'كيف يمكنني إلغاء حجزي؟',    a: 'يمكنك إلغاء الحجز من صفحة حجوزاتي قبل 24 ساعة من الموعد دون أي رسوم.' },
        { q: 'متى تصل المبدعة إلى منزلي؟', a: 'تصل المبدعة في الوقت المحدد. ستتلقين إشعاراً قبل 30 دقيقة.' },
        { q: 'كيف تعمل سياسة الاسترداد؟',  a: 'في حال إلغاء الحجز قبل 24 ساعة يُسترد كامل المبلغ خلال 3-5 أيام عمل.' },
        { q: 'هل يمكنني تقييم الخدمة؟',     a: 'نعم، بعد اكتمال الخدمة يمكنك تقييم المبدعة من صفحة حجوزاتي.' },
      ];
      return (
        <div className="pb-28">
          <div className="flex items-center justify-between mb-6 pt-2">
            <button onClick={() => setAccountSubView(null)} className="p-2 bg-white rounded-xl border border-[#EDE8E2]">
              <ChevronLeft size={18} className="text-[#1C1410]" />
            </button>
            <h1 className="text-xl font-black text-[#1C1410]">مركز المساعدة</h1>
            <div className="w-9" />
          </div>
          <div className="bg-[#1C1410] rounded-3xl p-5 mb-5 text-white">
            <h3 className="font-black text-base mb-1">تواصلي معنا</h3>
            <p className="text-sm text-white/60 mb-4">فريق الدعم متاح 7 أيام في الأسبوع</p>
            <div className="space-y-2">
              <button onClick={() => window.open('mailto:support@ziena.sa')} className="w-full py-3 bg-white/10 rounded-2xl text-sm font-bold">البريد: support@ziena.sa</button>
              <button onClick={() => window.open('https://wa.me/966920000000')} className="w-full py-3 bg-[#C9956A] rounded-2xl text-sm font-bold">واتساب الدعم</button>
            </div>
          </div>
          <p className="text-xs font-black text-[#8B7355] mb-3 text-right">الأسئلة الشائعة</p>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-3xl border border-[#EDE8E2] p-4">
                <h4 className="font-black text-sm text-[#1C1410] text-right mb-2">{faq.q}</h4>
                <p className="text-xs text-[#8B7355] text-right leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Main account view ────────────────────────────────────────────────
    return (
      <div className="pb-28">
        <div className="-mx-5 bg-[#1C1410] text-white px-5 pt-6 pb-8 mb-0">
          <div className="flex items-start justify-between">
            <button
              onClick={() => { setProfileName(user?.name || ''); setProfilePhone(user?.phone || ''); setShowModal('update_profile'); }}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
            >
              <Settings size={16} className="text-white/70" />
            </button>
            <div className="text-right flex-1 ml-4">
              <div className="relative inline-block mb-2">
                <div className="w-16 h-16 rounded-full bg-[#C9956A] flex items-center justify-center text-2xl font-black">
                  {user?.name?.[0] || 'م'}
                </div>
              </div>
              <h2 className="text-2xl font-black">{user?.name || 'عميلة'}</h2>
              <p className="text-sm text-white/60 mt-0.5">{user?.phone}</p>
              <div className="flex items-center justify-end gap-2 mt-2">
                <span className="text-xs bg-[#C9956A]/30 text-[#C9956A] border border-[#C9956A]/40 px-3 py-1 rounded-full font-bold">عميلة</span>
                <span className="text-xs text-white/50">{completedCount} حجوزات مكتملة</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 mb-3">
          <p className="text-xs text-[#8B7355] font-semibold px-1 mb-2 text-right">الحساب</p>
          <div className="bg-white rounded-3xl border border-[#EDE8E2] overflow-hidden">
            {[
              { label: 'معلوماتي الشخصية', icon: User,        action: () => { setProfileName(user?.name || ''); setProfilePhone(user?.phone || ''); setShowModal('update_profile'); } },
              { label: 'عناويني المحفوظة', icon: MapPin,      action: () => setAccountSubView('addresses') },
              { label: 'طرق الدفع',        icon: PaymentIcon, action: () => setAccountSubView('payment') },
            ].map((item, i, arr) => (
              <button key={i} onClick={item.action} className={`w-full px-4 py-4 flex items-center gap-3 active:bg-gray-50 ${i < arr.length - 1 ? 'border-b border-[#EDE8E2]' : ''}`}>
                <ChevronRight size={16} className="text-[#EDE8E2]" />
                <span className="text-sm font-bold flex-1 text-right text-[#1C1410]">{item.label}</span>
                <div className="w-9 h-9 rounded-xl bg-[#FAF7F4] flex items-center justify-center">
                  <item.icon size={17} className="text-[#8B7355]" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-[#8B7355] font-semibold px-1 mb-2 text-right">التفضيلات</p>
          <div className="bg-white rounded-3xl border border-[#EDE8E2] overflow-hidden">
            <div className="px-4 py-4 flex items-center gap-3 border-b border-[#EDE8E2]">
              <button
                onClick={() => setNotifSettings(p => ({ ...p, bookingUpdates: !p.bookingUpdates }))}
                className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-all shrink-0 ${notifSettings.bookingUpdates ? 'bg-[#C9956A] justify-end' : 'bg-[#EDE8E2] justify-start'}`}
              >
                <div className="w-5 h-5 bg-white rounded-full shadow" />
              </button>
              <button onClick={() => setAccountSubView('notifications')} className="text-sm font-bold flex-1 text-right text-[#1C1410]">الإشعارات</button>
              <div className="w-9 h-9 rounded-xl bg-[#FAF7F4] flex items-center justify-center">
                <Bell size={17} className="text-[#8B7355]" />
              </div>
            </div>
            <button onClick={() => setAccountSubView('language')} className="w-full px-4 py-4 flex items-center gap-3 active:bg-gray-50">
              <ChevronRight size={16} className="text-[#EDE8E2]" />
              <span className="text-sm font-bold flex-1 text-right text-[#1C1410]">اللغة</span>
              <span className="text-xs text-[#8B7355] bg-[#FAF7F4] border border-[#EDE8E2] px-2.5 py-1 rounded-full font-bold">{language === 'ar' ? 'العربية' : 'English'}</span>
              <div className="w-9 h-9 rounded-xl bg-[#FAF7F4] flex items-center justify-center">
                <Globe size={17} className="text-[#8B7355]" />
              </div>
            </button>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-[#8B7355] font-semibold px-1 mb-2 text-right">الدعم</p>
          <div className="bg-white rounded-3xl border border-[#EDE8E2] overflow-hidden">
            <button onClick={() => setAccountSubView('support')} className="w-full px-4 py-4 flex items-center gap-3 border-b border-[#EDE8E2] active:bg-gray-50">
              <ChevronRight size={16} className="text-[#EDE8E2]" />
              <span className="text-sm font-bold flex-1 text-right text-[#1C1410]">مركز المساعدة</span>
              <div className="w-9 h-9 rounded-xl bg-[#FAF7F4] flex items-center justify-center">
                <HelpCircle size={17} className="text-[#8B7355]" />
              </div>
            </button>
            <button onClick={logout} className="w-full px-4 py-4 flex items-center gap-3 active:bg-red-50">
              <ChevronRight size={16} className="text-red-200" />
              <span className="text-sm font-bold flex-1 text-right text-red-500">تسجيل الخروج</span>
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <LogOut size={17} className="text-red-400" />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  };
  // ─── Render: Provider Profile (Paper 13) ─────────────────────────────────
  const renderProviderProfile = () => {
    if (!selectedProvider) return null;
    const avgRating = providerReviews.length
      ? (providerReviews.reduce((s, r) => s + r.rating, 0) / providerReviews.length).toFixed(1)
      : selectedProvider.rating.toFixed(1);
    const displayName = businessNameMap[selectedProvider.id] || selectedProvider.name;

    return (
      <div className="pb-36 -mt-6">
        {/* Gradient header (Paper 13) */}
        <div className="relative -mx-5 mb-0" style={{ background: 'linear-gradient(160deg, #D4B896, #C4A882)' }}>
          {/* Top action bar */}
          <div className="flex items-center justify-between px-5 pt-12 pb-0">
            <button
              onClick={() => toggleFavorite(selectedProvider!.id)}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            >
              <Heart size={18} className={favorites.includes(selectedProvider!.id) ? 'text-red-500 fill-red-500' : 'text-white'} />
            </button>
            <button
              onClick={() => setSelectedProvider(null)}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            >
              <ChevronLeft size={20} className="text-white" />
            </button>
          </div>

          {/* Avatar overlapping */}
          <div className="flex justify-center pt-4 pb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl bg-gradient-to-br from-[#C4A882] to-[#8B7355] flex items-center justify-center text-white text-3xl font-black">
                {displayName[0]}
              </div>
              {selectedProvider.isVerified && (
                <div className="absolute -bottom-1 -left-1 w-7 h-7 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                  <ShieldCheck size={12} className="text-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Name + specialty */}
        <div className="text-center px-5 pt-4 pb-4 bg-white border-b border-[#EDE8E2]">
          <h2 className="text-2xl font-black text-[#1C1410]">{displayName}</h2>
          <p className="text-sm text-[#8B7355] mt-0.5">{selectedProvider.specialty}</p>
          {/* Info row */}
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1">
              <Star size={13} fill="#C9956A" className="text-[#C9956A]" />
              <span className="text-sm font-black text-[#1C1410]">{avgRating}</span>
              <span className="text-xs text-[#8B7355]">({providerReviews.length})</span>
            </div>
            {selectedProvider.city && (
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-[#8B7355]" />
                <span className="text-xs text-[#8B7355]">{selectedProvider.city}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock size={12} className="text-[#8B7355]" />
              <span className="text-xs text-[#8B7355]">{providerServices.length} خدمات</span>
            </div>
          </div>
        </div>

        {/* Services list */}
        <div className="px-5 pt-5">
          {selectedProvider.bio && (
            <p className="text-sm text-[#8B7355] leading-relaxed text-right mb-5">{selectedProvider.bio}</p>
          )}

          <h3 className="font-black text-base text-[#1C1410] mb-3 text-right">الخدمات</h3>
          <div className="space-y-3 mb-5">
            {providerServices.map(service => {
              const commission = Math.round(service.price * COMMISSION_RATE);
              return (
                <div key={service.id} className="bg-white rounded-3xl border border-[#EDE8E2] p-4 flex items-center gap-3 shadow-sm">
                  <button
                    onClick={() => { setSelectedItem(service); setSelectedProvider(null); setShowModal('add_booking'); }}
                    className="px-4 py-2 bg-[#1C1410] text-white rounded-2xl text-xs font-black shrink-0"
                  >
                    احجزي
                  </button>
                  <div className="flex-1 min-w-0 text-right">
                    <h4 className="font-black text-sm text-[#1C1410]">{service.name}</h4>
                    <p className="text-[10px] text-[#8B7355]">{service.duration} دقيقة</p>
                    <p className="text-[#C9956A] font-black text-sm mt-0.5">{service.price + commission} ﷼</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4B896] to-[#C4A882] flex items-center justify-center shrink-0">
                    <Star size={18} className="text-white" fill="currentColor" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Neighborhoods */}
          {selectedProvider.coveredNeighborhoods && selectedProvider.coveredNeighborhoods.length > 0 && (
            <div className="mb-5">
              <h3 className="font-black text-sm text-[#1C1410] mb-2 text-right">الأحياء المغطاة</h3>
              <div className="flex flex-wrap gap-2 justify-end">
                {selectedProvider.coveredNeighborhoods.map(n => (
                  <span key={n} className="px-3 py-1 bg-[#FAF7F4] text-[#8B7355] text-xs font-bold rounded-xl border border-[#EDE8E2]">{n}</span>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {providerReviews.length > 0 && (
            <div>
              <h3 className="font-black text-sm text-[#1C1410] mb-3 text-right">التقييمات ({providerReviews.length})</h3>
              <div className="space-y-2">
                {providerReviews.slice(0, 3).map(review => (
                  <div key={review.id} className="bg-white rounded-2xl border border-[#EDE8E2] p-3">
                    <div className="flex items-center gap-1 mb-1.5 justify-end">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={11} fill={s <= review.rating ? 'currentColor' : 'none'} className={s <= review.rating ? 'text-[#C9956A]' : 'text-[#EDE8E2]'} />
                      ))}
                    </div>
                    <p className="text-xs text-[#8B7355] text-right">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EDE8E2] px-5 py-4 flex gap-3 z-40">
          <button
            onClick={() => handleStartChat(selectedProvider)}
            className="flex-1 py-3.5 bg-[#FAF7F4] border border-[#EDE8E2] text-[#1C1410] rounded-2xl text-sm font-black flex items-center justify-center gap-2"
          >
            <MessageSquare size={16} />
            راسليها
          </button>
          <button
            onClick={() => { setSelectedItem(providerServices[0] || null); setSelectedProvider(null); setShowModal('add_booking'); }}
            className="flex-[2] py-3.5 bg-[#1C1410] text-white rounded-2xl text-sm font-black"
          >
            احجزي الآن
          </button>
        </div>
      </div>
    );
  };

  // ─── Return ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAF7F4] text-[#1C1410] font-sans" dir={language === "en" ? "ltr" : "rtl"}>
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
                {activeTab === 'explore' && renderExplore()}
                {activeTab === 'bookings' && renderBookings()}
                {activeTab === 'messages' && renderMessages()}
                {(activeTab === 'account' || activeTab === 'settings') && renderSettings()}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      {!selectedProvider && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EDE8E2] px-6 pt-3 pb-8 flex justify-around items-center z-50">
          {bottomNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setActiveConversation(null); setAccountSubView(null); }}
              className="flex flex-col items-center gap-1"
            >
              <item.icon
                size={22}
                strokeWidth={activeTab === item.id ? 2.5 : 1.8}
                className={activeTab === item.id ? 'text-[#C9956A]' : 'text-[#8B7355]'}
              />
              <span className={`text-[10px] font-bold ${activeTab === item.id ? 'text-[#C9956A]' : 'text-[#8B7355]'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      )}

      {/* Notifications overlay (Paper 22) */}
      {showNotifications && renderNotifications()}

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
                : showModal === 'file_dispute' ? 'فتح نزاع'
                : showModal === 'update_profile' ? 'تعديل الملف الشخصي'
                : 'اكتبي تقييمك'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── STEP 1: Calendar picker (Paper 14) ──────────────────── */}
              {showModal === 'add_booking' && bookingStep === 'datetime' && (() => {
                const arabicMonths = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
                const arabicDays = ['أح','إث','ثل','أر','خم','جم','سب'];
                const today = new Date(); today.setHours(0,0,0,0);
                const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
                const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                const timeSlots = ['9:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00'];
                const goPrevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); };
                const goNextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); };
                return (
                  <>
                    {/* Service info */}
                    <div className="p-3 bg-[#FAF7F4] rounded-2xl border border-[#EDE8E2] flex items-center justify-between">
                      <p className="text-[#C9956A] font-black">{selectedItem?.price} ﷼</p>
                      <p className="text-sm font-bold text-[#1C1410]">{selectedItem?.name}</p>
                    </div>

                    {/* Month navigation */}
                    <div className="flex items-center justify-between px-1">
                      <button type="button" onClick={goNextMonth} className="p-2 rounded-xl bg-[#FAF7F4] border border-[#EDE8E2]">
                        <ChevronRight size={16} />
                      </button>
                      <h3 className="font-black text-base text-[#1C1410]">{arabicMonths[calMonth]} {calYear}</h3>
                      <button type="button" onClick={goPrevMonth} className="p-2 rounded-xl bg-[#FAF7F4] border border-[#EDE8E2]">
                        <ChevronLeft size={16} />
                      </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {arabicDays.map(d => (
                        <div key={d} className="text-[10px] font-black text-[#8B7355] py-1">{d}</div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e-${i}`} />)}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const date = new Date(calYear, calMonth, day);
                        const isPast = date < today;
                        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                        const isSelected = calDay === day;
                        return (
                          <button
                            key={day}
                            type="button"
                            disabled={isPast}
                            onClick={() => { setCalDay(day); setBookingDate(dateStr); setSelectedTimeSlot(null); setBookingTime(''); }}
                            className={`aspect-square flex items-center justify-center text-sm font-bold rounded-xl transition-all ${
                              isSelected ? 'bg-[#1C1410] text-white' :
                              isPast ? 'text-[#EDE8E2] cursor-not-allowed' :
                              'text-[#1C1410] hover:bg-[#EDE8E2]'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>

                    {/* Time slots */}
                    {calDay && (
                      <div>
                        <p className="text-xs font-black text-[#8B7355] mb-2 text-right">اختاري الوقت</p>
                        <div className="flex flex-wrap gap-2 justify-end">
                          {timeSlots.map(slot => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => { setSelectedTimeSlot(slot); setBookingTime(slot); }}
                              className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all border ${
                                selectedTimeSlot === slot
                                  ? 'bg-[#C9956A] text-white border-[#C9956A]'
                                  : 'bg-white text-[#1C1410] border-[#EDE8E2]'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={!bookingDate || !bookingTime || availabilityLoading}
                      onClick={checkAvailability}
                      className="w-full bg-[#1C1410] text-white py-4 rounded-3xl font-black disabled:opacity-40"
                    >
                      {availabilityLoading ? 'جارٍ التحقق...' : bookingDate && bookingTime ? `تحقق من التوفر — ${bookingDate} ${bookingTime}` : 'اختاري الموعد أولاً'}
                    </button>
                  </>
                );
              })()}

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
                          className="w-full p-4 bg-white border-2 border-[#EDE8E2] rounded-3xl flex items-center gap-4 text-right hover:border-[#C9956A] transition-all active:scale-[0.98]"
                        >
                          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                            <Star size={18} className="text-[#C9956A]" fill="currentColor" />
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
                    <div className="p-4 bg-[#FAF7F4] rounded-2xl border border-[#EDE8E2] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">سعر الخدمة</span>
                        <span className="font-bold text-sm">{selectedItem?.price} ﷼</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">عمولة زينة (2%)</span>
                        <span className="text-xs text-gray-400">+ {commission} ﷼</span>
                      </div>
                      <div className="border-t border-[#EDE8E2] pt-2 flex items-center justify-between">
                        <span className="font-bold">الإجمالي</span>
                        <span className="font-black text-[#C9956A] text-lg">{total} ﷼</span>
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
                  <div className="space-y-4">
                    {/* Order summary */}
                    <div className="p-3 bg-gray-50 rounded-2xl space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">سعر الخدمة</span><span className="font-bold">{booking?.servicePrice} ﷼</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-400">عمولة زينة (2%)</span><span className="text-gray-400">+ {booking?.commission} ﷼</span></div>
                      <div className="border-t pt-1.5 flex justify-between"><span className="font-bold">الإجمالي</span><span className="font-black text-[#C9956A]">{booking?.totalPrice} ﷼</span></div>
                    </div>

                    {/* Payment method toggle */}
                    <div className="flex gap-2">
                      {(['creditcard', 'stcpay'] as const).map(m => (
                        <button key={m} type="button"
                          onClick={() => setPayMethod(m)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${payMethod === m ? 'border-[#1C1410] bg-[#1C1410] text-white' : 'border-gray-200 text-gray-500'}`}>
                          {m === 'creditcard' ? '💳 بطاقة ائتمان' : '📱 STC Pay'}
                        </button>
                      ))}
                    </div>

                    {payMethod === 'creditcard' ? (
                      <div className="space-y-3">
                        <input required placeholder="اسم حامل البطاقة" value={cardName} onChange={e => setCardName(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-black" />
                        <input required placeholder="رقم البطاقة" maxLength={19} value={cardNumber}
                          onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm ltr focus:outline-none focus:border-black" />
                        <div className="flex gap-2">
                          <input required placeholder="MM" maxLength={2} value={cardMonth} onChange={e => setCardMonth(e.target.value.replace(/\D/g, ''))}
                            className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:border-black" />
                          <input required placeholder="YY" maxLength={2} value={cardYear} onChange={e => setCardYear(e.target.value.replace(/\D/g, ''))}
                            className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:border-black" />
                          <input required placeholder="CVV" maxLength={4} value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, ''))}
                            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:border-black" />
                        </div>
                        <p className="text-[10px] text-gray-400 text-center">بيانات البطاقة محمية بتشفير SSL عبر موياسر</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <input required placeholder="رقم جوال STC Pay (05XXXXXXXX)" value={stcMobile} onChange={e => setStcMobile(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-black" />
                        <p className="text-[10px] text-gray-400 text-center">ستستلم رمز OTP على جوالك للتأكيد</p>
                      </div>
                    )}
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
                          className={s <= reviewRating ? 'text-[#C9956A]' : 'text-gray-200'}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="شاركي تجربتك مع هذه الخدمة..."
                    rows={3}
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#C9956A] resize-none"
                  />
                </div>
              )}

              {showModal === 'file_dispute' && (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 rounded-2xl text-xs text-red-700 font-bold text-right">
                    <AlertCircle size={14} className="inline ml-1" />
                    سيتم مراجعة النزاع من قِبل فريق الدعم وسيتواصلون معكِ قريباً
                  </div>
                  <textarea
                    value={disputeReason}
                    onChange={e => setDisputeReason(e.target.value)}
                    placeholder="اشرحي سبب النزاع بالتفصيل..."
                    rows={4}
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                </div>
              )}

              {showModal === 'update_profile' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">الاسم</label>
                    <input
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      placeholder="اسمك الكامل"
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">رقم الجوال</label>
                    <input
                      value={profilePhone}
                      onChange={e => setProfilePhone(e.target.value)}
                      placeholder="05XXXXXXXX"
                      type="tel"
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
              )}

              {/* Submit button — hidden during step 'datetime' and 'select' (those have their own buttons) */}
              {!(showModal === 'add_booking' && (bookingStep === 'datetime' || bookingStep === 'select')) && (
                <button
                  type="submit"
                  disabled={showModal === 'process_payment' && payLoading}
                  className="w-full bg-[#1C1410] text-white py-5 rounded-3xl font-black mt-2 disabled:opacity-50"
                >
                  {showModal === 'add_booking' ? 'تأكيد الحجز والدفع' :
                   showModal === 'process_payment' ? (payLoading ? 'جارٍ المعالجة...' : `ادفع ${selectedItem?.totalPrice} ﷼`) :
                   showModal === 'confirm_service' ? 'نعم، أكّدي الاستلام' :
                   showModal === 'file_dispute' ? 'إرسال النزاع' :
                   showModal === 'update_profile' ? 'حفظ التغييرات' :
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
