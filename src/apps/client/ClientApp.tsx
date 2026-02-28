import React, { useState, useRef, useEffect } from 'react';
import {
  Home, Calendar, Settings, Search, Star,
  LogOut, ChevronRight, ArrowLeft, MessageSquare, CreditCard as PaymentIcon,
  CheckCircle, Send, MapPin, ShieldCheck, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MOCK_SERVICES, MOCK_BOOKINGS, MOCK_PROVIDERS, MOCK_REVIEWS,
  MOCK_CONVERSATIONS, MOCK_MESSAGES, RIYADH_NEIGHBORHOODS,
} from '../../shared/mockData';
import { BookingStatus, PaymentStatus, Provider, Conversation, Message } from '../../shared/types';
import { useToast } from '../../shared/Toast';

const CATEGORIES = ['الكل', 'مكياج', 'شعر'];
const COMMISSION_RATE = 0.02;

export default function ClientApp() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showModal, setShowModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');

  const [bookings, setBookings] = useState(MOCK_BOOKINGS.filter(b => b.customerId === '1'));
  const [services] = useState(MOCK_SERVICES);
  const [reviews, setReviews] = useState(MOCK_REVIEWS);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredServices = categoryFilter
    ? services.filter(s => s.category === categoryFilter)
    : services;

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
  };

  const handleStartChat = (provider: Provider) => {
    const existing = conversations.find(c => c.providerId === provider.id);
    if (existing) {
      setActiveConversation(existing);
    } else {
      const newConv: Conversation = {
        id: Math.random().toString(36).slice(2),
        clientId: '1',
        clientName: 'نورة العتيبي',
        providerId: provider.id,
        providerName: provider.name,
        providerAvatar: provider.avatar,
        lastMessage: '',
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
      };
      setConversations([newConv, ...conversations]);
      setActiveConversation(newConv);
    }
    setSelectedProvider(null);
    setActiveTab('messages');
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || !activeConversation) return;
    const newMsg: Message = {
      id: Math.random().toString(36).slice(2),
      conversationId: activeConversation.id,
      senderId: '1',
      senderRole: 'CLIENT',
      content: chatInput.trim(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages([...messages, newMsg]);
    setConversations(conversations.map(c =>
      c.id === activeConversation.id
        ? { ...c, lastMessage: chatInput.trim(), lastMessageAt: new Date().toISOString() }
        : c
    ));
    setChatInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    if (showModal === 'add_booking') {
      const neighborhood = selectedNeighborhood || (data.neighborhood as string);
      if (!neighborhood) { toast('يرجى اختيار الحي', 'error'); return; }
      const servicePrice = selectedItem.price;
      const commission = Math.round(servicePrice * COMMISSION_RATE);
      const newBooking = {
        id: Math.random().toString(36).slice(2),
        customerId: '1',
        serviceId: selectedItem.id,
        providerId: 'p1',
        date: data.date as string,
        time: data.time as string,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
        servicePrice,
        commission,
        totalPrice: servicePrice + commission,
        neighborhood,
        clientConfirmed: false,
        providerConfirmed: false,
      };
      setBookings([newBooking, ...bookings]);
      toast('تم إرسال طلب الحجز! سيتم تأكيده قريباً ✓');
    } else if (showModal === 'process_payment') {
      setBookings(bookings.map(b =>
        b.id === selectedItem.id ? { ...b, paymentStatus: PaymentStatus.PAID } : b
      ));
      toast('تمت عملية الدفع بنجاح 💳');
    } else if (showModal === 'add_review') {
      const newReview = {
        id: Math.random().toString(36).slice(2),
        bookingId: selectedItem.id,
        customerId: '1',
        providerId: selectedItem.providerId,
        rating: reviewRating,
        comment: reviewComment,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setReviews([...reviews, newReview]);
      setBookings(bookings.map(b =>
        b.id === selectedItem.id ? { ...b, reviewId: newReview.id } : b
      ));
      toast('تم إرسال تقييمك، شكراً لكِ! ⭐');
    } else if (showModal === 'confirm_service') {
      setBookings(bookings.map(b =>
        b.id === selectedItem.id
          ? { ...b, clientConfirmed: true, status: b.providerConfirmed ? BookingStatus.COMPLETED : b.status }
          : b
      ));
      toast('تم تأكيد استلام الخدمة ✓');
    }

    handleClose();
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
          placeholder="ابحثي عن خبيرة أو خدمة..."
          className="w-full bg-white border border-gray-100 rounded-3xl px-12 py-4 text-sm shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all"
        />
      </div>

      {/* Providers */}
      <div className="space-y-3">
        <h3 className="font-bold">أفضل خبيرات التجميل</h3>
        <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4">
          {MOCK_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => setSelectedProvider(provider)}
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
              <h4 className="font-bold text-sm">{provider.name}</h4>
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
            const service = services.find(s => s.id === booking.serviceId);
            const provider = MOCK_PROVIDERS.find(p => p.id === booking.providerId);
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
                    <h4 className="font-bold">{service?.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">مع {provider?.name}</p>
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
                onClick={() => setActiveConversation(conv)}
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
            <h3 className="font-black text-lg">نورة العتيبي</h3>
            <p className="text-xs text-white/80">عميلة مميزة</p>
          </div>
          <button className="p-2 bg-white/20 rounded-xl"><LogOut size={18} /></button>
        </div>
        <div className="p-4 space-y-1">
          {[
            { label: 'إعدادات الحساب', icon: Settings },
            { label: 'الدعم الفني', icon: MessageSquare },
          ].map((item, i) => (
            <button key={i} className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 rounded-2xl transition-colors">
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
            { label: 'تقييماتي', value: String(reviews.filter(r => r.customerId === '1').length) },
            { label: 'أنفقت', value: `${bookings.filter(b => b.paymentStatus === PaymentStatus.PAID).reduce((s, b) => s + b.totalPrice, 0)} ﷼` },
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
    const providerReviews = reviews.filter(r => r.providerId === selectedProvider.id);
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
            onClick={() => { setSelectedItem(services[0]); setSelectedProvider(null); setShowModal('add_booking'); }}
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
            { label: 'الخدمات', value: String(services.length) },
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
            {services.map(service => {
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
              {showModal === 'add_booking' ? `حجز: ${selectedItem?.name}` :
               showModal === 'process_payment' ? 'إتمام الدفع' :
               showModal === 'confirm_service' ? 'تأكيد استلام الخدمة' :
               'اكتبي تقييمك'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {showModal === 'add_booking' && (() => {
                const commission = Math.round((selectedItem?.price || 0) * COMMISSION_RATE);
                const total = (selectedItem?.price || 0) + commission;
                return (
                  <>
                    {/* Price Breakdown */}
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">سعر الخدمة</span>
                        <span className="font-bold text-sm">{selectedItem?.price} ﷼</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">عمولة ركاز (2%)</span>
                        <span className="text-xs text-gray-400">+ {commission} ﷼</span>
                      </div>
                      <div className="border-t border-orange-100 pt-2 flex items-center justify-between">
                        <span className="font-bold">الإجمالي</span>
                        <span className="font-black text-orange-600 text-lg">{total} ﷼</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-400 mb-1.5 block px-1">التاريخ</label>
                      <input name="date" type="date" required min={new Date().toISOString().split('T')[0]}
                        className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 mb-1.5 block px-1">الوقت</label>
                      <input name="time" type="time" required
                        className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
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
                        <span className="text-xs text-gray-400">عمولة ركاز (2%)</span>
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

              <button
                type="submit"
                className="w-full bg-black text-white py-5 rounded-3xl font-black mt-2"
              >
                {showModal === 'add_booking' ? 'تأكيد الحجز والدفع' :
                 showModal === 'process_payment' ? 'ادفع الآن' :
                 showModal === 'confirm_service' ? 'نعم، أكّدي الاستلام' :
                 'إرسال التقييم'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
